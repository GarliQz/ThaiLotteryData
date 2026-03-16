import * as fs from "fs";
import * as path from "path";

// Get the current directory
const __dirname = process.cwd();

interface Prize {
  price: number;
  number?: Array<{
    round: number;
    value: string;
  }>;
}

interface LotteryData {
  date: string;
  data: {
    [key: string]: Prize;
  };
}

interface ApiResponse {
  response: {
    result: LotteryData;
  };
}

interface TransformedRow {
  [key: string]: any;
}

function transformJsonData(jsonData: ApiResponse): TransformedRow {
  const resultData = jsonData.response.result;

  const output: TransformedRow = {
    date: resultData.date,
  };

  for (const [key, prize] of Object.entries(resultData.data)) {
    output[`${key}-price`] = prize.price;

    output[`${key}-value`] = [...(prize.number || [])]
      .sort((a: any, b: any) => a.round - b.round)
      .map((n: any) => n.value)
      .join("|");
  }

  return output;
}

function escapeCSVValue(value: any): string {
  if (value === undefined || value === null) {
    return "";
  }
  const stringValue = String(value);
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function rowToCSVLine(row: TransformedRow, headers: string[]): string {
  return headers.map((header) => escapeCSVValue(row[header])).join(",");
}

function checkDataFiles(appendOnlyMode: boolean = false, specificDate?: string): void {
  const jsonDir = path.join(__dirname, "data", "json");
  const csvDir = path.join(__dirname, "data", "csv");
  const allCsvPath = path.join(__dirname, "data", "all.csv");

  if (!fs.existsSync(jsonDir)) {
    console.log("No JSON directory found.");
    return;
  }

  let jsonFiles: string[] = [];

  if (specificDate) {
    // Specific date: look for that file only
    const dateFile = `${specificDate}.json`;
    const filePath = path.join(jsonDir, dateFile);
    if (fs.existsSync(filePath)) {
      jsonFiles = [dateFile];
    } else {
      console.log(`File not found: ${dateFile}`);
      return;
    }
  } else {
    // Process all JSON files
    jsonFiles = fs
      .readdirSync(jsonDir)
      .filter((f) => f.endsWith(".json"))
      .sort();
  }

  if (jsonFiles.length === 0) {
    console.log("No JSON files found.");
    return;
  }

  let allRows: TransformedRow[] = [];
  let allHeaders: Set<string> = new Set();

  // Process selected JSON files
  for (const file of jsonFiles) {
    const filePath = path.join(jsonDir, file);
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const jsonData = JSON.parse(fileContent);
      const row = transformJsonData(jsonData);

      // Extract the date from filename (yyyy-mm-dd format)
      const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
      const dateFromFilename = dateMatch ? dateMatch[1] : null;

      // Create individual CSV file (unless append-only mode)
      if (dateFromFilename && !appendOnlyMode) {
        const individualCsvPath = path.join(csvDir, `${dateFromFilename}.csv`);
        const headers = Object.keys(row);
        const csvContent = [
          headers.join(","),
          rowToCSVLine(row, headers),
        ].join("\n");

        if (!fs.existsSync(csvDir)) {
          fs.mkdirSync(csvDir, { recursive: true });
        }

        fs.writeFileSync(individualCsvPath, csvContent, "utf-8");
        console.log(`Created: ${individualCsvPath}`);
      }

      // Collect for all.csv
      allRows.push(row);
      Object.keys(row).forEach((key) => allHeaders.add(key));
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }

  // Create or append to all.csv
  if (allRows.length > 0) {
    const headersArray = Array.from(allHeaders).sort();
    let csvContent = "";

    // Check if all.csv already exists
    const fileExists = fs.existsSync(allCsvPath);

    if (!fileExists) {
      // Create new file with header
      csvContent = [
        headersArray.join(","),
        ...allRows.map((row) => rowToCSVLine(row, headersArray)),
      ].join("\n");
    } else {
      // Append to existing file
      const existingContent = fs.readFileSync(allCsvPath, "utf-8");
      const existingLines = existingContent.split("\n").filter((line) => line.trim());
      const existingHeaders = existingLines[0].split(",");

      // Merge headers
      const mergedHeaders = Array.from(
        new Set([...headersArray, ...existingHeaders])
      ).sort();

      csvContent = [
        mergedHeaders.join(","),
        ...existingLines.slice(1),
        ...allRows.map((row) => rowToCSVLine(row, mergedHeaders)),
      ].join("\n");
    }

    fs.writeFileSync(allCsvPath, csvContent, "utf-8");
    console.log(`Updated: ${allCsvPath}`);
  }
}

// Main execution
const args = process.argv.slice(2);
const appendOnly = args.includes("--append-only");
const inputDate = args.find((arg) => !arg.startsWith("--"));

if (appendOnly) {
  // Append only mode: Process all JSON files
  checkDataFiles(true);
} else if (inputDate) {
  // Specific date mode: Process only that date
  checkDataFiles(false, inputDate);
} else {
  // Default: Process all JSON files
  checkDataFiles(false);
}
