const { default: makeWASocket, useMultiFileAuthState, delay, downloadContentFromMessage, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require("pino");
const http = require("http");

const config = {
    owner: "243986860268",
    phoneNumber: "243986860268",
    name: "AYANOKOJI-BOT",
    chef: "Kiyotaka Ayanokoji",
    prefix: ".",
    image: "https://i.supaimg.com/ba0cda0b-0be1-4bc3-b8c9-c0f903bcc6bf/cee23d05-8cd3-49de-b6ee-8df91763633a.jpg"
};

// Serveur de maintien Render
const port = process.env.PORT || 3000;
http.createServer((req, res) => { res.writeHead(200); res.end('Elite System Active'); }).listen(port);

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('session_elite');
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

        const getAdmin = async () => {
            if (!isGroup) return false;
            const meta = await sock.groupMetadata(from);
            return !!meta.participants.find(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net')?.admin;
        };

        try {
            if (isOwner) await sock.sendMessage(from, { react: { text: "🌑", key: msg.key } });

            switch (cmd) {
                case 'menu':
                case 'help':
                    const menu = `╭━━━〔 *${config.name}* 〕━━━┈⊷
┃ 👤 *Maître :* ${config.chef}
╰━━━━━━━━━━━━━━━━━━┈⊷

 ⚡ *SECTION : GESTION*
 ━━━━━━━━━━━━━━━
 ϟ .promote
 ϟ .demote
 ϟ .kick
 ϟ .purge
 ϟ .tagadmin
 ϟ .del
 ϟ .block
 ϟ .unblock
 ━━━━━━━━━━━━━━━

 🛡️ *SECTION : PROTECTION*
 ━━━━━━━━━━━━━━━
 ϟ .antilink
 ϟ .antibot
 ϟ .welcome
 ϟ .antivv
 ━━━━━━━━━━━━━━━

 🌑 *SECTION : DOMINATION*
 ━━━━━━━━━━━━━━━
 ϟ .domination
 ϟ .liberation
 ϟ .hidetag
 ϟ .setname
 ϟ .setdesc
 ━━━━━━━━━━━━━━━

 🎭 *SECTION : TECHNIQUE*
 ━━━━━━━━━━━━━━━
 ϟ .owner
 ϟ .vv
 ϟ .ping
 ϟ .runtime
 ϟ .speed
 ━━━━━━━━━━━━━━━

 🎲 *SECTION : LOISIR*
 ━━━━━━━━━━━━━━━
 ϟ .love
 ϟ .quote
 ϟ .say
 ϟ .insulte
 ϟ .weather
 ━━━━━━━━━━━━━━━
 *BY DARK ZEN SYSTEM*`;
                    await sock.sendMessage(from, { image: { url: config.image }, caption: menu }, { quoted: msg });
                    break;

                case 'owner':
                case 'honneur':
                    const bio = `╭━━━〔 *BIOGRAPHIE* 〕━━━┈⊷
┃ 👤 *Nom :* Kiyotaka Ayanokoji
┃ 🌑 *Statut :* Leader Élite
╰━━━━━━━━━━━━━━━━━━┈⊷`;
                    await sock.sendMessage(from, { image: { url: config.image }, caption: bio }, { quoted: msg });
                    break;

                case 'ping': await sock.sendMessage(from, { text: "🚀 *Système réactif.*" }); break;

                case 'domination':
                    if (isOwner && isGroup) {
                        if (await getAdmin()) {
                            await sock.groupSettingUpdate(from, 'announcement');
                            await sock.sendMessage(from, { text: "🌑 *Le groupe est maintenant sous contrôle total (Fermé).*"});
                        } else {
                            await sock.sendMessage(from, { text: "❌ *Erreur :* Donnez les droits admin au bot."});
                        }
                    }
                    break;

                case 'liberation':
                    if (isOwner && isGroup && await getAdmin()) {
                        await sock.groupSettingUpdate(from, 'not_announcement');
                        await sock.sendMessage(from, { text: "🔓 *Le groupe est libéré (Ouvert).* "});
                    }
                    break;

                case 'hidetag':
                    if (isOwner && isGroup) {
                        const meta = await sock.groupMetadata(from);
                        await sock.sendMessage(from, { text: arg.join(' ') || 'Attention !', mentions: meta.participants.map(a => a.id) });
                    }
                    break;

                case 'vv':
                    const q = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                    if (q) {
                        const type = Object.keys(q)[0];
                        const stream = await downloadContentFromMessage(q[type], type.replace('Message', ''));
                        let buffer = Buffer.from([]);
                        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                        await sock.sendMessage(from, { [type.replace('Message', '')]: buffer, caption: "🌑 *Vue unique extraite.*" });
                    }
                    break;

                case 'kick':
                    if (isOwner && isGroup && await getAdmin()) {
                        let target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message.extendedTextMessage?.contextInfo?.participant;
                        if (target) await sock.groupParticipantsUpdate(from, [target], 'remove');
                    }
                    break;
                
                case 'say': await sock.sendMessage(from, { text: arg.join(' ') }); break;
            }
        } catch (e) { console.log("Erreur :", e); }
    });
}
start();
