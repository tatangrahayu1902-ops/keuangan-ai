const { google } = require("googleapis");

const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function saveToSheet(data) {
  const sheets = google.sheets({ version: "v4", auth });

  const now = new Date();

  // convert ke WIB
  const wib = new Date(now.getTime() + (7 * 60 * 60 * 1000));

  const tanggal = wib.toLocaleDateString("id-ID"); // 21/02/2026
  const jam = wib.toLocaleTimeString("id-ID");     // 19:03:41

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: "Sheet1!A:E",
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [[
        tanggal,
        data.item,
        data.amount,
        data.type || "expense",
      ]],
    },
  });
}

module.exports = { saveToSheet };