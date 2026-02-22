const axios = require("axios");

async function parseText(text) {
  const prompt = `
Extract transaction data from user text.

Rules:
- "k" = 1000
- "rb" = 1000
- "jt" = 1000000
- Detect type:
  - income = pemasukan (gaji, transfer masuk, jual, dll)
  - expense = pengeluaran (beli, bayar, jajan, dll)
- Detect category automatically:
  - makanan → food
  - minuman → drink
  - transport → transport
  - listrik / air / internet → utilities
  - gaji / bonus → income
  - lainnya → other

Return ONLY JSON (no explanation)

Format:
{
  "item": "string",
  "amount": number,
  "type": "income" | "expense",
  "category": "string"
}

Text: "${text}"
`;

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ]
    }
  );

  let result = response.data.candidates[0].content.parts[0].text;

  result = result.replace(/```json/g, "").replace(/```/g, "").trim();

  const parsed = JSON.parse(result);

  return parsed;
}

module.exports = { parseText };