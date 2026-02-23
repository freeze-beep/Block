const { 
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason,
    downloadContentFromMessage
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const http = require("http");

// ================= CONFIG =================

const config = {
    owner: "243986860268",
    phoneNumber: "243986860268",
    name: "AYANOKOJI-BOT",
    chef: "Kiyotaka Ayanokoji",
    prefix: ".",
    image: "https://i.supaimg.com/ba0cda0b-0be1-4bc3-b8c9-c0f903bcc6bf/cee23d05-8cd3-49de-b6ee-8df91763633a.jpg"
};

// ================= RENDER KEEP ALIVE =================

const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Elite System Active");
}).listen(port);

// ================= START BOT =================

async function start() {

    const { state, saveCreds } = await useMultiFileAuthState("session_elite");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            const code = await sock.requestPairingCode(config.phoneNumber);
            console.log("\nCODE DE CONNEXION :", code, "\n");
        }, 4000);
    }

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        if (update.connection === "close") {
            const shouldReconnect = update.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) start();
        }
    });

    sock.ev.on("messages.upsert", async (m) => {

        const msg = m.messages[0];
        if (!msg.message || msg.key.remoteJid === "status@broadcast") return;

        const from = msg.key.remoteJid;
        const isGroup = from.endsWith("@g.us");
        const sender = msg.key.participant || msg.key.remoteJid;
        const isOwner = sender.includes(config.owner) || msg.key.fromMe;

        const body = (
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            ""
        ).trim();

        if (!body.startsWith(config.prefix)) return;

        const args = body.slice(config.prefix.length).trim().split(/ +/g);
        const cmd = args.shift().toLowerCase();

        const getAdmin = async () => {
            if (!isGroup) return false;
            const meta = await sock.groupMetadata(from);
            const botId = sock.user.id.split(":")[0] + "@s.whatsapp.net";
            return !!meta.participants.find(p => p.id === botId)?.admin;
        };

        try {

            // ================= MENU =================

            if (cmd === "menu" || cmd === "help") {

                const menu = `
╔══════════════════════════════╗
        ${config.name}
╚══════════════════════════════╝

👑 Chef : ${config.chef}
🩸 Créateur : KIYOTAKA AYANOKOJI 
🕯 Lignée : Fils du Grand Monarque

━━━━━━━━━━━━━━━━━━━━━━
⚔️ GESTION
━━━━━━━━━━━━━━━━━━━━━━
• .promote
• .demote
• .kick
• .purge
• .tagadmin
• .del
• .block
• .unblock

━━━━━━━━━━━━━━━━━━━━━━
🛡 PROTECTION
━━━━━━━━━━━━━━━━━━━━━━
• .antilink
• .antibot
• .welcome
• .antivv

━━━━━━━━━━━━━━━━━━━━━━
🌑 DOMINATION
━━━━━━━━━━━━━━━━━━━━━━
• .domination
• .liberation
• .hidetag
• .setname
• .setdesc

━━━━━━━━━━━━━━━━━━━━━━
⚙️ TECHNIQUE
━━━━━━━━━━━━━━━━━━━━━━
• .owner
• .vv
• .ping
• .runtime
• .speed

━━━━━━━━━━━━━━━━━━━━━━
🎭 LOISIR
━━━━━━━━━━━━━━━━━━━━━━
• .love
• .quote
• .say
• .insulte
• .weather

━━━━━━━━━━━━━━━━━━━━━━
« Le stratège parle peu.
Mais agit parfaitement. »
— Cœur de Code-
━━━━━━━━━━━━━━━━━━━━━━
`;

                await sock.sendMessage(from, {
                    image: { url: config.image },
                    caption: menu
                }, { quoted: msg });

                return;
            }

            // ================= COMMANDES =================

            if (cmd === "ping") {
                await sock.sendMessage(from, { text: "🚀 Système opérationnel." });
            }

            if (cmd === "runtime") {
                await sock.sendMessage(from, { text: `⏳ Runtime : ${Math.floor(process.uptime())} sec` });
            }

            if (cmd === "speed") {
                const start = Date.now();
                const end = Date.now();
                await sock.sendMessage(from, { text: `⚡ ${end - start} ms` });
            }

            if (cmd === "love") {
                const percent = Math.floor(Math.random() * 100);
                await sock.sendMessage(from, { text: `❤️ Compatibilité : ${percent}%` });
            }

            if (cmd === "quote") {
                await sock.sendMessage(from, { text: "« L’intelligence froide est l’arme la plus silencieuse. »" });
            }

            if (cmd === "insulte") {
                await sock.sendMessage(from, { text: "Tu n’es pas inutile… juste un fdp con." });
            }

            if (cmd === "say") {
                await sock.sendMessage(from, { text: args.join(" ") });
            }

            if (cmd === "weather") {
                await sock.sendMessage(from, { text: "🌤 API météo non configurée." });
            }

        } catch (err) {
            console.log("Erreur :", err);
        }

    });

}

start();
