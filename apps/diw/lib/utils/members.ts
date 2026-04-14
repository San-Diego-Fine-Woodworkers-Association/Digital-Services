/**
 * Utility functions for member import
 */

import { CsvParseError, MemberData, MembersCsvRow, ParseResult } from "@/lib/types/members";

// Validation

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidMemberId(memberId: string): boolean {
  // Member ID should be non-empty string
  return memberId.trim().length > 0;
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
}

// CSV Parsing

const EXPECTED_COLUMNS = [
  "Member ID",
  "Name",
  "Email",
  "Membership",
  "Address",
  "Phone Number",
  "Admin",
];

// Helper function to parse CSV line with proper quote handling
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // End of field
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // Add last field
  values.push(current.trim());
  return values;
}

export function parseMembersFromCsv(csvContent: string): ParseResult {
  const errors: CsvParseError[] = [];
  const data: MemberData[] = [];

  const lines = csvContent.split("\n");
  if (lines.length < 2) {
    return {
      success: false,
      errors: [{ row: 1, field: "general", message: "CSV file is empty" }],
    };
  }

  const headerLine = lines[0] || "";
  const headers = parseCSVLine(headerLine);

  // Validate headers
  const missingColumns = EXPECTED_COLUMNS.filter(
    (col) => !headers.includes(col)
  );
  if (missingColumns.length > 0) {
    return {
      success: false,
      errors: [
        {
          row: 1,
          field: "headers",
          message: `Missing columns: ${missingColumns.join(", ")}`,
        },
      ],
    };
  }

  const columnIndices: Record<string, number> = {};
  EXPECTED_COLUMNS.forEach((col) => {
    columnIndices[col] = headers.indexOf(col);
  });

  // Parse data rows
  const seenMemberIds = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim() || "";
    if (!line) continue; // Skip empty lines

    const values = parseCSVLine(line);

    // Extract values by column (with bounds checking)
    const getColumnValue = (colName: string): string => {
      const idx = columnIndices[colName];
      if (idx !== undefined && idx >= 0 && idx < values.length) {
        return values[idx] ?? "";
      }
      return "";
    };

    const memberId = getColumnValue("Member ID");
    const name = getColumnValue("Name");
    const email = getColumnValue("Email");
    const membership = getColumnValue("Membership");
    const address = getColumnValue("Address");
    const phone = getColumnValue("Phone Number");
    const adminStr = getColumnValue("Admin");

    // Validate each field
    if (!isValidMemberId(memberId)) {
      errors.push({
        row: i + 1,
        field: "Member ID",
        message: "Member ID cannot be empty",
      });
      continue;
    }

    if (seenMemberIds.has(memberId)) {
      errors.push({
        row: i + 1,
        field: "Member ID",
        message: `Duplicate Member ID: ${memberId}`,
      });
      continue;
    }
    seenMemberIds.add(memberId);

    if (!name.trim()) {
      errors.push({
        row: i + 1,
        field: "Name",
        message: "Name cannot be empty",
      });
      continue;
    }

    if (!isValidEmail(email)) {
      errors.push({
        row: i + 1,
        field: "Email",
        message: `Invalid email: ${email}`,
      });
      continue;
    }

    if (!membership.trim()) {
      errors.push({
        row: i + 1,
        field: "Membership",
        message: "Membership cannot be empty",
      });
      continue;
    }

    if (!address.trim()) {
      errors.push({
        row: i + 1,
        field: "Address",
        message: "Address cannot be empty",
      });
      continue;
    }

    if (!isValidPhone(phone)) {
      errors.push({
        row: i + 1,
        field: "Phone Number",
        message: `Invalid phone number: ${phone}`,
      });
      continue;
    }

    const isAdmin = adminStr.toLowerCase() === "true";

    data.push({
      memberId,
      name,
      email,
      membership,
      address,
      phone,
      isAdmin,
    });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data };
}

// Note: File reading is now handled on the client side in the import dialog
// using FileReader API, so we don't need readCsvFile here
