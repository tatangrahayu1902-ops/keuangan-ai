require("dotenv").config();
const axios = require("axios");

const { parseText } = require("./gemini");
const { saveToSheet } = require("./sheets");

const TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

let offset = 0;

// ================== DEBUG TOKEN ==================
console.log("TOKEN:", TOKEN ? "✅ ADA" : "❌ KOSONG");

// ================== TELEGRAM ==================

async function getUpdates() {
  const res = await axios.get(`${TELEGRAM_API}/getUpdates`, {
    params: { offset, timeout: 30 },
  });
  return res.data.result;
}

async function sendMessage(chatId, text) {
  await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: chatId,
    text,
  });
}

// ================== DOWNLOAD FILE ==================

async function downloadFile(fileId) {
  try {
    console.log("📥 Ambil fileId:", fileId);

    const fileRes = await axios.get(
      `${TELEGRAM_API}/getFile`,
      {
        params: { file_id: fileId }
      }
    );

    if (!fileRes.data.ok) {
      throw new Error("getFile gagal dari Telegram");
    }

    const filePath = fileRes.data.result?.file_path;

    if (!filePath) {
      throw new Error("file_path tidak ada");
    }

    const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;

    const response = await axios({
      url: fileUrl,
      method: "GET",
      responseType: "arraybuffer",
    });

    return Buffer.from(response.data, "binary");
    
  } catch (err) {
    console.log("❌ DOWNLOAD ERROR:", err.response?.data || err.message);
    throw err;
  }
}

// ================== GEMINI IMAGE ==================

async function parseImage(imageBuffer) {
  try {
    const base64Image = imageBuffer.toString("base64");

    const res = await axios.post(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent",
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `
Extract nota jadi JSON.

Boleh lebih dari 1 item.

Format:
[
  { "item": "string", "amount": number }
]

WAJIB:
- hanya JSON array
- tanpa teks tambahan
`
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image,
                },
              },
            ],
          },
        ],
      },
      {
        params: {
          key: process.env.GEMINI_API_KEY,
        },
      }
    );

    let text = res.data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    text = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const jsonMatch = text.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      throw new Error("JSON array tidak ditemukan");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return parsed;

  } catch (err) {
    console.log("❌ GEMINI IMAGE ERROR:", err.response?.data || err.message);
    throw err;
  }
}

// ================== MAIN BOT ==================

async function startBot() {
  console.log("🚀 Bot jalan...");

  while (true) {
    const updates = await getUpdates();

    for (const update of updates) {
      offset = update.update_id + 1;

      const message = update.message;
      if (!message) continue;

      const chatId = message.chat.id;

      // ================== COMMAND ==================
      if (message.text && message.text.startsWith("/")) {
        if (message.text === "/start") {
          await sendMessage(
            chatId,
            "👋 Halo!\nKirim:\n- teks (beli bakso 10k)\n- atau foto nota 📸"
          );
        }
        continue;
      }

      try {
        let items = [];

        // ================== FOTO / FILE ==================
        if (message.photo || message.document) {
          let fileId;

          if (message.photo) {
            fileId = message.photo[message.photo.length - 1].file_id;
            console.log("📸 FOTO diterima");
          } else {
            fileId = message.document.file_id;
            console.log("📎 DOCUMENT diterima");
          }

          const imageBuffer = await downloadFile(fileId);

          const result = await parseImage(imageBuffer);

          items = Array.isArray(result) ? result : [];
        }

        // ================== TEXT ==================
        else if (message.text) {
          console.log("💬 TEXT:", message.text);

          let parsed = await parseText(message.text.trim());

          if (!Array.isArray(parsed)) parsed = [parsed];

          items = parsed;
        }

        else {
          continue;
        }

        // ================== SIMPAN ==================
        let reply = "✅ Data tersimpan:\n";

        for (const item of items) {
          if (!item.item || !item.amount) continue;

          const data = {
            item: item.item,
            amount: item.amount,
            type: item.type || "expense",
            category: item.category || "other",
          };

          await saveToSheet(data);

          const tipeText =
            data.type === "income" ? "pemasukan" : "pengeluaran";

          reply += `- ${data.item} | Rp${data.amount} | ${tipeText} | ${data.category}\n`;
        }

        if (items.length === 0) {
          reply = "⚠️ Tidak ada data terbaca dari input";
        }

        await sendMessage(chatId, reply);

      } catch (err) {
        console.log("❌ ERROR:", err.response?.data || err.message);

        await sendMessage(
          chatId,
          "❌ Gagal membaca data\nCoba:\n- teks: beli bakso 10k\n- atau foto nota jelas"
        );
      }
    }
  }
}

startBot();