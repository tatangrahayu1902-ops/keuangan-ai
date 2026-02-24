const axios = require("axios");

async function parseText(text) {
  try {
    const safeText = text.replace(/[`]/g, "");

    const prompt = `
Kamu adalah AI pencatat keuangan.

Extract data transaksi dari text user.

Rules:
- k = 1000
- rb = 1000
- jt = 1000000
- amount harus number

Type:
- income = pemasukan
- expense = pengeluaran

Category:
- makanan = food
- minuman = drink
- transport = transport
- listrik/air/internet = utilities
- gaji/bonus = income
- lainnya = other

Jika ada lebih dari 1 transaksi, kembalikan dalam array JSON.

Jawab hanya JSON tanpa teks tambahan.

Format:
[
  {
    "item": "string",
    "amount": number,
    "type": "income" atau "expense",
    "category": "string"
  }
]

Text: ${safeText}
`;

    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent",
      {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 300
        }
      },
      {
        params: {
          key: process.env.GEMINI_API_KEY
        },
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    let result =
      response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // ===== CLEAN MARKDOWN =====
    result = result
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // ===== DETECT ARRAY / OBJECT =====
    let clean;

    if (result.includes("[")) {
      const first = result.indexOf("[");
      const last = result.lastIndexOf("]");

      if (first === -1 || last === -1) {
        throw new Error("JSON array tidak ditemukan");
      }

      clean = result.substring(first, last + 1);
    } else {
      const first = result.indexOf("{");
      const last = result.lastIndexOf("}");

      if (first === -1 || last === -1) {
        throw new Error("JSON object tidak ditemukan");
      }

      clean = result.substring(first, last + 1);
    }

    // ===== FIX JSON ERROR UMUM =====
    clean = clean
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ");

    let parsed;

    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      console.error("RAW RESULT:", result);
      console.error("CLEAN JSON:", clean);
      throw new Error("JSON parse gagal");
    }

    // ===== NORMALISASI =====
    if (!Array.isArray(parsed)) {
      parsed = [parsed];
    }

    // ===== VALIDASI + NORMALISASI =====
    const finalData = parsed.map((item) => {
      return {
        item: item.item || "unknown",
        amount:
          typeof item.amount === "number"
            ? item.amount
            : parseInt(item.amount) || 0,
        type: ["income", "expense"].includes(item.type)
          ? item.type
          : "expense",
        category: item.category || "other"
      };
    });

    return finalData;

  } catch (err) {
    console.error("ParseText Error:", err.message);

    return [
      {
        item: text,
        amount: 0,
        type: "expense",
        category: "other"
      }
    ];
  }
}

module.exports = { parseText };