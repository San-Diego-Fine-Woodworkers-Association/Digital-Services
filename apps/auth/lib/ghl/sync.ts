import { eq } from "drizzle-orm";

import { db, ghlSyncRunsTable, proclassUsersTable } from "../db";
import { sendSyncErrorEmail } from "../email/resend";
import {
  fetchAllContacts,
  fetchAllMemberships,
  fetchAllPrograms,
  fetchAllRegistrations,
} from "../proclass/client";
import { getPrimaryAccountId, programTitle } from "../proclass/transform";
import {
  addTags,
  findContactByEmail,
  getOrCreateMemberSinceFieldId,
  removeTags,
  upsertContactByEmail,
} from "./client";
import { isJunkContact, isJunkProgram } from "./filters";
import {
  buildGhlTagPlan,
  findMembershipTierFullTag,
  findMembershipTierTag,
  isClass,
  isShopSlot,
} from "./tags";
import type { GhlTagPlan, ProClassRegistrationInput } from "./types";

const LOOKBACK_DAYS = 7;

export type GhlSyncMode = "backfill" | "lookback";

export type GhlSyncRunResult = {
  id: string;
  mode: GhlSyncMode;
  status: "ok" | "error";
  dryRun: boolean;
  membersScanned: number;
  contactsUpserted: number;
  tagsAdded: number;
  tagsRemoved: number;
  errorMessage: string | null;
};

type DryRunEntry = { email: string } & GhlTagPlan;

function isRelevantProgramType(description: string): boolean {
  return isClass(description) || isShopSlot(description) || description === "Safety";
}

export type PriorSyncRun = { status: string; dryRun: boolean };

export function determineSyncMode(priorRuns: PriorSyncRun[]): GhlSyncMode {
  const hasRealOkRun = priorRuns.some(
    (run) => run.status === "ok" && !run.dryRun,
  );
  return hasRealOkRun ? "lookback" : "backfill";
}

async function determineMode(): Promise<GhlSyncMode> {
  const priorRuns = await db
    .select({
      status: ghlSyncRunsTable.status,
      dryRun: ghlSyncRunsTable.dryRun,
    })
    .from(ghlSyncRunsTable);
  return determineSyncMode(priorRuns);
}

