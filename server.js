const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { parse } = require("csv-parse/sync");

const app = express();
const PORT = 3000;

app.use(cors());

function formatDateForNyiso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function formatDateForApi(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildNyisoCsvUrl(date) {
  const yyyymmdd = formatDateForNyiso(date);
  return `https://mis.nyiso.com/public/csv/damlbmp/${yyyymmdd}damlbmp_zone.csv`;
}

app.get("/api/lbmp", async (req, res) => {
  try {
    let requestedDate;

    if (req.query.date) {
      requestedDate = new Date(`${req.query.date}T00:00:00`);
    } else {
      requestedDate = new Date();
    }

    const csvUrl = buildNyisoCsvUrl(requestedDate);

    const response = await axios.get(csvUrl);
    const csvText = response.data;

    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true
    });

    const cleanedData = records.map((row) => ({
      name: row.Name || null,
      ptid: row.PTID ? Number(row.PTID) : null,
      hour: row["Time Stamp"] || row.Time || null,
      lbmp: row["LBMP ($/MWHr)"] ? Number(row["LBMP ($/MWHr)"]) : null,
      marginalCostLosses: row["Marginal Cost Losses ($/MWHr)"]
        ? Number(row["Marginal Cost Losses ($/MWHr)"])
        : null,
      marginalCostCongestion: row["Marginal Cost Congestion ($/MWHr)"]
        ? Number(row["Marginal Cost Congestion ($/MWHr)"])
        : null
    }));

    res.json({
      marketDate: formatDateForApi(requestedDate),
      source: csvUrl,
      totalRows: cleanedData.length,
      data: cleanedData
    });
  } catch (error) {
    res.status(500).json({
      error: "Could not get NYISO data",
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});