const fs = require("fs");

const INPUT_FILE = "all_countries.csv";
const OUTPUT_FILE = "all_countries_extended.csv";

const GDP_PER_CAPITA_URL =
  "https://api.worldbank.org/v2/country/all/indicator/NY.GDP.PCAP.CD?format=json&date=2023&per_page=20000";

const COUNTRY_INFO_URL =
  "https://api.worldbank.org/v2/country/all?format=json&per_page=400";

const MANUAL_COUNTRY_DATA = {
  GLP: {
    countryName: "Guadeloupe",
    incomeLevel: "Not classified",
  },
  TWN: {
    countryName: "Taiwan",
    incomeLevel: "High income",
  },
  MTQ: {
    countryName: "Martinique",
    incomeLevel: "Not classified",
  },
  ESH: {
    countryName: "Western Sahara",
    incomeLevel: "Not classified",
  },
  REU: {
    countryName: "Réunion",
    incomeLevel: "Not classified",
  },
  GUF: {
    countryName: "French Guiana",
    incomeLevel: "Not classified",
  },
  MYT: {
    countryName: "Mayotte",
    incomeLevel: "Not classified",
  },
  ETH: {
    countryName: "Ethiopia",
    incomeLevel: "Low income",
  },
};

function parseCSV(text) {
  const rows = [];
  let row = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      value += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") i++;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows.filter((row) => row.length > 1 || row[0] !== "");
}

function escapeCSV(value) {
  if (value === undefined || value === null) return "";

  const text = String(value);

  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

async function fetchJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`World Bank API request failed: ${response.status}`);
  }

  return response.json();
}

async function getGDPPerCapitaData() {
  const data = await fetchJSON(GDP_PER_CAPITA_URL);
  const records = data[1];

  const gdpPerCapitaByCountryISO = {};

  for (const record of records) {
    const iso3 = record.countryiso3code;
    const gdpPerCapita = record.value;

    if (iso3 && gdpPerCapita !== null) {
      gdpPerCapitaByCountryISO[iso3] = gdpPerCapita;
    }
  }

  return gdpPerCapitaByCountryISO;
}

async function getCountryIncomeData() {
  const data = await fetchJSON(COUNTRY_INFO_URL);
  const records = data[1];

  const incomeDataByCountryISO = {};

  for (const record of records) {
    const iso3 = record.id;
    const incomeLevel = record.incomeLevel?.value || "";

    if (iso3) {
      incomeDataByCountryISO[iso3] = {
        countryName: record.name || record.id,
        incomeLevel,
        economicStatus: getEconomicStatus(incomeLevel),
      };
    }
  }

  return incomeDataByCountryISO;
}

function getEconomicStatus(incomeLevel) {
  if (!incomeLevel || incomeLevel === "Not classified") {
    return "";
  }

  if (incomeLevel === "High income") {
    return "Developed";
  }

  return "Developing";
}

function addColumnIfMissing(headers, columnName) {
  if (!headers.includes(columnName)) {
    headers.push(columnName);
  }
}

async function main() {
  const csvText = fs.readFileSync(INPUT_FILE, "utf8");
  const rows = parseCSV(csvText);

  const headers = rows[0];
  const countryISOIndex = headers.indexOf("countryISO3");

  if (countryISOIndex === -1) {
    throw new Error("Could not find a column called countryISO3.");
  }

  const countryNameColumn = "country_name";
  const gdpPerCapitaColumn = "gdp_per_capita_2023_current_usd";
  const incomeLevelColumn = "world_bank_income_level";
  const economicStatusColumn = "economic_status";

  addColumnIfMissing(headers, countryNameColumn);
  addColumnIfMissing(headers, gdpPerCapitaColumn);
  addColumnIfMissing(headers, incomeLevelColumn);
  addColumnIfMissing(headers, economicStatusColumn);

  const countryNameIndex = headers.indexOf(countryNameColumn);
  const gdpPerCapitaIndex = headers.indexOf(gdpPerCapitaColumn);
  const incomeLevelIndex = headers.indexOf(incomeLevelColumn);
  const economicStatusIndex = headers.indexOf(economicStatusColumn);

  console.log("Fetching 2023 GDP per capita data from World Bank...");
  const gdpPerCapitaByCountryISO = await getGDPPerCapitaData();

  console.log("Fetching World Bank income classifications...");
  const incomeDataByCountryISO = await getCountryIncomeData();

  const outputRows = [headers];

  let matchedGDPCount = 0;
  let matchedIncomeCount = 0;
  const missingGDP = [];
  const missingIncome = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    while (row.length < headers.length) {
      row.push("");
    }

    const countryISO = row[countryISOIndex]?.trim().toUpperCase();

    const gdpPerCapita = gdpPerCapitaByCountryISO[countryISO];
    const incomeData =
      MANUAL_COUNTRY_DATA[countryISO] || incomeDataByCountryISO[countryISO];

    if (gdpPerCapita !== undefined) {
      row[gdpPerCapitaIndex] = gdpPerCapita;
      matchedGDPCount++;
    } else {
      row[gdpPerCapitaIndex] = "";
      missingGDP.push(countryISO);
    }
    if (incomeData !== undefined && incomeData.countryName) {
      row[countryNameIndex] = incomeData.countryName;
      row[incomeLevelIndex] = incomeData.incomeLevel;
      row[economicStatusIndex] = getEconomicStatus(incomeData.incomeLevel);
      matchedIncomeCount++;

      outputRows.push(row);
    } else {
      missingIncome.push(countryISO);
    }
  }

  const outputCSV = outputRows
    .map((row) => row.map(escapeCSV).join(","))
    .join("\n");

  fs.writeFileSync(OUTPUT_FILE, outputCSV);

  console.log(`Done! Created ${OUTPUT_FILE}`);
  console.log(`Matched GDP per capita rows: ${matchedGDPCount}`);
  console.log(`Matched income classification rows: ${matchedIncomeCount}`);

  if (missingGDP.length > 0) {
    console.log("Missing GDP per capita for:");
    console.log([...new Set(missingGDP)].filter(Boolean).join(", "));
  }

  if (missingIncome.length > 0) {
    console.log("Missing income classification for:");
    console.log([...new Set(missingIncome)].filter(Boolean).join(", "));
  }
}

main().catch((error) => {
  console.error(error);
});
