const { default: makeWASocket, useMultiFileAuthState, delay, downloadContentFromMessage, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require("pino");
const http = require("http");

const config = {
    owner: "243986860268",
    phoneNumber: "243986860268",
    name: "AYANOKOJI-BOT",
    chef: "Kiyotaka Ayanokoji",
    section: "Classroom of the Elite",
    prefix: ".",
    image: "https://i.supaimg.com/ba0cda0b-0be1-4bc3-b8c9-c0f903bcc6bf/cee23d05-8cd3-49de-b6ee-8df91763633a.jpg"
};

// Serveur pour Render
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('System Online');
}).listen(port);

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('session_elite');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        generateHighQualityLinkPreview: false
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            let code = await sock.requestPairingCode(config.phoneNumber);
            console.log(`\n\n🌑 CODE DE CONNEXION : ${code}\n\n`);
        }, 5000);
    }

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (u) => { if (u.connection === 'close') start(); });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.remoteJid === 'status@broadcast' || msg.message.protocolMessage) return;

        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        const sender = msg.key.participant || msg.key.remoteJid;
        const isOwner = sender.includes(config.owner) || msg.key.fromMe;
        const body = (msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "").trim();

        if (!body.startsWith(config.prefix)) return;
        const arg = body.slice(config.prefix.length).trim().split(/ +/g);
        const cmd = arg.shift().toLowerCase();

        // Gestionnaire de permissions et d'erreurs
        const checkAdmin = async () => {
            if (!isGroup) {
                await sock.sendMessage(from, { text: "❌ *Erreur :* Cette commande est réservée aux groupes." });
                return false;
            }
            const metadata = await sock.groupMetadata(from);
            const me = metadata.participants.find(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net');
            if (!me.admin) {
                await sock.sendMessage(from, { text: "❌ *Erreur :* Je dois être administrateur pour exécuter cela." });
                return false;
            }
            return true;
        };

        try {
            if (isOwner) await sock.sendMessage(from, { react: { text: "🌑", key: msg.key } });

            switch (cmd) {
                case 'menu':
                case 'help':
                    const menu = `╭━━━〔 *${config.name}* 〕━━━┈⊷
┃ 👤 *Maître :* ${config.chef}
╰━━━━━━━━━━━━━━━━━━┈⊷

*⚔️ GESTION*
ϟ .promote
ϟ .demote
ϟ .kick
ϟ .purge
ϟ .tagadmin
ϟ .del
ϟ .block
ϟ .unblock
ϟ .link
ϟ .revoke

*🛡️ PROTECTION*
ϟ .antilink
ϟ .antibot
ϟ .welcome
ϟ .antivv
ϟ .antidelete

*🌑 DOMINATION*
ϟ .domination
ϟ .liberation
ϟ .hidetag
ϟ .totext
ϟ .tovocal
ϟ .poll
ϟ .setname
ϟ .setdesc

*🎭 TECHNIQUE*
ϟ .owner
ϟ .vv
ϟ .ping
ϟ .runtime
ϟ .getpic
ϟ .groupinfo
ϟ .cls
ϟ .speed
ϟ .cpu

*🎲 FUN*
ϟ .love
ϟ .ship
ϟ .quote
ϟ .say
ϟ .insulte
ϟ .lyrics
ϟ .weather
ϟ .joke
ϟ .dare
ϟ .truth

*BY DARK ZEN SYSTEM*`;
                    await sock.sendMessage(from, { image: { url: config.image }, caption: menu }, { quoted: msg });
                    break;

                case 'owner':
                    const bio = `╭━━━〔 *DOSSIER ÉLITE* 〕━━━┈⊷
┃ 👤 *Créateur :* ${config.chef}
┃ 📚 *Section :* ${config.section}
┃ 🌑 *Statut :* Sujet n°401
╰━━━━━━━━━━━━━━━━━━┈⊷
*“Peu importe la méthode, tant que je gagne à la fin.”*`;
                    await sock.sendMessage(from, { image: { url: config.image }, caption: bio }, { quoted: msg });
                    break;

                case 'ping': 
                    await sock.sendMessage(from, { text: "🚀 *Vitesse de calcul : 0.01ms*" }); 
                    break;

                case 'purge':
                case 'kick':
                case 'promote':
                case 'demote':
                    if (!isOwner) return;
                    if (await checkAdmin()) {
                        let target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message.extendedTextMessage?.contextInfo?.participant;
                        if (cmd === 'purge') {
                            const mt = await sock.groupMetadata(from);
                            for (let p of mt.participants) { if (!p.admin) { await delay(300); await sock.groupParticipantsUpdate(from, [p.id], "remove"); } }
                        } else if (target) {
                            await sock.groupParticipantsUpdate(from, [target], cmd === 'kick' ? 'remove' : cmd);
                        }
                    }
                    break;

                case 'hidetag':
                    if (isOwner && await checkAdmin()) {
                        const meta = await sock.groupMetadata(from);
                        await sock.sendMessage(from, { text: arg.join(' '), mentions: meta.participants.map(a => a.id) });
                    }
                    break;

                case 'vv':
                    const q = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                    if (q) {
                        const type = Object.keys(q)[0];
                        const stream = await downloadContentFromMessage(q[type], type.replace('Message', ''));
                        let buffer = Buffer.from([]);
                        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                        await sock.sendMessage(from, { [type.replace('Message', '')]: buffer, caption: "🌑 *Secret révélé.*" });
                    }
                    break;

                case 'say': 
                    await sock.sendMessage(from, { text: arg.join(' ') }); 
                    break;
            }
        } catch (e) { console.log(e); }
    });
}
start();
