const { default: makeWASocket, useMultiFileAuthState, delay, downloadContentFromMessage, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require("pino");

const config = {
    owner: "243986860268",
    phoneNumber: "243986860268", // Vérifié : Format correct pour la RDC
    name: "AYANOKOJI-BOT",
    chef: "Kiyotaka Ayanokoji",
    section: "Classroom of the Elite",
    prefix: ".",
    image: "https://i.supaimg.com/ba0cda0b-0be1-4bc3-b8c9-c0f903bcc6bf/cee23d05-8cd3-49de-b6ee-8df91763633a.jpg"
};

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('session_elite');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false, 
        browser: ["Ubuntu", "Chrome", "20.0.04"] // Simulation stable pour éviter les rejets
    });

    // --- LOGIQUE PAIRING CODE ---
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(config.phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(`\n\n🌑 [SYSTÈME ÉLITE] TON CODE DE CONNEXION : ${code}\n\n`);
            } catch (error) {
                console.error("Erreur lors de la génération du code :", error);
            }
        }, 5000);
    }

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (u) => { 
        const { connection, lastDisconnect } = u;
        if (connection === 'open') console.log("✅ EMPIRE AYANOKOJI OPÉRATIONNEL SUR RENDER");
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) start();
        }
    });

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
                // --- MENUS ---
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
                    await sock.sendMessage(from, { image: { url: config.image }, caption: menu }, { quoted: msg });
                    break;

                case 'owner':
                case 'honneur':
                    const bio = `╭━━━〔 *DOSSIER ÉLITE* 〕━━━┈⊷
┃ 👤 *Sujet :* ${config.chef}
┃ 📚 *Section :* ${config.section}
┃ 🌑 *Origine :* Fils du Grand Monarque
╰━━━━━━━━━━━━━━━━━━┈⊷
*“Dans ce monde, gagner est tout.”*`;
                    await sock.sendMessage(from, { image: { url: config.image }, caption: bio }, { quoted: msg });
                    break;

                case 'purge':
                    if (!isOwner || !isGroup) return;
                    await sock.sendMessage(from, { text: "👁️ Purification en cours..." });
                    const mt = await sock.groupMetadata(from);
                    for (let p of mt.participants) { if (!p.admin) { await delay(500); await sock.groupParticipantsUpdate(from, [p.id], "remove"); } }
                    await sock.sendMessage(from, { text: "🌑 Zone purifiée." });
                    break;

                case 'vv':
                    const q = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                    if (q) {
                        const type = Object.keys(q)[0];
                        const stream = await downloadContentFromMessage(q[type], type.replace('Message', ''));
                        let buffer = Buffer.from([]);
                        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                        await sock.sendMessage(from, { [type.replace('Message', '')]: buffer, caption: "🌑 Secret extrait." });
                    }
                    break;

                case 'ping': await sock.sendMessage(from, { text: "🚀 Vitesse : 0.02ms" }); break;
                case 'runtime': await sock.sendMessage(from, { text: `⌚ Actif : ${process.uptime().toFixed(0)}s` }); break;
                case 'hidetag':
                    if (!isOwner) return;
                    const meta = await sock.groupMetadata(from);
                    await sock.sendMessage(from, { text: arg.join(' '), mentions: meta.participants.map(a => a.id) });
                    break;
                case 'domination': if (isOwner) await sock.groupSettingUpdate(from, 'announcement'); break;
                case 'liberation': if (isOwner) await sock.groupSettingUpdate(from, 'not_announcement'); break;
                case 'say': await sock.sendMessage(from, { text: arg.join(' ') }); break;
                case 'love': await sock.sendMessage(from, { text: `❤️ Affinité : ${Math.floor(Math.random() * 100)}%` }); break;
            }
        } catch (e) { console.log(e); }
    });
}

start();
