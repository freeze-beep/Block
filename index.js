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

// ================= KEEP ALIVE =================

const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Elite System Active");
}).listen(port);

// ================= START =================

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
            console.log("\nCODE :", code, "\n");
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

        if (!body.startsWith(config.prefix)) return;

        const args = body.slice(config.prefix.length).trim().split(/ +/g);
        const cmd = args.shift().toLowerCase();

        const getAdmin = async () => {
            if (!isGroup) return false;
            const meta = await sock.groupMetadata(from);
            const botId = sock.user.id.split(":")[0] + "@s.whatsapp.net";
            return !!meta.participants.find(p => p.id === botId)?.admin;
        };

        const getMentioned = () =>
            msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

        try {

            // ================= MENU =================

            if (cmd === "menu" || cmd === "help") {

                const menu = `
╔══════════════════════╗
      ${config.name}
╚══════════════════════╝

⚔️ GESTION
• .promote
• .demote
• .kick
• .purge
• .tagadmin
• .del
• .block
• .unblock
|===============|
🛡 PROTECTION
• .antilink
• .antibot
• .welcome
• .antivv
|===============|
🌑 DOMINATION
• .domination
• .liberation
• .hidetag
• .setname
• .setdesc
|===============|
⚙️ TECH
• .owner
• .vv
• .ping
• .runtime
• .speed
|===============|
🎭 LOISIR
• .love
• .quote
• .say
• .insulte
• .weather
`;

                await sock.sendMessage(from, {
                    image: { url: config.image },
                    caption: menu
                }, { quoted: msg });

                return;
            }

            // ================= GROUP =================

            if (cmd === "promote" && isOwner && isGroup && await getAdmin()) {
                const user = getMentioned();
                if (user) await sock.groupParticipantsUpdate(from, [user], "promote");
            }

            if (cmd === "demote" && isOwner && isGroup && await getAdmin()) {
                const user = getMentioned();
                if (user) await sock.groupParticipantsUpdate(from, [user], "demote");
            }

            if (cmd === "kick" && isOwner && isGroup && await getAdmin()) {
                const user = getMentioned();
                if (user) await sock.groupParticipantsUpdate(from, [user], "remove");
            }

            if (cmd === "purge" && isOwner && isGroup && await getAdmin()) {
                const meta = await sock.groupMetadata(from);
                const members = meta.participants.filter(p => !p.admin).map(p => p.id);
                await sock.groupParticipantsUpdate(from, members, "remove");
            }

            if (cmd === "tagadmin" && isGroup) {
                const meta = await sock.groupMetadata(from);
                const admins = meta.participants.filter(p => p.admin).map(p => p.id);
                await sock.sendMessage(from, { text: "Admins du groupe", mentions: admins });
            }

            if (cmd === "domination" && isOwner && isGroup && await getAdmin()) {
                await sock.groupSettingUpdate(from, "announcement");
            }

            if (cmd === "liberation" && isOwner && isGroup && await getAdmin()) {
                await sock.groupSettingUpdate(from, "not_announcement");
            }

            if (cmd === "setname" && isOwner && isGroup && await getAdmin()) {
                await sock.groupUpdateSubject(from, args.join(" "));
            }

            if (cmd === "setdesc" && isOwner && isGroup && await getAdmin()) {
                await sock.groupUpdateDescription(from, args.join(" "));
            }

            if (cmd === "hidetag" && isGroup) {
                const meta = await sock.groupMetadata(from);
                const members = meta.participants.map(p => p.id);
                await sock.sendMessage(from, { text: args.join(" ") || "Attention", mentions: members });
            }

            // ================= OWNER =================

            if (cmd === "block" && isOwner) {
                const user = getMentioned();
                if (user) await sock.updateBlockStatus(user, "block");
            }

            if (cmd === "unblock" && isOwner) {
                const user = getMentioned();
                if (user) await sock.updateBlockStatus(user, "unblock");
            }

            if (cmd === "del" && isOwner) {
                await sock.sendMessage(from, { delete: msg.key });
            }

            // ================= TECH =================

            if (cmd === "ping")
                await sock.sendMessage(from, { text: "🚀 Online." });

            if (cmd === "runtime")
                await sock.sendMessage(from, { text: `⏳ ${Math.floor(process.uptime())} sec` });

            if (cmd === "speed")
                await sock.sendMessage(from, { text: "⚡ Ultra rapide." });

            if (cmd === "owner")
                await sock.sendMessage(from, { text: `👑 Owner : ${config.owner}` });

            // ================= FUN =================

            if (cmd === "love")
                await sock.sendMessage(from, { text: `❤️ ${Math.floor(Math.random()*100)}%` });

            if (cmd === "quote")
                await sock.sendMessage(from, { text: "« L’esprit domine la force. »" });

            if (cmd === "insulte")
                await sock.sendMessage(from, { text: "Même ton ombre hésite à te suivre fdp." });

            if (cmd === "say")
                await sock.sendMessage(from, { text: args.join(" ") });

            if (cmd === "weather")
                await sock.sendMessage(from, { text: "🌤 API non configurée." });

        } catch (err) {
            console.log("Erreur :", err);
        }

    });

}

start();
