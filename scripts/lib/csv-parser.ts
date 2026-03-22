/**
 * Simple CSV/TSV parser. No external dependencies.
 *
 * Auto-detects delimiter (tab vs comma) unless explicitly provided.
 * Handles quoted fields with escaped quotes (RFC 4180).
 */

export interface CSVParseOptions {
  delimiter?: string;
  hasHeader?: boolean;
}

export function parseCSV(
  content: string,
  options?: CSVParseOptions
): Record<string, string>[] {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length === 0) return [];

  // Auto-detect delimiter: if first line has more tabs than commas, use tab
  const delimiter =
    options?.delimiter ??
    ((lines[0].split("\t").length > lines[0].split(",").length) ? "\t" : ",");
  const hasHeader = options?.hasHeader ?? true;

  function parseLine(line: string): string[] {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++; // skip escaped quote
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    return fields;
  }

  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return [];

  const headers = hasHeader
    ? parseLine(nonEmpty[0])
    : parseLine(nonEmpty[0]).map((_, i) => `col${i}`);
  const startIdx = hasHeader ? 1 : 0;

  const results: Record<string, string>[] = [];
  for (let i = startIdx; i < nonEmpty.length; i++) {
    const fields = parseLine(nonEmpty[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = fields[j] ?? "";
    }
    results.push(row);
  }
  return results;
}
