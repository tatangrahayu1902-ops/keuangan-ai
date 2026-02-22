const { google } = require("googleapis");

const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function saveToSheet(data) {
  const sheets = google.sheets({ version: "v4", auth });

  const now = new Date();

  const tanggal = now.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
  });

  // Normalisasi tipe biar sesuai bahasa sheet
  let tipe = "pengeluaran";
  if (data.type === "income") tipe = "pemasukan";

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: "Sheet1!A3:E", // mulai dari row 3
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [[
        tanggal,          // A
        data.item,        // B
        tipe,             // C
        data.amount,      // D
        data.category || "other", // E
      ]],
    },
  });
}

module.exports = { saveToSheet };