require("dotenv").config();
const axios = require("axios");

const { parseText } = require("./gemini");
const { saveToSheet } = require("./sheets");

const TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

let offset = 0;

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

async function startBot() {
  console.log("Bot jalan di LOCAL...");

  while (true) {
    const updates = await getUpdates();

    for (const update of updates) {
      offset = update.update_id + 1;

      if (!update.message?.text) continue;

      const chatId = update.message.chat.id;
      const text = update.message.text;
      
      try {
        const parsed = await parseText(text);

        await saveToSheet(parsed);

        await sendMessage(
          chatId,
          `✅ ${parsed.item} - Rp${parsed.amount}`
        );

     } catch (err) {
  console.log("ERROR ASLI:", err.response?.data || err.message);

  await sendMessage(chatId, "❌ format salah");
}
    }
  }
}

startBot();