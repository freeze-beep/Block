const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  downloadContentFromMessage,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const fs = require("fs");
const http = require("http");

const config = {
  owner: "243986860268",
  phoneNumber: "243986860268",
  name: "AYANOKOJI-BOT",
  chef: "Kiyotaka Ayanokoji",
  prefix: ".",
  image: "https://i.supaimg.com/ba0cda0b-0be1-4bc3-b8c9-c0f903bcc6bf/cee23d05-8cd3-49de-b6ee-8df91763633a.jpg"
};

let groupSettings = {};
let userWarnings = {};

if (fs.existsSync("group_settings.json")) {
  groupSettings = JSON.parse(fs.readFileSync("group_settings.json"));
}

function saveGroupSettings() {
  fs.writeFileSync("group_settings.json", JSON.stringify(groupSettings, null, 2));
}

http.createServer((req,res)=>{
  res.writeHead(200);
  res.end("ELITE SYSTEM ACTIVE");
}).listen(process.env.PORT || 3000);

function getRuntime(){
  const uptime = process.uptime();
  const h = Math.floor(uptime/3600);
  const m = Math.floor((uptime%3600)/60);
  const s = Math.floor(uptime%60);
  return `${h}h ${m}m ${s}s`;
}

async function start(){
  const { state, saveCreds } = await useMultiFileAuthState("session");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({level:"silent"}),
    browser:["Ubuntu","Chrome","20.0.04"]
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (u)=>{
    if(u.connection==="close") start();
    if(u.connection==="open") console.log("🌑 BOT CONNECTÉ");
  });

  sock.ev.on("messages.upsert", async (m)=>{
    try{
      const msg = m.messages[0];
      if(!msg.message || msg.key.remoteJid==="status@broadcast") return;

      const from = msg.key.remoteJid;
      const isGroup = from.endsWith("@g.us");
      const sender = msg.key.participant || msg.key.remoteJid;
      const isOwner = sender.includes(config.owner) || msg.key.fromMe;

      const body =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        "";

      const botNumber = sock.user.id.split(":")[0] + "@s.whatsapp.net";

      const getMeta = async ()=> isGroup ? await sock.groupMetadata(from) : null;

      const isBotAdmin = async ()=>{
        if(!isGroup) return false;
        const data = await getMeta();
        const bot = data.participants.find(p=>p.id===botNumber);
        return !!bot?.admin;
      };

      const isSenderAdmin = async ()=>{
        if(!isGroup) return false;
        const data = await getMeta();
        const user = data.participants.find(p=>p.id===sender);
        return !!user?.admin || isOwner;
      };

      const react = async (emoji)=>{
        try{
          await sock.sendMessage(from,{react:{text:emoji,key:msg.key}});
        }catch{}
      };

      if(!body.startsWith(config.prefix)) return;

      const args = body.slice(config.prefix.length).trim().split(/ +/);
      const cmd = args.shift().toLowerCase();

      await react("🌑");

      switch(cmd){

        /* ================= MENU ================= */
        case "menu":
        case "help":
          const menu = `╔══════════════════════════╗
║   🌑 *${config.name}* 🌑
╠══════════════════════════╣
║ 👤 Maître : ${config.chef}
║ ⏱️ Uptime : ${getRuntime()}
╚══════════════════════════╝

╭━━━━━━━━━━━━━━━━━━━━╮
┃ ⚡ GESTION
╰━━━━━━━━━━━━━━━━━━━━╯
• .promote @
• .demote @
• .kick @
• .purge
• .tagadmin

╭━━━━━━━━━━━━━━━━━━━━╮
┃ 🌑 DOMINATION
╰━━━━━━━━━━━━━━━━━━━━╯
• .domination
• .liberation
• .tagall
• .hidetag

╭━━━━━━━━━━━━━━━━━━━━╮
┃ 🛠️ OUTILS
╰━━━━━━━━━━━━━━━━━━━━╯
• .vv (vue unique → normal)
• .ping
• .runtime
• .info
`;

          await sock.sendMessage(from,{
            image:{url:config.image},
            caption:menu
          },{quoted:msg});
          break;

        /* ================= VV VIEW ONCE ================= */
        case "vv":
          const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
          if(!quoted) return sock.sendMessage(from,{text:"❌ Réponds à un message en vue unique."});

          const v2 = quoted.viewOnceMessageV2 || quoted.viewOnceMessageV2Extension;
          if(v2){
            const inner = v2.message;
            const type = Object.keys(inner)[0];
            const stream = await downloadContentFromMessage(inner[type], type.replace("Message","").toLowerCase());
            let buffer = Buffer.from([]);
            for await (const chunk of stream){
              buffer = Buffer.concat([buffer,chunk]);
            }
            if(type==="imageMessage"){
              await sock.sendMessage(from,{image:buffer,caption:"🌑 Vue unique révélée."});
            }else if(type==="videoMessage"){
              await sock.sendMessage(from,{video:buffer,caption:"🌑 Vue unique révélée."});
            }
          }else{
            return sock.sendMessage(from,{text:"❌ Ce message n'est pas en vue unique."});
          }
          break;

        /* ================= PURGE ================= */
        case "purge":
          if(!isGroup) return;
          if(!(await isSenderAdmin())) return sock.sendMessage(from,{text:"❌ Admin uniquement"});
          if(!(await isBotAdmin())) return sock.sendMessage(from,{text:"❌ Donnez admin au bot"});

          await react("⚔️");
          await sock.sendMessage(from,{text:"🌑 La purge commence. Les faibles disparaissent."});

          const meta = await getMeta();
          const targets = meta.participants
            .filter(p=>!p.admin && p.id!==botNumber && !p.id.includes(config.owner))
            .map(p=>p.id);

          for(let i=0;i<targets.length;i+=5){
            await sock.groupParticipantsUpdate(from,targets.slice(i,i+5),"remove");
            await delay(1500);
          }

          await sock.sendMessage(from,{
            text:`⚔️ ${targets.length} membres supprimés.\n🌑 Silence restauré.`
          });
          break;

        /* ================= DOMINATION ================= */
        case "domination":
          if(!isGroup) return;
          if(!(await isSenderAdmin())) return;
          if(!(await isBotAdmin())) return;

          await react("👑");
          await sock.groupSettingUpdate(from,"announcement");
          await sock.sendMessage(from,{text:"👑 Mode Domination activé. Seuls les admins parlent."});
          break;

        /* ================= LIBERATION ================= */
        case "liberation":
          if(!isGroup) return;
          if(!(await isSenderAdmin())) return;
          if(!(await isBotAdmin())) return;

          await react("🔓");
          await sock.groupSettingUpdate(from,"not_announcement");
          await sock.sendMessage(from,{text:"🔓 Mode Libération activé. Tout le monde peut parler."});
          break;

        /* ================= TAG ALL ================= */
        case "tagall":
          if(!isGroup) return;
          if(!(await isSenderAdmin())) return;

          const members = (await getMeta()).participants.map(p=>p.id);
          await sock.sendMessage(from,{
            text:args.join(" ")+"\n\n"+members.map(m=>"@"+m.split("@")[0]).join("\n"),
            mentions:members
          });
          break;

        /* ================= SYSTEM ================= */
        case "ping":
          const start = Date.now();
          await sock.sendMessage(from,{text:"🏓 Pong"});
          await sock.sendMessage(from,{text:`⚡ ${Date.now()-start} ms`});
          break;

        case "runtime":
          await sock.sendMessage(from,{text:`⏱️ ${getRuntime()}`});
          break;

        case "info":
          await sock.sendMessage(from,{
            text:`🤖 ${config.name}\n👑 ${config.chef}\n⏱️ ${getRuntime()}`
          });
          break;
      }
    }catch(err){
      console.error("ERREUR :",err);
      await sock
