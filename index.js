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
    prefix: ".",
    name: "AYANOKOJI-BOT",
    image: "https://i.supaimg.com/ba0cda0b-0be1-4bc3-b8c9-c0f903bcc6bf/cee23d05-8cd3-49de-b6ee-8df91763633a.jpg"
};

// ================= MEMORY SYSTEM =================

let settings = {
    antilink: {},
    antibot: {}
};

// ================= KEEP ALIVE =================

const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end("System Active");
}).listen(port);

// ================= START =================

async function start() {

    const { state, saveCreds } = await useMultiFileAuthState("session_elite");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            const code = await sock.requestPairingCode(config.phoneNumber);
            console.log("CODE:", code);
        }, 4000);
    }

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        if (update.connection === "close") {
            const shouldReconnect =
                update.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
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

        const body =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            "";

        const getAdmin = async () => {
            if (!isGroup) return false;
            const meta = await sock.groupMetadata(from);
            const botId = sock.user.id.split(":")[0] + "@s.whatsapp.net";
            return !!meta.participants.find(p => p.id === botId)?.admin;
        };

        const getMentioned = () =>
            msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

        // ================= AUTO SYSTEMS =================

        if (isGroup) {

            // ANTILINK
            if (settings.antilink[from] && body.includes("chat.whatsapp.com")) {
                if (!(await getAdmin())) return;

                await sock.sendMessage(from, {
                    text: "🚫 Anti-Lien actif.\nLien détecté.\nSuppression du message."
                });

                await sock.sendMessage(from, { delete: msg.key });
            }

            // ANTIBOT
            if (settings.antibot[from] && msg.key.fromMe === false && msg.key.id.startsWith("BAE5")) {
                if (!(await getAdmin())) return;

                await sock.groupParticipantsUpdate(from, [sender], "remove");

                await sock.sendMessage(from, {
                    text: "🤖 Anti-Bot actif.\nBot détecté et supprimé."
                });
            }
        }

        if (!body.startsWith(config.prefix)) return;

        const args = body.slice(config.prefix.length).trim().split(/ +/g);
        const cmd = args.shift().toLowerCase();

        try {

            // ================= MENU =================

            if (cmd === "menu") {

                const menu = `
╔══════════════════════╗
        ${config.name}
╚══════════════════════╝

━━━━━━━━━━━━━━━━━━
⚔️ GESTION
━━━━━━━━━━━━━━━━━━
• .kick
• .purge
• .hidetag
• .del

━━━━━━━━━━━━━━━━━━
🛡 PROTECTION
━━━━━━━━━━━━━━━━━━
• .antilink on/off
• .antibot on/off

━━━━━━━━━━━━━━━━━━
🌑 DOMINATION
━━━━━━━━━━━━━━━━━━
• .domination
• .liberation

━━━━━━━━━━━━━━━━━━
⚙️ TECH
━━━━━━━━━━━━━━━━━━
• .vv
━━━━━━━━━━━━━━━━━━
`;

                await sock.sendMessage(from, {
                    image: { url: config.image },
                    caption: menu
                }, { quoted: msg });

                return;
            }

            // ================= DOMINATION =================

            if (cmd === "domination" && isOwner && isGroup && await getAdmin()) {
                await sock.groupSettingUpdate(from, "announcement");
                await sock.sendMessage(from, {
                    text: "🌑 DOMINATION ACTIVÉE\n 🚫SILENCE🚫 le chef veux parler."
                });
            }

            if (cmd === "liberation" && isOwner && isGroup && await getAdmin()) {
                await sock.groupSettingUpdate(from, "not_announcement");
                await sock.sendMessage(from, {
                    text: "🔓 LIBÉRATION ACTIVÉE\n KYOTAKA vous donne une chance."
                });
            }

            // ================= GESTION =================

            if (cmd === "kick" && isOwner && isGroup && await getAdmin()) {
                const user = getMentioned();
                if (user) {
                    await sock.groupParticipantsUpdate(from, [user], "remove");
                    await sock.sendMessage(from, { text: "👤 VAS JOUER LA BAS." });
                }
            }

            if (cmd === "purge" && isOwner && isGroup && await getAdmin()) {
                const meta = await sock.groupMetadata(from);
                const members = meta.participants.filter(p => !p.admin).map(p => p.id);
                await sock.groupParticipantsUpdate(from, members, "remove");
                await sock.sendMessage(from, { text: "🧹 Purge exécutée LE VODE EST UNE ARME ." });
            }

            if (cmd === "hidetag" && isGroup) {
                const meta = await sock.groupMetadata(from);
                const members = meta.participants.map(p => p.id);
                await sock.sendMessage(from, {
                    text: args.join(" ") || "Annonce",
                    mentions: members
                });
            }

            if (cmd === "del" && isOwner) {
                await sock.sendMessage(from, { delete: msg.key });
            }

            // ================= PROTECTION =================

            if (cmd === "antilink" && isOwner && isGroup) {
                if (args[0] === "on") {
                    settings.antilink[from] = true;
                    await sock.sendMessage(from, { text: "🛡 Anti-Lien activé." });
                } else {
                    settings.antilink[from] = false;
                    await sock.sendMessage(from, { text: "❌ Anti-Lien désactivé." });
                }
            }

            if (cmd === "antibot" && isOwner && isGroup) {
                if (args[0] === "on") {
                    settings.antibot[from] = true;
                    await sock.sendMessage(from, { text: "🤖 Anti-Bot activé." });
                } else {
                    settings.antibot[from] = false;
                    await sock.sendMessage(from, { text: "❌ Anti-Bot désactivé." });
                }
            }

            // ================= VV =================

            if (cmd === "vv") {

                const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;

                if (!quoted) return;

                const type = Object.keys(quoted)[0];
                const stream = await downloadContentFromMessage(
                    quoted[type],
                    type.replace("Message", "")
                );

                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }

                await sock.sendMessage(from, {
                    [type.replace("Message", "")]: buffer,
                    caption: "👁 L’OMBRE EST SOUS LA LUMIÈRE."
                });
            }

        } catch (err) {
            console.log("Erreur:", err);
        }

    });

}

start();
