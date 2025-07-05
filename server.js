
const express = require("express");
const fetch = require("node-fetch");
const app = express();
const cors = require("cors");

app.use(cors());
app.use(express.json());

const ONE_SEC_MAIL_DOMAIN = "1secmail.com";
let fallbackMode = false;

// Health check for 1SecMail (every 60s)
setInterval(async () => {
  try {
    const res = await fetch(`https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1`);
    fallbackMode = !(res.ok);
  } catch {
    fallbackMode = true;
  }
}, 60000);

// Validate prefix
function isValidPrefix(prefix) {
  return /^[a-zA-Z0-9_]{3,30}$/.test(prefix);
}

// Generate email
app.get("/api/generate", async (req, res) => {
  const { prefix } = req.query;

  if (!prefix || !isValidPrefix(prefix)) {
    return res.status(400).json({ error: "Invalid email prefix." });
  }

  if (!fallbackMode) {
    const email = `${prefix.toLowerCase()}@${ONE_SEC_MAIL_DOMAIN}`;
    return res.json({ email });
  } else {
    // Fallback to Mail.tm
    try {
      const domRes = await fetch("https://api.mail.tm/domains");
      const { hydra: { member } } = await domRes.json();
      const fallbackDomain = member[0]?.domain || "mail.tm";
      const email = `${prefix.toLowerCase()}@${fallbackDomain}`;
      return res.json({ email });
    } catch {
      return res.status(500).json({ error: "All inbox engines are unavailable." });
    }
  }
});

// Fetch messages from inbox
app.get("/api/messages", async (req, res) => {
  const { prefix } = req.query;
  if (!prefix || !isValidPrefix(prefix)) {
    return res.status(400).json({ error: "Invalid email prefix." });
  }

  if (!fallbackMode) {
    const url = `https://www.1secmail.com/api/v1/?action=getMessages&login=${prefix}&domain=${ONE_SEC_MAIL_DOMAIN}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      return res.json(data);
    } catch {
      return res.status(500).json({ error: "1SecMail failed." });
    }
  } else {
    return res.status(503).json({ error: "Fallback engine not supported for inbox viewing yet." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
