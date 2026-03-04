const { google } = require("googleapis");

const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// 🔹 SAVE DATA
async function saveToSheet(data) {
  const sheets = google.sheets({ version: "v4", auth });

  const now = new Date();

  const tanggal = now.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
  });

  let tipe = "pengeluaran";
  if (data.type === "income") tipe = "pemasukan";

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: "Sheet1!A3:E",
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [[
        tanggal,
        data.item,
        tipe,
        data.amount,
        data.category || "other",
      ]],
    },
  });
}

// 🔹 GET DATA (QUERY)
async function getCellValue(range) {
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `Sheet1!${range}`,
  });

  return res.data.values?.[0]?.[0] || 0;
}

// ✅ EXPORT SEKALI
module.exports = { saveToSheet, getCellValue };
