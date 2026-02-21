const axios = require("axios");

async function parseText(text) {
  const prompt = `
Extract transaction from text.

Rules:
- k = 1000
- rb = 1000
- jt = 1000000
- default type = expense
- return JSON only

Text: "${text}"
`;

const response = await axios.post(
  `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
  {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `
Extract transaction into JSON.

Rules:
- "k" = 1000
- "rb" = 1000
- return ONLY JSON
- no explanation

Format:
{"item":"string","amount":number}

Text: "${text}"
`
          }
        ]
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