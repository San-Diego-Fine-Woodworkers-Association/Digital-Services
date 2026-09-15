import type { JunkCheckContact, JunkCheckProgram } from "./types";

const FAKE_OR_TEST = /fake|test/i;
const TEST_CUSTOMER_LASTNAME = /^testcustomer\d*$/i;

/**
 * Confirmed against live ProClass data (see the map's Decisions so far):
 * "fake"/"test" in *both* first and last name, OR a proclassonline.com
 * email, OR a Testcustomer\d* lastname, OR a null CreateDate.
 */
export function isJunkContact(contact: JunkCheckContact): boolean {
  const first = contact.firstName ?? "";
  const last = contact.lastName ?? "";
  if (FAKE_OR_TEST.test(first) && FAKE_OR_TEST.test(last)) return true;
  if (contact.email?.toLowerCase().endsWith("@proclassonline.com")) {
    return true;
  }
  if (TEST_CUSTOMER_LASTNAME.test(last.trim())) return true;
  if (!contact.createDate) return true;
  return false;
}

/**
 * Canceled status alone is not sufficient — 421 legitimately-canceled real
 * programs exist. Only FAKE/TEST-titled AND Canceled programs are junk.
 */
export function isJunkProgram(program: JunkCheckProgram): boolean {
  return FAKE_OR_TEST.test(program.title) && program.status === "Canceled";
}