export async function runGhlSync(
  { dryRun = true }: { dryRun?: boolean } = {},
): Promise<GhlSyncRunResult> {
  const mode = await determineMode();

  const [run] = await db
    .insert(ghlSyncRunsTable)
    .values({ mode, status: "running", dryRun })
    .returning({ id: ghlSyncRunsTable.id });
  const runId = run!.id;

  let membersScanned = 0;
  let contactsUpserted = 0;
  let tagsAdded = 0;
  let tagsRemoved = 0;
  const dryRunOutput: DryRunEntry[] = [];

  try {
    const [contacts, , programs, registrations, proclassUsers] = await Promise.all([
      fetchAllContacts(),
      fetchAllMemberships(),
      fetchAllPrograms(),
      fetchAllRegistrations(),
      db.select().from(proclassUsersTable),
    ]);

    const proclassUsersByMemberId = new Map(
      proclassUsers.map((u) => [u.memberId, u]),
    );

    const programsById = new Map(programs.map((p) => [p.ProgramId, p]));
    const relevantProgramIds = new Set(
      programs
        .filter(
          (p) =>
            !isJunkProgram({
              title: programTitle(p) ?? "",
              status: p.StatusDescription ?? "",
            }),
        )
        .filter((p) => isRelevantProgramType(p.ProgramType?.Description ?? ""))
        .map((p) => p.ProgramId),
    );

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);

    const registrationsByAccountId = new Map<
      number,
      typeof registrations
    >();
    for (const r of registrations) {
      if (!relevantProgramIds.has(r.ProgramId)) continue;
      if (mode === "lookback") {
        if (!r.CreateDate || new Date(r.CreateDate) < cutoff) continue;
      }
      const list = registrationsByAccountId.get(r.AccountId) ?? [];
      list.push(r);
      registrationsByAccountId.set(r.AccountId, list);
    }

    for (const contact of contacts) {
      if (!contact.Email) continue;
      if (
        isJunkContact({
          firstName: contact.FirstName,
          lastName: contact.LastName,
          email: contact.Email,
        })
      ) {
        continue;
      }

      membersScanned++;

      const accountId = getPrimaryAccountId(contact);
      const accountRegistrations =
        accountId !== null ? (registrationsByAccountId.get(accountId) ?? []) : [];
      const registrationInputs: ProClassRegistrationInput[] = accountRegistrations
        .map((r) => {
          const program = programsById.get(r.ProgramId);
          if (!program) return null;
          const title = programTitle(program);
          return title
            ? {
                programTitle: title,
                programTypeDescription: program.ProgramType?.Description ?? "",
              }
            : null;
        })
        .filter((r): r is ProClassRegistrationInput => r !== null);

      const proclassUser = proclassUsersByMemberId.get(String(contact.ContactId));
      const membershipTier = proclassUser?.membership ?? null;

      let lastKnownMembershipTier: string | null = null;
      let lastKnownMembershipTierFull: string | null = null;
      if (!membershipTier && !dryRun) {
        const found = await findContactByEmail(contact.Email);
        lastKnownMembershipTier = found ? findMembershipTierTag(found.tags) : null;
        lastKnownMembershipTierFull = found
          ? findMembershipTierFullTag(found.tags)
          : null;
      }

      const plan = buildGhlTagPlan({
        registrations: registrationInputs,
        membershipTier,
        lastKnownMembershipTier,
        lastKnownMembershipTierFull,
        memberSince: proclassUser?.memberSince ?? null,
      });

      if (!plan.tagsToAdd.length && !plan.tagsToRemove.length) continue;

      if (dryRun) {
        dryRunOutput.push({ email: contact.Email, ...plan });
        if (plan.tagsToAdd.length || plan.memberSinceField) {
          contactsUpserted++;
        }
        tagsAdded += plan.tagsToAdd.length;
        tagsRemoved += plan.tagsToRemove.length;
        continue;
      }

      let contactId: string | null = null;
      if (plan.tagsToAdd.length || plan.memberSinceField) {
        const memberSinceFieldId = plan.memberSinceField
          ? await getOrCreateMemberSinceFieldId()
          : null;
        const upserted = await upsertContactByEmail({
          email: contact.Email,
          firstName: contact.FirstName,
          lastName: contact.LastName,
          memberSinceFieldId,
          memberSinceValue: plan.memberSinceField,
        });
        contactId = upserted.contactId;
        contactsUpserted++;
        if (plan.tagsToAdd.length) {
          await addTags(contactId, plan.tagsToAdd);
          tagsAdded += plan.tagsToAdd.length;
        }
      }

      if (plan.tagsToRemove.length) {
        if (!contactId) {
          const found = await findContactByEmail(contact.Email);
          contactId = found?.id ?? null;
        }
        if (contactId) {
          await removeTags(contactId, plan.tagsToRemove);
          tagsRemoved += plan.tagsToRemove.length;
        }
      }
    }

    const [finished] = await db
      .update(ghlSyncRunsTable)
      .set({
        status: "ok",
        finishedAt: new Date(),
        membersScanned,
        contactsUpserted,
        tagsAdded,
        tagsRemoved,
        dryRunOutput: dryRun ? dryRunOutput : null,
      })
      .where(eq(ghlSyncRunsTable.id, runId))
      .returning();

    return {
      id: finished!.id,
      mode,
      status: "ok",
      dryRun,
      membersScanned,
      contactsUpserted,
      tagsAdded,
      tagsRemoved,
      errorMessage: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const [finished] = await db
      .update(ghlSyncRunsTable)
      .set({
        status: "error",
        finishedAt: new Date(),
        membersScanned,
        contactsUpserted,
        tagsAdded,
        tagsRemoved,
        errorMessage: message,
        dryRunOutput: dryRun ? dryRunOutput : null,
      })
      .where(eq(ghlSyncRunsTable.id, runId))
      .returning();

    await sendSyncErrorEmail({
      syncName: "ProClass -> GHL sync",
      errorMessage: message,
    });

    return {
      id: finished!.id,
      mode,
      status: "error",
      dryRun,
      membersScanned,
      contactsUpserted,
      tagsAdded,
      tagsRemoved,
      errorMessage: message,
    };
  }
}
