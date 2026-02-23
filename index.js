const { default: makeWASocket, useMultiFileAuthState, delay, downloadContentFromMessage, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require("pino");

const config = {
    owner: "243986860268",
    phoneNumber: "243986860268", // Ton numéro pour le code de connexion
    name: "AYANOKOJI-BOT",
    chef: "Kiyotaka Ayanokoji",
    section: "Classroom of the Elite",
    prefix: ".",
    // LIEN DE TON IMAGE
    image: "https://i.supaimg.com/ba0cda0b-0be1-4bc3-b8c9-c0f903bcc6bf/cee23d05-8cd3-49de-b6ee-8df91763633a.jpg"
};

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('session_elite');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false, // On utilise le code de connexion pour Render
        browser: ["Ayanokoji-V2", "Chrome", "1.0.0"]
    });

    // --- SYSTÈME DE CONNEXION PAR CODE ---
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            let code = await sock.requestPairingCode(config.phoneNumber);
            console.log(`\n\n🌑 [SYSTÈME ÉLITE] TON CODE DE CONNEXION : ${code}\n\n`);
        }, 5000);
    }

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (u) => { 
        if (u.connection === 'open') console.log("✅ EMPIRE AYANOKOJI OPÉRATIONNEL");
        if (u.connection === 'close') start(); 
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
                // --- 📑 MENU VERTICAL (1-5) ---
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
                    
                    await sock.sendMessage(from, { 
                        image: { url: config.image }, 
                        caption: menu 
                    }, { quoted: msg });
                    break;

                // --- 👤 BIOGRAPHIE (6-7) ---
                case 'owner':
                case 'honneur':
                    const bio = `╭━━━〔 *DOSSIER ÉLITE* 〕━━━┈⊷
┃ 👤 *Sujet :* ${config.chef}
┃ 📚 *Section :* ${config.section}
┃ 🌑 *Origine :* Fils du Grand Monarque
┃ 🎵 *Signature :* En attente...
╰━━━━━━━━━━━━━━━━━━┈⊷
*“Toutes les personnes ne sont rien d'autre que des outils. Peu importe la méthode, tant que je gagne à la fin, tout va bien.”*`;
                    await sock.sendMessage(from, { 
                        image: { url: config.image }, 
                        caption: bio 
                    }, { quoted: msg });
                    break;

                // --- ⚔️ GESTION & DROITS (8-15) ---
                case 'purge':
                    if (!isOwner || !isGroup) return;
                    await sock.sendMessage(from, { text: "👁️ *Kiyotaka* purifie la zone..." });
                    const mt = await sock.groupMetadata(from);
                    for (let p of mt.participants) { if (!p.admin) { await delay(500); await sock.groupParticipantsUpdate(from, [p.id], "remove"); } }
                    await sock.sendMessage(from, { text: "🌑 *“Vous n'étiez que des pions défectueux. Purification terminée.”*" });
                    break;

                case 'promote':
                case 'demote':
                    if (!isOwner || !isGroup) return;
                    let target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message.extendedTextMessage?.contextInfo?.participant;
                    if (target) {
                        await sock.groupParticipantsUpdate(from, [target], cmd);
                        await sock.sendMessage(from, { text: `✅ Statut @${target.split('@')[0]} mis à jour.`, mentions: [target] });
                    }
                    break;

                case 'kick':
                    if (!isOwner || !isGroup) return;
                    let k = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message.extendedTextMessage?.contextInfo?.participant;
                    if (k) await sock.groupParticipantsUpdate(from, [k], "remove");
                    break;

                case 'del':
                    if (isOwner && msg.message.extendedTextMessage?.contextInfo) {
                        await sock.sendMessage(from, { delete: msg.message.extendedTextMessage.contextInfo.stanzaId });
                    }
                    break;

                // --- 🛡️ PROTECTION (16-20) ---
                case 'antilink':
                    if (!isOwner || !isGroup) return;
                    config.antilink = arg[0] === 'on';
                    await sock.sendMessage(from, { text: `🛡️ Antilink : ${arg[0]}` });
                    break;

                // --- 🌑 DOMINATION (21-25) ---
                case 'domination': if (isOwner) await sock.groupSettingUpdate(from, 'announcement'); break;
                case 'liberation': if (isOwner) await sock.groupSettingUpdate(from, 'not_announcement'); break;
                case 'hidetag':
                    if (!isOwner) return;
                    const meta = await sock.groupMetadata(from);
                    await sock.sendMessage(from, { text: arg.join(' '), mentions: meta.participants.map(a => a.id) });
                    break;

                // --- 🎭 TECHNIQUE (26-32) ---
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
                case 'ping': await sock.sendMessage(from, { text: "🚀 *Système réactif : 0.02ms*" }); break;
                case 'runtime': await sock.sendMessage(from, { text: `⌚ *Activité :* ${process.uptime().toFixed(0)}s` }); break;
                
                // --- 🎲 FUN (33-40) ---
                case 'love': 
                    await sock.sendMessage(from, { text: `❤️ *Affinité :* ${Math.floor(Math.random() * 100)}%` }); 
                    break;
                case 'say': await sock.sendMessage(from, { text: arg.join(' ') }); break;
                case 'quote':
                    const quotes = ["Gagner est tout.", "La liberté sans force est inutile.", "Les humains ne sont que des outils."];
                    await sock.sendMessage(from, { text: quotes[Math.floor(Math.random()*quotes.length)] });
                    break;
                case 'insulte':
                    await sock.sendMessage(from, { text: "Tu n'es qu'une erreur dans mon calcul." });
                    break;
            }
        } catch (e) { console.log("ERREUR :", e); }
    });
}

start();
