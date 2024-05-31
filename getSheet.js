import { google } from "googleapis";

const SPREAD_SHEET_ID = process.env.SPREAD_SHEET_ID;
const GOOGLE_CREDENTIALS = process.env.GOOGLE_CREDENTIALS || "";

// auth from json file
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(GOOGLE_CREDENTIALS),
  scopes: "https://www.googleapis.com/auth/spreadsheets",
});

const sheets = google.sheets({ version: "v4", auth });

const algorithmColumnsKeys = {
  "Algorithm Name": "name",
  exact: "exactAlgorithm",
  "Span Encoding (T_1)": "spanEncoding",
  "Work Encoding (T_inf)": "workEncoding",
  "Reference mentions work efficiency?": "workEfficiencyReference",
  "Type of Randomized Algorithm (e.g. Las Vegas, Monte Carlo, Atlantic City)":
    "typeOfRandomizedAlgorithm",
  "Approximation Factor (if approximate algorithm)": "approximationFactor",
  "# of\nProcessors": "numberOfProcessors",
  "# of Proc Encoding": "numberOfProcessorsEncoding",
  "Looked at?": "reviewed",
  "Looked at? (0 - no, 0.001 - briefly but seems to have issues, 1 - partially, 2 - [mostly] yes)": "reviewed"
};

export default async function getSheet(sheetName) {
  const dataList = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREAD_SHEET_ID,
    range: `${sheetName}!A1:ZZ`,
  });

  if (!dataList.data.values) {
    return [];
  }

  const keys = dataList.data.values[0];
  const data = dataList.data.values.slice(1);

  const values = data.map((row) => {
    const item = {};

    keys.forEach((key, index) => {
      const newKey = algorithmColumnsKeys[key] || toCamelCase(key);

      if (row[index]) {
        item[newKey] = removeQuestionMark(row[index]);
      } else {
        item[newKey] = "";
      }
    });

    return item;
  });

  return values;
}

function toCamelCase(text) {
  if (!text) return "";

  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // Replace any sequence of non-alphanumeric characters with a single hyphen
    .replace(/-+(.)/g, (match, group1) => group1.toUpperCase()) // Convert first letter after each hyphen to uppercase and remove the hyphen
    .replace(/^-|-$/g, ""); // Remove leading and trailing hyphens
}

function removeQuestionMark(value) {
  const urlPattern = /^https?:\/\//;

  return urlPattern.test(value) ? value : value.replace(/\?/g, "");
}
