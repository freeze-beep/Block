const { default: makeWASocket, useMultiFileAuthState, delay, downloadContentFromMessage, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require('fs');
const qrcode = require("qrcode-terminal");

const config = {
    owner: "243986860268",
    phoneNumber: "243986860268",
    name: "AYANOKOJI-BOT",
    chef: "Kiyotaka Ayanokoji",
    section: "Classroom of the Elite",
    prefix: "."
};

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('session_elite');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        browser: ["Ayanokoji-V2", "Chrome", "1.0.0"]
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
        if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;

        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        const sender = msg.key.participant || msg.key.remoteJid;
        const isOwner = sender.includes(config.owner) || msg.key.fromMe;
        const body = (msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "").trim();

        if (!body.startsWith(config.prefix)) return;
        const arg = body.slice(config.prefix.length).trim().split(/ +/g);
        const cmd = arg.shift().toLowerCase();

        try {
            if (isOwner) await sock.sendMessage(from, { react: { text: "🌑", key: msg.key } });

            switch (cmd) {
                case 'menu':
                case 'help':
                    const menu = `╭━━━〔 *${config.name}* 〕━━━┈⊷
┃ 👤 *Maître :* ${config.chef}
┃ 📚 *Section :* ${config.section}
╰━━━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 ⚔️ GESTION 〕━━━┈⊷
┃ ϟ .promote
┃ ϟ .demote
┃ ϟ .kick
┃ ϟ .purge
┃ ϟ .tagadmin
┃ ϟ .del
┃ ϟ .block
┃ ϟ .unblock
╰━━━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 🛡️ PROTECTION 〕━━━┈⊷
┃ ϟ .antilink
┃ ϟ .antibot
┃ ϟ .welcome
╰━━━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 🌑 DOMINATION 〕━━━┈⊷
┃ ϟ .domination
┃ ϟ .liberation
┃ ϟ .hidetag
┃ ϟ .totext
┃ ϟ .tovocal
╰━━━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 🎭 TECHNIQUE 〕━━━┈⊷
┃ ϟ .owner
┃ ϟ .vv
┃ ϟ .ping
┃ ϟ .runtime
┃ ϟ .getpic
┃ ϟ .groupinfo
┃ ϟ .cls
╰━━━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 🎲 FUN 〕━━━┈⊷
┃ ϟ .love
┃ ϟ .ship
┃ ϟ .quote
┃ ϟ .say
┃ ϟ .insulte
┃ ϟ .lyrics
┃ ϟ .weather
╰━━━━━━━━━━━━━━━━━━┈⊷
   *BY DARK ZEN SYSTEM*`;

                    if (fs.existsSync('./media/menu.jpg')) {
                        await sock.sendMessage(from, { image: fs.readFileSync('./media/menu.jpg'), caption: menu }, { quoted: msg });
                    }
                    if (fs.existsSync('./media/zq.mp3')) {
                        await sock.sendMessage(from, { audio: fs.readFileSync('./media/zq.mp3'), mimetype: 'audio/mp4', ptt: true }, { quoted: msg });
                    }
                    break;

                case 'owner':
                    const bio = `╭━━━〔 *DOSSIER ÉLITE* 〕━━━┈⊷
┃ 👤 *Sujet :* ${config.chef}
┃ 📚 *Section :* ${config.section}
┃ 🌑 *Origine :* Fils du Grand Monarque
┃ 🎵 *Signature :* ZQ
╰━━━━━━━━━━━━━━━━━━┈⊷`;
                    if (fs.existsSync('./media/menu.jpg')) {
                        await sock.sendMessage(from, { image: fs.readFileSync('./media/menu.jpg'), caption: bio }, { quoted: msg });
                    }
                    break;

                case 'purge':
                    if (!isOwner || !isGroup) return;
                    await sock.sendMessage(from, { text: "👁️ *Purification en cours...*" });
                    const mt = await sock.groupMetadata(from);
                    for (let p of mt.participants) { if (!p.admin) { await delay(450); await sock.groupParticipantsUpdate(from, [p.id], "remove"); } }
                    await sock.sendMessage(from, { text: "🌑 *Zone purifiée.*" });
                    break;

                case 'promote':
                case 'demote':
                    if (!isOwner || !isGroup) return;
                    let target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message.extendedTextMessage?.contextInfo?.participant;
                    await sock.groupParticipantsUpdate(from, [target], cmd);
                    await sock.sendMessage(from, { text: `✅ Mise à jour terminée.` });
                    break;

                case 'vv':
                    const q = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                    if (q) {
                        const type = Object.keys(q)[0];
                        const stream = await downloadContentFromMessage(q[type], type.replace('Message', ''));
                        let buffer = Buffer.from([]);
                        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                        await sock.sendMessage(from, { [type.replace('Message', '')]: buffer, caption: "🌑 *Secret extrait.*" });
                    }
                    break;

                case 'ping': await sock.sendMessage(from, { text: "🚀 *Système réactif.*" }); break;
                case 'hidetag':
                    if (!isOwner) return;
                    const meta = await sock.groupMetadata(from);
                    await sock.sendMessage(from, { text: arg.join(' '), mentions: meta.participants.map(a => a.id) });
                    break;
                case 'domination': if (isOwner) await sock.groupSettingUpdate(from, 'announcement'); break;
                case 'liberation': if (isOwner) await sock.groupSettingUpdate(from, 'not_announcement'); break;
            }
        } catch (e) { console.log(e); }
    });
}

start();

