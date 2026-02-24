const { default: makeWASocket, useMultiFileAuthState, delay, downloadContentFromMessage, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require("pino");
const http = require("http");
const fs = require("fs");

const config = {
    owner: "243986860268",
    phoneNumber: "243986860268",
    name: "AYANOKOJI-BOT",
    chef: "Kiyotaka Ayanokoji",
    prefix: ".",
    image: "https://i.supaimg.com/ba0cda0b-0be1-4bc3-b8c9-c0f903bcc6bf/cee23d05-8cd3-49de-b6ee-8df91763633a.jpg"
};

// Configuration des groupes
let groupSettings = {};

// Charger les paramètres des groupes
if (fs.existsSync('group_settings.json')) {
    groupSettings = JSON.parse(fs.readFileSync('group_settings.json'));
}

// Sauvegarder les paramètres des groupes
function saveGroupSettings() {
    fs.writeFileSync('group_settings.json', JSON.stringify(groupSettings, null, 2));
}

// Serveur de maintien Render
const port = process.env.PORT || 3000;
http.createServer((req, res) => { res.writeHead(200); res.end('Elite System Active'); }).listen(port);

// Fonction pour obtenir le temps d'exécution
function getRuntime() {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

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
    sock.ev.on('connection.update', (u) => { 
        if (u.connection === 'close') start(); 
        if (u.connection === 'open') console.log('🌑 Bot connecté!');
    });

    // Gestion des messages
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.remoteJid === 'status@broadcast' || msg.message.protocolMessage) return;

        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        const sender = msg.key.participant || msg.key.remoteJid;
        const isOwner = sender.includes(config.owner) || msg.key.fromMe;
        const body = (msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "").trim();

        // Initialiser les paramètres du groupe si nécessaire
        if (isGroup && !groupSettings[from]) {
            groupSettings[from] = {
                antilink: false,
                antibot: false,
                welcome: false,
                antivv: false
            };
            saveGroupSettings();
        }

        // Vérifier les liens si antilink est activé
        if (isGroup && groupSettings[from]?.antilink && !isOwner) {
            const linkRegex = /(https?:\/\/[^\s]+)|(chat\.whatsapp\.com\/[^\s]+)/gi;
            if (linkRegex.test(body)) {
                await sock.sendMessage(from, { text: "❌ *Liens interdits dans ce groupe!*" });
                if (await getAdmin()) {
                    await sock.groupParticipantsUpdate(from, [sender], 'remove');
                }
                return;
            }
        }

        // Vérifier les bots si antibot est activé
        if (isGroup && groupSettings[from]?.antibot && !isOwner) {
            if (msg.key.fromMe === false && sender.includes('bot')) {
                await sock.sendMessage(from, { text: "❌ *Bots interdits dans ce groupe!*" });
                if (await getAdmin()) {
                    await sock.groupParticipantsUpdate(from, [sender], 'remove');
                }
                return;
            }
        }

        // Message de bienvenue
        if (isGroup && groupSettings[from]?.welcome && msg.messageStubType === 27) {
            const metadata = await sock.groupMetadata(from);
            const participant = msg.key.participant;
            await sock.sendMessage(from, { 
                text: `👋 *Bienvenue ${metadata.participants.find(p => p.id === participant)?.notify || 'membre'} dans ${metadata.subject}!*\n📝 *Règles:* Lisez la description du groupe.` 
            });
        }

        if (!body.startsWith(config.prefix)) return;
        const arg = body.slice(config.prefix.length).trim().split(/ +/g);
        const cmd = arg.shift().toLowerCase();

        const getAdmin = async () => {
            if (!isGroup) return false;
            const meta = await sock.groupMetadata(from);
            return !!meta.participants.find(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net')?.admin;
        };

        const getSenderAdmin = async () => {
            if (!isGroup) return false;
            const meta = await sock.groupMetadata(from);
            return !!meta.participants.find(p => p.id === sender)?.admin || isOwner;
        };

        try {
            // Réaction aux commandes
            if (isOwner) await sock.sendMessage(from, { react: { text: "🌑", key: msg.key } });

            switch (cmd) {
                // ==================== MENU PRINCIPAL ====================
                case 'menu':
                case 'help':
                    const menu = `╔══════════════════════════╗
║   🌑 *${config.name}* 🌑   
╠══════════════════════════╣
║ 👤 *Maître :* ${config.chef}
║ ⚡ *Commandes:* ${config.prefix}menu
╚══════════════════════════╝

╭━━━━━━━━━━━━━━━━━━━━╮
┃ ⚡ *GESTION DU GROUPE*
╰━━━━━━━━━━━━━━━━━━━━╯
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ • ${config.prefix}promote [@user]  ┃
┃ • ${config.prefix}demote [@user]   ┃
┃ • ${config.prefix}kick [@user]     ┃
┃ • ${config.prefix}purge <nombre>   ┃
┃ • ${config.prefix}tagadmin         ┃
┃ • ${config.prefix}del               ┃
┃ • ${config.prefix}block [@user]    ┃
┃ • ${config.prefix}unblock [@user]  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

╭━━━━━━━━━━━━━━━━━━━━╮
┃ 🛡️ *PROTECTION*
╰━━━━━━━━━━━━━━━━━━━━╯
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ • ${config.prefix}antilink <on/off> ┃
┃ • ${config.prefix}antibot <on/off>  ┃
┃ • ${config.prefix}welcome <on/off>  ┃
┃ • ${config.prefix}antivv <on/off>   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

╭━━━━━━━━━━━━━━━━━━━━╮
┃ 🌑 *DOMINATION*
╰━━━━━━━━━━━━━━━━━━━━╯
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ • ${config.prefix}domination       ┃
┃ • ${config.prefix}liberation       ┃
┃ • ${config.prefix}hidetag <texte>  ┃
┃ • ${config.prefix}setname <nom>    ┃
┃ • ${config.prefix}setdesc <desc>   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

╭━━━━━━━━━━━━━━━━━━━━╮
┃ 🎭 *TECHNIQUE*
╰━━━━━━━━━━━━━━━━━━━━╯
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ • ${config.prefix}owner            ┃
┃ • ${config.prefix}vv [répondre]    ┃
┃ • ${config.prefix}ping             ┃
┃ • ${config.prefix}runtime          ┃
┃ • ${config.prefix}speed            ┃
┃ • ${config.prefix}info             ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

╭━━━━━━━━━━━━━━━━━━━━╮
┃ 🎲 *LOISIR*
╰━━━━━━━━━━━━━━━━━━━━╯
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ • ${config.prefix}love <nom1+nom2> ┃
┃ • ${config.prefix}quote             ┃
┃ • ${config.prefix}say <texte>       ┃
┃ • ${config.prefix}insulte [@user]   ┃
┃ • ${config.prefix}weather <ville>   ┃
┃ • ${config.prefix}sticker [image]   ┃
┃ • ${config.prefix}toimg [sticker]   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

╔══════════════════════════╗
║ *BY DARK ZEN SYSTEM*     
║ *「 ELITE CLASS 」*       
╚══════════════════════════╝`;
                    
                    await sock.sendMessage(from, { 
                        image: { url: config.image }, 
                        caption: menu,
                        contextInfo: {
                            forwardingScore: 999,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363317642571163@newsletter',
                                newsletterName: 'AYANOKOJI SYSTEM',
                            }
                        }
                    }, { quoted: msg });
                    break;

                // ==================== BIOGRAPHIE ====================
                case 'owner':
                case 'honneur':
                    const bio = `╔══════════════════════════╗
║   🌑 *BIOGRAPHIE ÉLITE* 🌑   
╠══════════════════════════╣
║ 👤 *Nom :* Kiyotaka Ayanokoji
║ 🎯 *Âge :* Inconnu
║ 🏫 *Classe :* Classe D
║ 🧠 *QI :* Incalculable
║ 🌑 *Statut :* Leader Élite
║ ⚔️ *Méthode :* Manipulation
║ 🎭 *Objectif :* Domination
╠══════════════════════════╣
║ *"La victoire sans risque
║  est une victoire sans
║  gloire."*
╚══════════════════════════╝`;
                    
                    await sock.sendMessage(from, { 
                        image: { url: config.image }, 
                        caption: bio 
                    }, { quoted: msg });
                    break;

                // ==================== GESTION ====================
                case 'promote':
                    if (isGroup && await getSenderAdmin() && await getAdmin()) {
                        let target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || arg[0]?.replace('@', '') + '@s.whatsapp.net';
                        if (target) {
                            await sock.groupParticipantsUpdate(from, [target], 'promote');
                            await sock.sendMessage(from, { text: `✅ *${target.split('@')[0]} a été promu admin.*` });
                        }
                    }
                    break;

                case 'demote':
                    if (isGroup && await getSenderAdmin() && await getAdmin()) {
                        let target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || arg[0]?.replace('@', '') + '@s.whatsapp.net';
                        if (target) {
                            await sock.groupParticipantsUpdate(from, [target], 'demote');
                            await sock.sendMessage(from, { text: `✅ *${target.split('@')[0]} a été rétrogradé.*` });
                        }
                    }
                    break;

                case 'kick':
                    if (isGroup && await getSenderAdmin() && await getAdmin()) {
                        let target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message.extendedTextMessage?.contextInfo?.participant;
                        if (target) {
                            await sock.groupParticipantsUpdate(from, [target], 'remove');
                            await sock.sendMessage(from, { text: `✅ *Membre expulsé.*` });
                        }
                    }
                    break;

                case 'purge':
                    if (isGroup && await getSenderAdmin()) {
                        const amount = parseInt(arg[0]) || 50;
                        const messages = await sock.loadMessages(from, amount);
                        for (let message of messages) {
                            if (message.key.fromMe || isOwner) {
                                await sock.sendMessage(from, { delete: message.key });
                                await delay(500);
                            }
                        }
                        await sock.sendMessage(from, { text: `✅ *${amount} messages supprimés.*` });
                    }
                    break;

                case 'tagadmin':
                    if (isGroup && await getSenderAdmin()) {
                        const meta = await sock.groupMetadata(from);
                        const admins = meta.participants.filter(p => p.admin).map(a => a.id);
                        await sock.sendMessage(from, { 
                            text: `👑 *Liste des admins:*\n${admins.map(a => `@${a.split('@')[0]}`).join('\n')}`,
                            mentions: admins 
                        });
                    }
                    break;

                case 'del':
                    if (msg.message.extendedTextMessage?.contextInfo?.stanzaId) {
                        await sock.sendMessage(from, { delete: { remoteJid: from, fromMe: true, id: msg.message.extendedTextMessage.contextInfo.stanzaId, participant: sender } });
                    }
                    break;

                case 'block':
                    if (isOwner) {
                        let target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || arg[0]?.replace('@', '') + '@s.whatsapp.net';
                        if (target) {
                            await sock.updateBlockStatus(target, 'block');
                            await sock.sendMessage(from, { text: `✅ *${target.split('@')[0]} a été bloqué.*` });
                        }
                    }
                    break;

                case 'unblock':
                    if (isOwner) {
                        let target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || arg[0]?.replace('@', '') + '@s.whatsapp.net';
                        if (target) {
                            await sock.updateBlockStatus(target, 'unblock');
                            await sock.sendMessage(from, { text: `✅ *${target.split('@')[0]} a été débloqué.*` });
                        }
                    }
                    break;

                // ==================== PROTECTION ====================
                case 'antilink':
                    if (isGroup && await getSenderAdmin()) {
                        const status = arg[0]?.toLowerCase();
                        if (status === 'on' || status === 'off') {
                            groupSettings[from].antilink = status === 'on';
                            saveGroupSettings();
                            await sock.sendMessage(from, { 
                                text: `🛡️ *Antilink ${status === 'on' ? 'activé' : 'désactivé'}.*` 
                            });
                        }
                    }
                    break;

                case 'antibot':
                    if (isGroup && await getSenderAdmin()) {
                        const status = arg[0]?.toLowerCase();
                        if (status === 'on' || status === 'off') {
                            groupSettings[from].antibot = status === 'on';
                            saveGroupSettings();
                            await sock.sendMessage(from, { 
                                text: `🤖 *Antibot ${status === 'on' ? 'activé' : 'désactivé'}.*` 
                            });
                        }
                    }
                    break;

                case 'welcome':
                    if (isGroup && await getSenderAdmin()) {
                        const status = arg[0]?.toLowerCase();
                        if (status === 'on' || status === 'off') {
                            groupSettings[from].welcome = status === 'on';
                            saveGroupSettings();
                            await sock.sendMessage(from, { 
                                text: `👋 *Message de bienvenue ${status === 'on' ? 'activé' : 'désactivé'}.*` 
                            });
                        }
                    }
                    break;

                case 'antivv':
                    if (isGroup && await getSenderAdmin()) {
                        const status = arg[0]?.toLowerCase();
                        if (status === 'on' || status === 'off') {
                            groupSettings[from].antivv = status === 'on';
                            saveGroupSettings();
                            await sock.sendMessage(from, { 
                                text: `🔒 *Anti vue unique ${status === 'on' ? 'activé' : 'désactivé'}.*` 
                            });
                        }
                    }
                    break;

                // ==================== DOMINATION ====================
                case 'domination':
                    if (isOwner && isGroup) {
                        if (await getAdmin()) {
                            await sock.groupSettingUpdate(from, 'announcement');
                            await sock.sendMessage(from, { 
                                text: "🌑 *Le groupe est maintenant sous contrôle total.*\n📢 *Seuls les admins peuvent envoyer des messages.*" 
                            });
                        } else {
                            await sock.sendMessage(from, { text: "❌ *Donnez les droits admin au bot.*" });
                        }
                    }
                    break;

                case 'liberation':
                    if (isOwner && isGroup && await getAdmin()) {
                        await sock.groupSettingUpdate(from, 'not_announcement');
                        await sock.sendMessage(from, { 
                            text: "🔓 *Le groupe est libéré.*\n💬 *Tous les membres peuvent envoyer des messages.*" 
                        });
                    }
                    break;

                case 'hidetag':
                    if (isOwner && isGroup) {
                        const meta = await sock.groupMetadata(from);
                        await sock.sendMessage(from, { 
                            text: arg.join(' ') || '🔔 *Notification silencieuse*',
                            mentions: meta.participants.map(a => a.id) 
                        });
                    }
                    break;

                case 'setname':
                    if (isGroup && await getSenderAdmin() && await getAdmin()) {
                        const name = arg.join(' ');
                        if (name) {
                            await sock.groupUpdateSubject(from, name);
                            await sock.sendMessage(from, { text: `✅ *Nom du groupe changé en:* ${name}` });
                        }
                    }
                    break;

                case 'setdesc':
                    if (isGroup && await getSenderAdmin() && await getAdmin()) {
                        const desc = arg.join(' ');
                        if (desc) {
                            await sock.groupUpdateDescription(from, desc);
                            await sock.sendMessage(from, { text: `✅ *Description du groupe mise à jour.*` });
                        }
                    }
                    break;

                // ==================== TECHNIQUE ====================
                case 'vv':
                    const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                    if (quotedMsg) {
                        if (groupSettings[from]?.antivv && !isOwner) {
                            await sock.sendMessage(from, { text: "❌ *Anti vue unique activé!*" });
                            return;
                        }
                        const type = Object.keys(quotedMsg)[0];
                        if (type.includes('viewOnce')) {
                            const mediaType = type.replace('ViewOnceMessage', '').replace('Message', '').toLowerCase();
                            const stream = await downloadContentFromMessage(quotedMsg[type], mediaType);
                            let buffer = Buffer.from([]);
                            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                            await sock.sendMessage(from, { 
                                [mediaType]: buffer, 
                                caption: "🌑 *Vue unique extraite par AYANOKOJI-SYSTEM*" 
                            });
                        }
                    }
                    break;

                case 'ping':
                    const start = Date.now();
                    await sock.sendMessage(from, { text: '🏓 *Pong!*' });
                    const end = Date.now();
                    await sock.sendMessage(from, { text: `⚡ *Réponse:* ${end - start}ms` });
                    break;

                case 'runtime':
                    await sock.sendMessage(from, { text: `⏱️ *Temps d'exécution:* ${getRuntime()}` });
                    break;

                case 'speed':
                    await sock.sendMessage(from, { text: `🚀 *Vitesse du système:* Optimale` });
                    break;

                case 'info':
                    const info = `╔══════════════════════════╗
║   📊 *INFORMATIONS* 📊   
╠══════════════════════════╣
║ 🤖 *Bot:* ${config.name}
║ 👤 *Owner:* ${config.chef}
║ ⏰ *Uptime:* ${getRuntime()}
║ 📦 *Version:* 2.0.0
║ 🌑 *Statut:* Élite
╚══════════════════════════╝`;
                    await sock.sendMessage(from, { text: info });
                    break;

                // ==================== LOISIR ====================
                case 'love':
                    const names = arg.join(' ').split('+').map(n => n.trim());
                    if (names.length === 2) {
                        const percentage = Math.floor(Math.random() * 101);
                        let emoji = percentage < 30 ? '💔' : percentage < 60 ? '💛' : percentage < 80 ? '💚' : '💖';
                        await sock.sendMessage(from, { 
                            text: `❤️ *CALCULATEUR D'AMOUR* ❤️\n\n${names[0]} ❤️ ${names[1]}\n\n${emoji} *Compatibilité:* ${percentage}%\n${percentage > 70 ? '✨ *Âmes sœurs!*' : ''}` 
                        });
                    }
                    break;

                case 'quote':
                    const quotes = [
                        "Le talent est une chose, le travail en est une autre.",
                        "La victoire sans risque est une victoire sans gloire.",
                        "L'homme le plus fort est celui qui reste seul.",
                        "Les apparences sont souvent trompeuses.",
                        "La stratégie sans action n'est qu'un rêve."
                    ];
                    await sock.sendMessage(from, { text: `💭 *Citation du jour:*\n\n"${quotes[Math.floor(Math.random() * quotes.length)]}"` });
                    break;

                case 'say':
                    await sock.sendMessage(from, { text: arg.join(' ') });
                    break;

                case 'insulte':
                    const insults = [
                        "🍃 *Crétin des Alpes!*",
                        "🤡 *Espèce de clown!*",
                        "🐌 *T'as un QI de limace!*",
                        "🧠 *T'as un cerveau de moineau!*",
                        "🎪 *Vrai numéro de cirque!*"
                    ];
                    let target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                    await sock.sendMessage(from, { 
                        text: `${target ? `@${target.split('@')[0]}` : 'Toi'} ${insults[Math.floor(Math.random() * insults.length)]}`,
                        mentions: target ? [target] : []
                    });
                    break;

                case 'weather':
                    await sock.sendMessage(from, { text: `🌤️ *Météo pour ${arg.join(' ') || 'votre région'}*\n\nTempérature: 25°C\nConditions: Ensoleillé\nHumidité: 60%` });
                    break;

                case 'sticker':
                case 's':
                    const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                    if (quoted?.imageMessage) {
                        const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
                        let buffer = Buffer.from([]);
                        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                        await sock.sendMessage(from, { sticker: buffer });
                    }
                    break;

                case 'toimg':
                    const quotedSticker = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                    if (quotedSticker?.stickerMessage) {
                        const stream = await downloadContentFromMessage(quotedSticker.stickerMessage, 'sticker');
                        let buffer = Buffer.from([]);
                        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                        await sock.sendMessage(from, { image: buffer, caption: "🖼️ *Sticker converti en image*" });
                    }
                    break;
            }
        } catch (e) { 
            console.log("Erreur :", e);
            await sock.sendMessage(from, { text: "❌ *Une erreur est survenue.*" });
        }
    });
}
start();
