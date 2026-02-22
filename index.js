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
      const text = update.message.text.trim();

      // 🔥 HANDLE COMMAND (IMPORTANT)
      if (text.startsWith("/")) {
        if (text === "/start") {
          await sendMessage(
            chatId,
            "👋 Halo!\nKirim transaksi ya.\nContoh:\n- beli bakso 10k\n- gaji 5jt"
          );
        }
        continue; // jangan lanjut ke AI
      }

      try {
        let parsed = await parseText(text);

        // normalize jadi array
        if (!Array.isArray(parsed)) {
          parsed = [parsed];
        }

        let message = "✅ Data tersimpan:\n";

        for (const item of parsed) {
          // 🔥 VALIDASI biar ga kirim data aneh ke sheet
          if (!item.item || !item.amount) {
            console.log("Skip invalid:", item);
            continue;
          }

          // default fallback
          item.type = item.type || "expense";
          item.category = item.category || "other";

          await saveToSheet(item);

          const tipeText =
            item.type === "income" ? "pemasukan" : "pengeluaran";

          message += `- ${item.item} | Rp${item.amount} | ${tipeText} | ${item.category}\n`;
        }

        await sendMessage(chatId, message);

      } catch (err) {
        console.log("ERROR:", err.response?.data || err.message);

        await sendMessage(
          chatId,
          "❌ Gagal membaca input\nCoba contoh: beli bakso 10k"
        );
      }
    }
  }
}

startBot();