import type { JunkCheckContact, JunkCheckProgram } from "./types";

const FAKE_OR_TEST = /fake|test/i;
const TEST_CUSTOMER_LASTNAME = /^testcustomer\d*$/i;

export function isJunkContact(contact: JunkCheckContact): boolean {
  const first = contact.firstName ?? "";
  const last = contact.lastName ?? "";
  if (FAKE_OR_TEST.test(first) && FAKE_OR_TEST.test(last)) return true;
  if (contact.email?.toLowerCase().endsWith("@proclassonline.com")) {
    return true;
  }
  if (TEST_CUSTOMER_LASTNAME.test(last.trim())) return true;
  return false;
}

export function isJunkProgram(program: JunkCheckProgram): boolean {
  return FAKE_OR_TEST.test(program.title) && program.status === "Canceled";
}
