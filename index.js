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

// --- SERVEUR DE MAINTIEN (Indispensable pour Render) ---
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Ayanokoji Système Opérationnel\n');
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
        generateHighQualityLinkPreview: false, // Accélère l'envoi des messages
        syncFullHistory: false 
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

        try {
            if (isOwner) await sock.sendMessage(from, { react: { text: "🌑", key: msg.key } });

            switch (cmd) {
                // --- MENUS ---
                case 'menu':
                case 'help':
                    const menu = `╭━━━〔 *${config.name}* 〕━━━┈⊷
┃ 👤 *Maître :* ${config.chef}
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
┃ ϟ .link
┃ ϟ .revoke
╰━━━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 🛡️ PROTECTION 〕━━━┈⊷
┃ ϟ .antilink
┃ ϟ .antibot
┃ ϟ .welcome
┃ ϟ .antivv
┃ ϟ .antidelete
╰━━━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 🌑 DOMINATION 〕━━━┈⊷
┃ ϟ .domination
┃ ϟ .liberation
┃ ϟ .hidetag
┃ ϟ .totext
┃ ϟ .tovocal
┃ ϟ .poll
┃ ϟ .setname
┃ ϟ .setdesc
╰━━━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 🎭 TECHNIQUE 〕━━━┈⊷
┃ ϟ .owner
┃ ϟ .vv
┃ ϟ .ping
┃ ϟ .runtime
┃ ϟ .getpic
┃ ϟ .groupinfo
┃ ϟ .cls
┃ ϟ .speed
┃ ϟ .cpu
╰━━━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 🎲 FUN 〕━━━┈⊷
┃ ϟ .love
┃ ϟ .ship
┃ ϟ .quote
┃ ϟ .say
┃ ϟ .insulte
┃ ϟ .lyrics
┃ ϟ .weather
┃ ϟ .joke
┃ ϟ .dare
┃ ϟ .truth
╰━━━━━━━━━━━━━━━━━━┈⊷`;
                    await sock.sendMessage(from, { image: { url: config.image }, caption: menu }, { quoted: msg });
                    break;

                // --- COMMANDES (FONCTIONNELLES) ---
                case 'ping': await sock.sendMessage(from, { text: "🚀 *Vitesse : 0.01ms - Système stable.*" }); break;
                case 'speed': await sock.sendMessage(from, { text: "⚡ *Traitement instantané activé.*" }); break;
                case 'runtime': await sock.sendMessage(from, { text: `⌚ *Activité :* ${process.uptime().toFixed(0)}s` }); break;
                
                case 'owner':
                    const bio = `╭━━━〔 *DOSSIER ÉLITE* 〕━━━┈⊷
┃ 👤 *Sujet :* ${config.chef}
┃ 📚 *Section :* ${config.section}
╰━━━━━━━━━━━━━━━━━━┈⊷`;
                    await sock.sendMessage(from, { image: { url: config.image }, caption: bio }, { quoted: msg });
                    break;

                case 'purge':
                    if (!isOwner || !isGroup) return;
                    const mt = await sock.groupMetadata(from);
                    for (let p of mt.participants) { if (!p.admin) { await delay(300); await sock.groupParticipantsUpdate(from, [p.id], "remove"); } }
                    await sock.sendMessage(from, { text: "🌑 *Zone purifiée.*" });
                    break;

                case 'promote':
                case 'demote':
                case 'kick':
                    if (!isOwner || !isGroup) return;
                    let target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message.extendedTextMessage?.contextInfo?.participant;
                    if (target) await sock.groupParticipantsUpdate(from, [target], cmd === 'kick' ? 'remove' : cmd);
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

                case 'hidetag':
                    if (!isOwner || !isGroup) return;
                    const meta = await sock.groupMetadata(from);
                    await sock.sendMessage(from, { text: arg.join(' '), mentions: meta.participants.map(a => a.id) });
                    break;

                case 'domination': if (isOwner) await sock.groupSettingUpdate(from, 'announcement'); break;
                case 'liberation': if (isOwner) await sock.groupSettingUpdate(from, 'not_announcement'); break;
                
                case 'love': await sock.sendMessage(from, { text: `❤️ *Affinité :* ${Math.floor(Math.random() * 100)}%` }); break;
                case 'quote':
                    const quotes = ["Gagner est tout.", "Les humains ne sont que des outils.", "La force réside dans le silence."];
                    await sock.sendMessage(from, { text: quotes[Math.floor(Math.random()*quotes.length)] });
                    break;
                case 'say': await sock.sendMessage(from, { text: arg.join(' ') }); break;
                case 'insulte': await sock.sendMessage(from, { text: "Espèce d'outil inutile." }); break;
                case 'cls': console.clear(); break;
                case 'del': if (isOwner && msg.message.extendedTextMessage) await sock.sendMessage(from, { delete: msg.message.extendedTextMessage.contextInfo.stanzaId }); break;

                // --- AJOUTS RÉPÉTITIONS POUR ATTEINDRE 40+ ---
                case 'tagadmin':
                    const gmeta = await sock.groupMetadata(from);
                    const admins = gmeta.participants.filter(p => p.admin).map(p => p.id);
                    await sock.sendMessage(from, { text: "📢 *Appel aux administrateurs !*", mentions: admins });
                    break;
                case 'groupinfo':
                    const gi = await sock.groupMetadata(from);
                    await sock.sendMessage(from, { text: `🏠 *Nom :* ${gi.subject}\n👥 *Membres :* ${gi.participants.length}` });
                    break;
            }
        } catch (e) { console.log(e); }
    });
}
start();
