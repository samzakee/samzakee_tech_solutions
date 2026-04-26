const http   = require("http");
const https  = require("https");
const fs     = require("fs");
const path   = require("path");
const crypto = require("crypto");
const PORT   = 3000;

// ── HASH DE SENHA (PBKDF2) ────────────────────────────────────────────────
function hashSenha(senha){
  var salt=crypto.randomBytes(16).toString("hex");
  var hash=crypto.pbkdf2Sync(senha,salt,100000,64,"sha512").toString("hex");
  return salt+":"+hash;
}
function verificarSenha(senha,stored){
  if(!stored)return false;
  if(!stored.includes(":")||stored.split(":")[0].length!==32) return senha===stored;
  var p=stored.split(":"),salt=p[0],hArm=p[1];
  var hCalc=crypto.pbkdf2Sync(senha,salt,100000,64,"sha512").toString("hex");
  try{return crypto.timingSafeEqual(Buffer.from(hCalc),Buffer.from(hArm));}
  catch(e){return false;}
}
function ehHash(s){return s&&s.includes(":")&&s.split(":")[0].length===32;}

function migrarSenhas(){
  var udb = readDB("usuarios_v2", []);
  var changed = false;
  udb.forEach(function(u){
    if(u.senha && !ehHash(u.senha)){
      u.senha = hashSenha(u.senha);
      changed = true;
    }
  });
  if(changed){
    writeDB("usuarios_v2", udb);
    console.log("[SEGURANCA] Senhas migradas para hash.");
  }
}

// ── RATE LIMITING ─────────────────────────────────────────────────────────
var _attempts={};
function canLogin(ip){
  var now=Date.now(),a=_attempts[ip];
  if(!a){_attempts[ip]={n:0,t:now};return true;}
  if(now-a.t>15*60*1000){_attempts[ip]={n:0,t:now};return true;}
  return a.n<5;
}
function failLogin(ip){
  var now=Date.now();
  if(!_attempts[ip])_attempts[ip]={n:0,t:now};
  if(now-_attempts[ip].t>5*60*1000){_attempts[ip]={n:0,t:now};}
  _attempts[ip].n++;
}
function okLogin(ip){delete _attempts[ip];}

// ── SANITIZACAO ──────────────────────────────────────────────────────────
function san(v){
  if(typeof v!=="string")return v;
  return v.replace(/[<>"']/g,"").trim().slice(0,2000);
}
function sanObj(o){
  if(!o||typeof o!=="object")return o;
  var r={};
  Object.keys(o).forEach(function(k){
    r[k]=typeof o[k]==="string"?san(o[k]):(typeof o[k]==="object"&&!Array.isArray(o[k])?sanObj(o[k]):o[k]);
  });
  return r;
}
const DATA   = path.join(__dirname, "data");
const PUBLIC = path.join(__dirname, "public");
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, {recursive:true});

function readDB(n, def) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, n+".json"), "utf8")); }
  catch(e) { return JSON.parse(JSON.stringify(def)); }
}
function writeDB(n, d) { fs.writeFileSync(path.join(DATA, n+".json"), JSON.stringify(d, null, 2)); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

// ── DADOS PADRÃO ───────────────────────────────────────────────────────────
var DEF_EF = [
  {id:1,  nome:"Dayanne Alves da Silva",           nomeGuerra:"DAYANNE",      mat:"881405",grad:"3 SGT PM",  status:"Ativo"},
  {id:2,  nome:"Edmilson Lima Macedo",              nomeGuerra:"MACEDO",       mat:"880888",grad:"SUB TEN PM",status:"Ativo"},
  {id:3,  nome:"Evaldo Moreira de Araujo Junior",   nomeGuerra:"EVALDO",       mat:"883664",grad:"3 SGT PM",  status:"Ativo"},
  {id:4,  nome:"Flavio Pereira Diniz",              nomeGuerra:"DINIZ",        mat:"883039",grad:"TEN CEL PM",status:"Ativo"},
  {id:5,  nome:"Hernandes Aquino Custodio",         nomeGuerra:"HERNANDES",    mat:"884360",grad:"3 SGT PM",  status:"Ativo"},
  {id:6,  nome:"Kassio de Jesus Rocha",             nomeGuerra:"KASSIO",       mat:"882979",grad:"2 SGT PM",  status:"Ativo"},
  {id:7,  nome:"Kleber da Silva Machado",           nomeGuerra:"KLEBER",       mat:"883449",grad:"1 SGT PM",  status:"Ativo"},
  {id:8,  nome:"Luciene Alves de Sousa Lima",       nomeGuerra:"LUCIENE",      mat:"885180",grad:"3 SGT PM",  status:"Ativo"},
  {id:9,  nome:"Luiz Henrique Woiciechowski Cunha", nomeGuerra:"CUNHA",        mat:"885783",grad:"2 SGT PM",  status:"Ativo"},
  {id:10, nome:"Marcelo Ricardo de Campos Santos",  nomeGuerra:"CAMPOS",       mat:"883078",grad:"2 SGT PM",  status:"Ativo"},
  {id:11, nome:"Matheus Carolo do Nascimento",      nomeGuerra:"CAROLO",       mat:"885518",grad:"MAJ PM",    status:"Ativo"},
  {id:12, nome:"Mereles Moreira dos Santos Junior", nomeGuerra:"SANTOS JUNIOR",mat:"882960",grad:"2 SGT PM",  status:"Ativo"},
  {id:13, nome:"Nubia Katiane de Jesus Rocha",      nomeGuerra:"NUBIA",        mat:"880888",grad:"1 SGT PM",  status:"Ativo"},
  {id:14, nome:"Samuel Ribeiro dos Santos",         nomeGuerra:"R. SANTOS",    mat:"884507",grad:"3 SGT PM",  status:"Ativo"},
  {id:15, nome:"Samuel Vilas Boa Goncalves",        nomeGuerra:"VILAS",        mat:"882031",grad:"1 SGT PM",  status:"Ativo"},
  {id:16, nome:"Sidiney Pereira dos Santos",        nomeGuerra:"SIDINEY",      mat:"879064",grad:"1 TEN PM",  status:"Ativo"},
  {id:17, nome:"Wanderson Ferreira Alves",          nomeGuerra:"F. ALVES",     mat:"886672",grad:"CB PM",     status:"Ativo"},
  {id:18, nome:"Weuller da Costa Moraes",           nomeGuerra:"WEULLER",      mat:"882935",grad:"1 SGT PM",  status:"Ativo"},
  {id:19, nome:"Joao Paulo Alves de Freitas Diniz", nomeGuerra:"J.P. DINIZ",   mat:"886589",grad:"CB PM",     status:"Ativo"},
  {id:20, nome:"Carlos",    nomeGuerra:"CARLOS",   mat:"878036",grad:"3 SGT PM RR A",status:"Ativo"},
  {id:21, nome:"Abreu",     nomeGuerra:"ABREU",    mat:"875668",grad:"CB PM RR",     status:"Ativo"},
  {id:22, nome:"Roberto",   nomeGuerra:"ROBERTO",  mat:"875645",grad:"CB PM RR",     status:"Ativo"},
  {id:23, nome:"Luz",       nomeGuerra:"LUZ",      mat:"875666",grad:"CB PM RR",     status:"Ativo"},
  {id:24, nome:"Pimentel",  nomeGuerra:"PIMENTEL", mat:"875584",grad:"CB PM RR",     status:"Ativo"},
  {id:25, nome:"Joao",      nomeGuerra:"JOAO",     mat:"875506",grad:"CB PM RR",     status:"Ativo"}
];
var DEF_FUNCOES = [
  {id:"f1",nome:"Comandante de Unidade"},{id:"f2",nome:"Comandante Adjunto"},
  {id:"f3",nome:"Coordenador Operacional"},{id:"f4",nome:"Auxiliar Administrativo"},
  {id:"f5",nome:"Chefe de Sistemica"},{id:"f6",nome:"Comandante de Guarnicao"},
  {id:"f7",nome:"Comandante de Operacao"},{id:"f8",nome:"Motorista"},
  {id:"f9",nome:"Patrulheiro"},{id:"f10",nome:"Navegador"},
  {id:"f11",nome:"Analista"},{id:"f12",nome:"Apoio"}
];
var DEF_TURNOS = [
  {id:"t1",nome:"6 horas"},{id:"t2",nome:"8 horas"},
  {id:"t3",nome:"12 horas"},{id:"t4",nome:"24 horas"}
];
var DEF_TSERV = [
  {id:"expediente",  label:"Expediente",           hor:"13:00",turno:"6 horas",  cor:"amber",ativo:true},
  {id:"diario",      label:"Servico Diario",        hor:"07:00",turno:"12 horas", cor:"gray", ativo:true},
  {id:"guarda",      label:"Guarda",                hor:"07:00",turno:"24 horas", cor:"blue", ativo:true},
  {id:"patrulhamento",label:"Patrulhamento Urbano", hor:"07:00",turno:"12 horas", cor:"teal", ativo:true},
  {id:"flora",       label:"Operacao Flora",         hor:"07:00",turno:"12 horas", cor:"green",ativo:true},
  {id:"fauna",       label:"Operacao Fauna",         hor:"07:00",turno:"12 horas", cor:"green",ativo:true},
  {id:"indea",       label:"Apoio INDEA",            hor:"07:00",turno:"12 horas", cor:"amber",ativo:true},
  {id:"ibama",       label:"Apoio IBAMA",            hor:"07:00",turno:"12 horas", cor:"amber",ativo:true},
  {id:"sema",        label:"Apoio SEMA",             hor:"07:00",turno:"12 horas", cor:"amber",ativo:true},
  {id:"prefeitura",  label:"Apoio Prefeitura",       hor:"07:00",turno:"12 horas", cor:"amber",ativo:true},
  {id:"educacao",    label:"Educacao Ambiental",      hor:"07:00",turno:"8 horas",  cor:"blue", ativo:true},
  {id:"je",          label:"Jornada Extraordinaria", hor:"07:00",turno:"8 horas",  cor:"red",  ativo:true}
];
var DEF_LOCAIS = [
  {id:"l1",nome:"Sede - 3a CIPMPA",ativo:true},
  {id:"l2",nome:"Area Urbana - Barra do Garcas",ativo:true},
  {id:"l3",nome:"Parque Estadual do Araguaia",ativo:true},
  {id:"l4",nome:"Parque Est. Gruta da Lagoa Azul",ativo:true},
  {id:"l5",nome:"Area Rural",ativo:true},
  {id:"l6",nome:"IBAMA Regional",ativo:true},
  {id:"l7",nome:"INDEA Regional",ativo:true},
  {id:"l8",nome:"SEMA Estadual",ativo:true},
  {id:"l9",nome:"Prefeitura Municipal",ativo:true}
];
var DEF_TAFST = [
  {id:"ta1", nome:"Ferias",                                 afeta:true,  diasMax:30},
  {id:"ta2", nome:"Licenca Premio",                         afeta:true,  diasMax:null},
  {id:"ta3", nome:"Licenca Tratamento Interesse Particular", afeta:true,  diasMax:null},
  {id:"ta4", nome:"Licenca Maternidade",                    afeta:true,  diasMax:180},
  {id:"ta5", nome:"Licenca Paternidade",                    afeta:true,  diasMax:8},
  {id:"ta6", nome:"Licenca Tratamento Saude",               afeta:true,  diasMax:null},
  {id:"ta7", nome:"Licenca Especial",                       afeta:true,  diasMax:null},
  {id:"ta8", nome:"Nupcias (Casamento)",                    afeta:true,  diasMax:8},
  {id:"ta9", nome:"Luto",                                   afeta:true,  diasMax:8},
  {id:"ta10",nome:"Transito e Instalacao",                  afeta:true,  diasMax:30},
  {id:"ta11",nome:"Folga AVNM",                             afeta:true,  diasMax:null},
  {id:"ta12",nome:"Dispensa Medica",                        afeta:true,  diasMax:null},
  {id:"ta13",nome:"Curso / Instrucao",                      afeta:true,  diasMax:null},
  {id:"ta14",nome:"Missao / Deslocamento a Servico",        afeta:false, diasMax:null}
];
var DEF_USERS = [
  {id:"u1",nome:"Flavio Pereira Diniz",      mat:"883039",login:"883039",senha:"883039",email:"",perfil:"Administrador",ativo:true,createdAt:"2026-01-01T00:00:00.000Z"},
  {id:"u2",nome:"Samuel Ribeiro dos Santos", mat:"884507",login:"884507",senha:"884507",email:"",perfil:"Administrador",ativo:true,createdAt:"2026-01-01T00:00:00.000Z"},
  // Perfil Desenvolvedor removido - use senha DEV no modo administrador
];

function initDB() {
  var dbs = [
    ["efetivo_v6",DEF_EF],["funcoes_v2",DEF_FUNCOES],["turnos",DEF_TURNOS],
    ["tservico_v5",DEF_TSERV],["locais",DEF_LOCAIS],["tiposAfst",DEF_TAFST],
    ["usuarios_v2",DEF_USERS],["escalas_v5",[]],["afastamentos",[]],["auditoria",[]],["vagas_vol",[]],["voluntariado",[]],["trocas",[]]
  ];
  dbs.forEach(function(d) {
    if (!fs.existsSync(path.join(DATA, d[0]+".json"))) writeDB(d[0], d[1]);
  });
  // Migrar usuarios antigos: adicionar email se faltar
  var u = readDB("usuarios_v2", []);
  var ch = false;
  u.forEach(function(x) { if (!x.hasOwnProperty("email")) { x.email = ""; ch = true; } });
  if (ch) writeDB("usuarios_v2", u);
}
initDB();

function audit(acao, tab, id, det, usr) {
  var log = readDB("auditoria", []);
  log.unshift({id:uid(),ts:new Date().toISOString(),usuario:usr||"Sistema",acao:acao,tabela:tab,regId:String(id),det:String(det)});
  if (log.length > 500) log.length = 500;
  writeDB("auditoria", log);
}

function turnoH(t) { return ({"6 horas":6,"8 horas":8,"12 horas":12,"24 horas":24})[t] || 0; }
function calcH(e) {
  var h = turnoH(e.turno);
  if (e.dataFim && e.dataFim !== e.dataIni) {
    var d1 = new Date(e.dataIni+"T12:00:00"), d2 = new Date(e.dataFim+"T12:00:00");
    return h * (Math.round((d2-d1)/86400000)+1);
  }
  return h;
}

// ── REGRAS DE DESCANSO ─────────────────────────────────────────────────────
var OPERACOES = ["flora","fauna","indea","ibama","sema","prefeitura"];

function fimEscala(e) {
  // Retorna Date do fim do servico
  var dataBase = e.dataFim || e.dataIni;
  var horInicio = e.hor || "07:00";
  var p = horInicio.split(":");
  var start = new Date(e.dataIni + "T" + horInicio + ":00");
  var duracaoMs = turnoH(e.turno) * 3600000;
  // Para multidia, calcula a partir do ultimo dia
  if (e.dataFim && e.dataFim !== e.dataIni) {
    var d1 = new Date(e.dataIni + "T12:00:00");
    var d2 = new Date(e.dataFim + "T12:00:00");
    var dias = Math.round((d2 - d1) / 86400000) + 1;
    // O servico reinicia cada dia; o fim e no ultimo dia
    start = new Date(e.dataFim + "T" + horInicio + ":00");
  }
  return new Date(start.getTime() + duracaoMs);
}

function descansoMinHoras(e) {
  // Retorna horas minimas de descanso apos este servico
  if (e.tipo === "je") {
    return turnoH(e.turno); // JE: descanso = horas trabalhadas
  }
  if (OPERACOES.indexOf(e.tipo) !== -1) {
    return 48; // Apos operacao: 48h
  }
  // Servico diario/expediente/guarda etc: depende do turno
  var h = parseInt((e.hor || "07:00").split(":")[0]);
  var isNoturno = (h >= 19 || h < 7);
  return turnoH(e.turno) * (isNoturno ? 4 : 2);
}

function checkDescanso(milId, novoDataIni, novoHor, novoTipo, db, excId) {
  // Verifica se o militar cumpriu o descanso minimo antes do novo servico
  var novoInicio = new Date(novoDataIni + "T" + (novoHor || "07:00") + ":00");
  var alertas = [];
  db.filter(function(e) {
    return (!excId || e.id !== excId) &&
      (e.militares || []).some(function(m) { return String(m.milId) === String(milId); });
  }).forEach(function(e) {
    var fim = fimEscala(e);
    if (fim >= novoInicio) return; // Escala futura ou sobreposicao (tratada em checkConflito)
    var descH = descansoMinHoras(e);
    var liberadoEm = new Date(fim.getTime() + descH * 3600000);
    // JE pode ser escalado sem descanso previo
    // Mas para entrar num servico apos JE, precisa descanso
    // Para novo servico = JE: so verifica descanso de JE anterior
    if (novoTipo === "je") {
      // JE exempto das regras de descanso de servicos anteriores
      // Mas verifica descanso de JE anterior
      if (e.tipo === "je" && liberadoEm > novoInicio) {
        var tserv2 = readDB("tservico_v5",[]).find(function(t){return t.id===e.tipo;})||{label:e.tipo};
        alertas.push({tipo:e.tipo,tipoLabel:tserv2.label,fim:fim.toISOString(),liberadoEm:liberadoEm.toISOString(),descH:descH});
      }
      return;
    }
    // Servico normal: verifica todos os descansos
    if (liberadoEm > novoInicio) {
      var tserv2 = readDB("tservico_v5",[]).find(function(t){return t.id===e.tipo;})||{label:e.tipo};
      alertas.push({tipo:e.tipo,tipoLabel:tserv2.label,fim:fim.toISOString(),liberadoEm:liberadoEm.toISOString(),descH:descH});
    }
  });
  return alertas;
}

function horasJE(milId, db) {
  var t = 0;
  db.filter(function(e){return e.tipo==="je";}).forEach(function(e) {
    if ((e.militares||[]).some(function(m){return String(m.milId)===String(milId);})) t += calcH(e);
  });
  return t;
}
function horToMin(hor){
  if(!hor) return 0;
  var p=hor.split(":"); return parseInt(p[0])*60+(parseInt(p[1])||0);
}
function checkConflito(milId, dataIni, dataFim, db, excId, hor, turno) {
  dataFim = dataFim || dataIni;
  var conf = [];
  var tserv = readDB("tservico_v5",[]);
  db.filter(function(e){return !excId||e.id!==excId;}).forEach(function(e) {
    var ef = e.dataFim || e.dataIni;
    // Check date overlap
    if (!(e.dataIni <= dataFim && ef >= dataIni)) return;
    if (!(e.militares||[]).some(function(m){return String(m.milId)===String(milId);})) return;
    // If same single day on both sides, check time overlap
    var newIsSingle = (dataIni === dataFim);
    var existIsSingle = (e.dataIni === ef);
    if (newIsSingle && existIsSingle && hor && e.hor) {
      var newStart = horToMin(hor);
      var newEnd   = newStart + turnoH(turno)*60;
      var exStart  = horToMin(e.hor);
      var exEnd    = exStart + turnoH(e.turno)*60;
      // Handle overnight (end > 24h)
      if (newEnd > 1440) newEnd = 1440;
      if (exEnd  > 1440) exEnd  = 1440;
      // No overlap if one ends before the other starts
      if (newEnd <= exStart || exEnd <= newStart) return;
    }
    var ts = tserv.find(function(t){return t.id===e.tipo;})||{label:e.tipo};
    conf.push({tipo:e.tipo,tipoLabel:ts.label,dataIni:e.dataIni,dataFim:ef});
  });
  return conf;
}

// ── PDF (fiel ao ODT - formato tabela) ────────────────────────────────────
function gerarPDF(ini, fim) {
  var escalas = readDB("escalas_v5", []);
  var ef      = readDB("efetivo_v6", []);
  var tserv   = readDB("tservico_v5", []);
  var locais  = readDB("locais", []);
  var afst    = readDB("afastamentos", []);
  var tafst   = readDB("tiposAfst", []);

  var DIAS  = ["Domingo","Segunda-Feira","Terca-Feira","Quarta-Feira","Quinta-Feira","Sexta-Feira","Sabado"];
  var MESES = ["JANEIRO","FEVEREIRO","MARCO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];
  var MESES_PT = ["Janeiro","Fevereiro","Marco","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  function fD(s){if(!s)return"";var p=s.split("-");return p[2]+"/"+p[1]+"/"+p[0];}
  function fDL(s){var d=new Date(s+"T12:00:00");return d.getDate()+" DE "+MESES[d.getMonth()]+" DE "+d.getFullYear();}
  function dayN(s){var d=new Date(s+"T12:00:00");return DIAS[d.getDay()].toUpperCase();}
  function addHr(hor,t){if(!hor)return"--";var p=hor.split(":");var h=parseInt(p[0]);h+=turnoH(t);if(h>=24)h-=24;return String(h).padStart(2,"0")+"H"+String(parseInt(p[1]||0)).padStart(2,"0")+"MIN";}
  function hL(hor){if(!hor)return"--";return hor.replace(":","H")+"MIN";}
  function gM(id){return ef.find(function(m){return String(m.id)===String(id);})||{};}
  function gT(id){return tserv.find(function(t){return t.id===id;})||{label:id.toUpperCase()};}
  function gL(id){return locais.find(function(l){return l.id===id;});}
  function gTA(id){return tafst.find(function(t){return t.id===id;});}

  var FN_LABELS = {
    "Comandante de Unidade":   "COMANDANTE DA 3\u00ba CIPMPA",
    "Comandante Adjunto":      "SUB COMANDANTE DA 3\u00ba CIPMPA",
    "Coordenador Operacional": "COORDENADOR OPERACIONAL",
    "Auxiliar Administrativo": "AUX ADMINISTRATIVO",
    "Chefe de Sistemica":      "CHEFE DE SIST\u00caCA",
    "Comandante de Guarnicao": "CMDT GUARNI\u00c7\u00c3O",
    "Comandante de Operacao":  "CMDT OPERA\u00c7\u00c3O",
    "Motorista":               "MOTORISTA",
    "Patrulheiro":             "PATRULHEIRO",
    "Navegador":               "NAVEGADOR",
    "Analista":                "ANALISTA",
    "Apoio":                   "APOIO"
  };
  function fnL(f){return FN_LABELS[f]||f.toUpperCase();}

  var today = new Date();
  var emissao = today.getDate()+" DE "+MESES[today.getMonth()]+" DE "+today.getFullYear();

  var dates = [];
  var d = new Date(ini+"T12:00:00"), de = new Date(fim+"T12:00:00");
  while(d<=de){dates.push(d.toISOString().split("T")[0]);d.setDate(d.getDate()+1);}

  var css = [
    "*{margin:0;padding:0;box-sizing:border-box;}",
    "body{font-family:Arial,sans-serif;font-size:8.5pt;color:#000;background:#fff;}",
    ".page{width:190mm;margin:0 auto;padding:8mm 5mm;page-break-after:always;}",
    ".hdr{text-align:center;border:1.5px solid #000;padding:3mm 2mm 2mm;margin-bottom:3mm;}",
    ".hdr h1{font-size:9pt;font-weight:bold;line-height:1.5;text-transform:uppercase;}",
    ".hdr .mot{font-size:8pt;font-style:italic;margin-top:2px;}",
    ".hdr .dat{font-size:8pt;margin-top:2px;}",
    ".day-title{font-size:9pt;font-weight:bold;text-align:center;text-decoration:underline;",
    "  text-transform:uppercase;margin:3mm 0 2mm;letter-spacing:.03em;}",
    ".tbl{width:100%;border-collapse:collapse;margin-bottom:2mm;}",
    ".tbl td,.tbl th{border:1px solid #000;padding:2px 5px;vertical-align:middle;}",
    ".sec-hdr{background:#c6d9b0;font-weight:bold;font-size:8pt;text-align:center;text-transform:uppercase;}",
    ".sec-hdr td{border:1px solid #000;padding:2px 5px;}",
    ".fn-cell{font-size:8pt;font-weight:bold;text-transform:uppercase;width:42%;}",
    ".mil-cell{font-size:8pt;font-weight:bold;}",
    ".afst-title{background:#c6d9b0;font-weight:bold;font-size:8.5pt;text-align:center;",
    "  text-transform:uppercase;border:1px solid #000;padding:2px 5px;}",
    ".afst-row td{border:1px solid #000;padding:2px 6px;font-size:8pt;}",
    ".footer-note{font-size:7.5pt;font-style:italic;text-align:justify;",
    "  margin-top:3mm;border:1px solid #000;padding:2mm;font-weight:bold;}",
    ".sign{margin-top:10mm;text-align:center;}",
    ".sign-line{border-top:1px solid #000;width:70mm;margin:0 auto 2mm;}",
    ".sign-name{font-size:8.5pt;font-weight:bold;text-transform:uppercase;}",
    ".sign-rank{font-size:8pt;}",
    "@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}",
    "@page{size:A4 portrait;margin:10mm;}",
    ".page{page-break-after:always;}}"
  ].join("");

  var out = "<!DOCTYPE html><html lang=\"pt-BR\"><head><meta charset=\"UTF-8\"/>";
  out += "<title>Escala 3\u00ba CIPMPA</title><style>"+css+"</style></head><body>";

  dates.forEach(function(dia){
    var escDia = escalas.filter(function(e){
      var ef2 = e.dataFim || e.dataIni;
      return e.dataIni <= dia && ef2 >= dia;
    }).sort(function(a,b){
      var ordem={expediente:0,diario:1,guarda:2,je:3,patrulhamento:4,
        flora:5,fauna:6,educacao:7,indea:8,ibama:9,sema:10,prefeitura:11};
      var oa=ordem.hasOwnProperty(a.tipo)?ordem[a.tipo]:99;
      var ob=ordem.hasOwnProperty(b.tipo)?ordem[b.tipo]:99;
      return oa-ob;
    });

    // Afastamentos ativos neste dia
    var afstDia = afst.filter(function(a){
      return a.dataIni <= dia && (!a.dataFim || a.dataFim >= dia);
    });

    out += "<div class=\"page\">";

    // CABECALHO 5 LINHAS
    out += "<div class=\"hdr\">";
    out += "<h1>ESTADO DE MATO GROSSO</h1>";
    out += "<h1>POL&Iacute;CIA MILITAR</h1>";
    out += "<h1>COMANDO DE POLICIAMENTO ESPECIALIZADO</h1>";
    out += "<h1>3&ordf; CIPM DE PROTE&Ccedil;&Atilde;O AMBIENTAL &ndash; ARAGUAIA</h1>";
    out += "<div class=\"mot\">&ldquo;Em defesa da vida, protegendo o meio ambiente&rdquo;</div>";
    out += "<div class=\"dat\">"+emissao+"</div></div>";

    // TITULO DO DIA
    out += "<div class=\"day-title\">ESCALA DE SERVI&Ccedil;O DO 3&ordm; CIPMPA ARAGUAIA";
    out += " DIA "+fDL(dia)+"/"+dayN(dia)+"</div>";

    // TABELA PRINCIPAL
    out += "<table class=\"tbl\">";

    if(!escDia.length){
      out += "<tr><td colspan=\"2\" style=\"text-align:center;padding:6px;font-style:italic\">Nenhuma escala registrada.</td></tr>";
    } else {
      escDia.forEach(function(e){
        var ts  = gT(e.tipo);
        var loc = gL(e.localId);
        var isMulti = e.dataFim && e.dataFim !== e.dataIni;
        var horFim  = addHr(e.hor, e.turno);

        // Linha de cabecalho da secao
        out += "<tr class=\"sec-hdr\"><td colspan=\"2\">";
        out += "LOCAL OU POSTO DE SERVI&Ccedil;O &nbsp;&mdash;&nbsp; ";
        out += "<strong>"+ts.label.toUpperCase()+"</strong>";
        if(isMulti){out += " &nbsp; "+fD(e.dataIni)+" &Agrave; "+fD(e.dataFim);}
        if(e.hor){out += " &nbsp; DAS "+hL(e.hor)+" AS "+horFim;}
        if(loc){out += " &nbsp; | &nbsp; "+loc.nome;}
        out += "</td></tr>";

        // Linhas dos militares agrupadas por funcao
        var mils = e.militares || [];
        var byFn = {}, ord = [];
        mils.forEach(function(m){
          var f = m.funcao || "";
          if(!byFn[f]){byFn[f]=[];ord.push(f);}
          byFn[f].push(m);
        });

        ord.forEach(function(fn){
          byFn[fn].forEach(function(m, mi){
            var mil = gM(m.milId);
            if(!mil.nome) return;
            var ng = mil.nomeGuerra || mil.nome.split(" ").pop();
            out += "<tr>";
            out += "<td class=\"fn-cell\">"+fnL(fn)+"</td>";
            out += "<td class=\"mil-cell\">"+(mil.grad||"")+" PM "+ng+" &ndash; "+mil.mat+"</td>";
            out += "</tr>";
          });
        });
        if(!mils.length){
          out += "<tr><td class=\"fn-cell\">&nbsp;</td><td class=\"mil-cell\" style=\"color:#888;font-style:italic\">Nenhum militar escalado.</td></tr>";
        }
      });
    }
    out += "</table>";

    // AFASTAMENTOS - agrupar por tipo
    if(afstDia.length){
      var byTipo = {}, tipoOrd = [];
      afstDia.forEach(function(a){
        var ta = gTA(a.tipoId);
        var label = ta ? ta.nome.toUpperCase() : "AFASTAMENTO";
        if(!byTipo[label]){byTipo[label]=[];tipoOrd.push(label);}
        byTipo[label].push(a);
      });
      tipoOrd.forEach(function(label){
        out += "<table class=\"tbl\">";
        out += "<tr><td colspan=\"2\" class=\"afst-title\">"+label+"</td></tr>";
        byTipo[label].forEach(function(a){
          var m = gM(a.milId);
          var ng = m.nomeGuerra || (m.nome&&m.nome.split(" ").pop()) || "?";
          out += "<tr class=\"afst-row\">";
          out += "<td style=\"width:55%\">"+(m.grad||"")+" PM "+ng+" &ndash; "+(m.mat||"")+"</td>";
          out += "<td>"+fD(a.dataIni)+(a.dataFim?" &Agrave; "+fD(a.dataFim):"")+"</td>";
          out += "</tr>";
        });
        out += "</table>";
      });
    }

    // NOTA DE RODAPE
    out += "<div class=\"footer-note\">";
    out += "&ldquo;ATEN&Ccedil;&Atilde;O: TODOS OS DIAS HAVER&Aacute; 01 HORA DE EDUCA&Ccedil;&Atilde;O F&Iacute;SICA MILITAR E ";
    out += "01 HORA DE MANUTEN&Ccedil;&Atilde;O DO CONHECIMENTO PARA OS MILITARES DE SERVI&Ccedil;O 12 HORAS E DO EXPEDIENTE&rdquo;";
    out += "</div>";



    out += "</div>"; // .page
  });

  // ASSINATURA FINAL DINAMICA COM IMAGEM
  (function(){
    var ef2   = readDB("efetivo_v6", []);
    var afst2 = readDB("afastamentos", []);
    var assinaturas = readDB("assinaturas", []);
    // Ordem de prioridade: id4=Cmt, id11=AdjCmt, id16=CoorOp
    var cadeia = [
      {id:4,  funcao:"Cmt 3&ordf; CIPMPA Araguaia"},
      {id:11, funcao:"Sub Cmt 3&ordf; CIPMPA Araguaia"},
      {id:16, funcao:"Coord. Operacional 3&ordf; CIPMPA Araguaia"}
    ];
    var ultimoDia = fim;
    var sigMil = null, sigFuncao = "";
    cadeia.some(function(c){
      var m = ef2.find(function(x){return x.id===c.id;});
      if (!m) return false;
      if ((m.status||"Ativo")==="Inativo") return false;
      var afastado = afst2.some(function(a){
        return String(a.milId)===String(c.id) && a.dataIni<=ultimoDia && (!a.dataFim||a.dataFim>=ultimoDia);
      });
      if (afastado) return false;
      sigMil = m; sigFuncao = c.funcao; return true;
    });
    if (!sigMil) { sigMil = ef2.find(function(m){return m.id===4;})||{}; sigFuncao="Cmt 3&ordf; CIPMPA Araguaia"; }
    var assSig = assinaturas.find(function(a){return String(a.milId)===String(sigMil.id);});
    var sigNome = (sigMil.grad||"")+" PM "+(sigMil.nomeGuerra||sigMil.nome||"?")+" &ndash; "+sigMil.mat;
    if(validado){
    out += "<div style=\"width:190mm;margin:0 auto;padding:5mm 5mm 10mm;\">";
    out += "<div class=\"sign\">";
    out += "<p style=\"font-size:8pt;text-align:center;margin-bottom:2mm\">Barra do Gar&ccedil;as-MT, "+emissao+"</p>";
    if (assSig && assSig.dataBase64) {
      out += "<div style=\"text-align:center;height:22mm;display:flex;align-items:flex-end;justify-content:center\"><img src=\""+assSig.dataBase64+"\" style=\"max-height:20mm;max-width:60mm\"/></div>";
    } else {
      out += "<div style=\"height:18mm\"></div>";
    }
    out += "<div class=\"sign-line\"></div>";
    out += "<div class=\"sign-name\">"+sigNome+"</div>";
    out += "<div class=\"sign-rank\">"+sigFuncao+"</div>";
    out += "</div></div>";
    } // end if(validado)
  })();

  out += "<script>window.onload=function(){window.print();};<\/script>";
  out += "</body></html>";
  return out;
}

// ── HTTP ───────────────────────────────────────────────────────────────────
var MIMES = {".html":"text/html;charset=utf-8",".js":"application/javascript",".css":"text/css",".json":"application/json"};
function jsn(res, data, code) {
  res.writeHead(code||200, {"Content-Type":"application/json",
    "Access-Control-Allow-Origin":"*",
    "X-Content-Type-Options":"nosniff",
    "X-Frame-Options":"DENY",
    "X-XSS-Protection":"1; mode=block",
    "Referrer-Policy":"no-referrer",
    "Permissions-Policy":"camera=(),microphone=(),geolocation=()"});
  res.end(JSON.stringify(data));
}

function handle(method, pathname, body, qs, res) {
  var parts = pathname.replace(/^\/api\/?/,"").split("/").filter(Boolean);
  var resource = parts[0], id = parts[1];
  var today = new Date().toISOString().split("T")[0];

  if (resource==="ping") return jsn(res, {ok:true});

  // LOGIN
  if (resource==="login" && method==="POST") {
    var users = readDB("usuarios_v2", []);
    var u = users.find(function(x){return x.login===body.login && x.senha===body.senha && x.ativo;});
    if (!u) return jsn(res, {ok:false, msg:"Matricula ou senha incorreta"}, 401);
    return jsn(res, {ok:true, user:{id:u.id,nome:u.nome,mat:u.mat,login:u.login,perfil:u.perfil,ativo:u.ativo,email:u.email||""}});
  }

  // RECUPERAR SENHA
  if (resource==="recuperar-senha" && method==="POST") {
    var users = readDB("usuarios_v2", []);
    var idx = users.findIndex(function(x){return x.login===(body.matricula||"") && x.ativo;});
    if (idx===-1) return jsn(res, {ok:false, msg:"Matricula nao encontrada"}, 404);
    var tmp = Math.floor(100000 + Math.random()*900000).toString();
    users[idx].senhaTemp = tmp;
    users[idx].senhaTempExpiry = new Date(Date.now()+3600000).toISOString();
    writeDB("usuarios_v2", users);
    return jsn(res, {ok:true, email:false, senhaTemp:tmp, nome:users[idx].nome});
  }

  // ALTERAR SENHA
  if (resource==="alterar-senha" && method==="POST") {
    var users = readDB("usuarios_v2", []);
    var idx = users.findIndex(function(x){return x.login===body.login;});
    if (idx===-1) return jsn(res, {ok:false, msg:"Usuario nao encontrado"}, 404);
    var u = users[idx];
    var ok = (u.senha===body.senhaAtual) || (u.senhaTemp===body.senhaAtual && u.senhaTempExpiry && new Date(u.senhaTempExpiry) > new Date());
    if (!ok) return jsn(res, {ok:false, msg:"Senha atual incorreta"}, 401);
    users[idx].senha = body.novaSenha;
    delete users[idx].senhaTemp; delete users[idx].senhaTempExpiry;
    writeDB("usuarios_v2", users);
    audit("ALTERAR_SENHA","USUARIOS",u.id,u.login);
    return jsn(res, {ok:true, msg:"Senha alterada com sucesso!"});
  }

  // PDF
  // RELATORIO GERAL
  if (resource==="relatorio" && id==="geral") {
    var ini2=qs.get("ini")||"",fim2=qs.get("fim")||"";
    var esc2=readDB("escalas_v5",[]);
    var af2=readDB("afastamentos",[]);
    var ef2=readDB("efetivo_v6",[]);
    if(ini2)esc2=esc2.filter(function(e){return(e.dataFim||e.dataIni)>=ini2;});
    if(fim2)esc2=esc2.filter(function(e){return e.dataIni<=fim2;});
    if(ini2)af2=af2.filter(function(a){return(!a.dataFim||a.dataFim>=ini2)&&a.dataIni<=( fim2||"9999-12-31");});
    // Por militar
    var milMap={};
    esc2.forEach(function(e){
      var h=turnoH(e.turno);
      if(e.dataFim&&e.dataFim!==e.dataIni){var d1=new Date(e.dataIni+"T12:00:00"),d2=new Date(e.dataFim+"T12:00:00");h*=(Math.round((d2-d1)/86400000)+1);}
      (e.militares||[]).forEach(function(m){
        var k=String(m.milId);
        if(!milMap[k])milMap[k]={milId:m.milId,horas:{},totalH:0};
        milMap[k].horas[e.tipo]=(milMap[k].horas[e.tipo]||0)+h;
        milMap[k].totalH+=h;
      });
    });
    // Afastamentos por tipo
    var afMap={};
    af2.forEach(function(a){
      var k=String(a.milId);if(!afMap[k])afMap[k]={};
      afMap[k][a.tipoId]=(afMap[k][a.tipoId]||0)+1;
    });
    var result=Object.values(milMap).map(function(r){
      var m=ef2.find(function(x){return String(x.id)===String(r.milId);})||{};
      return Object.assign(r,{nome:m.nome||"?",grad:m.grad||"",mat:m.mat||"",nomeGuerra:m.nomeGuerra||"",afastamentos:afMap[String(r.milId)]||{}});
    }).sort(function(a,b){return b.totalH-a.totalH;});
    return jsn(res,{militares:result,totalEscalas:esc2.length,periodo:{ini:ini2,fim:fim2}});
  }

  // Politica de privacidade LGPD
  if (resource==="privacidade" && method==="GET") {
    return jsn(res,{
      sistema:"Sistema de Escala 3a CIPMPA",
      responsavel:"3a Companhia Independente de Policia Militar de Protecao Ambiental - Araguaia",
      finalidade:"Gestao de escalas de servico, afastamentos e voluntariado de militares",
      dados_tratados:["Nome completo","RG Militar","Matricula","Horas trabalhadas","Afastamentos","Escalas de servico"],
      base_legal:"Interesse publico - Art. 23 da LGPD (Lei 13.709/2018)",
      retencao:"Dados de auditoria: 2 anos. Dados pessoais: enquanto vinculado ao orgao.",
      direitos_titular:"Acesso, correcao e exclusao de dados mediante solicitacao ao responsavel pela unidade",
      contato:"Comandante da 3a CIPMPA",
      ultima_atualizacao:"2026-04-25"
    });
  }
  if (resource==="pdf") {
    var ini = qs.get("ini")||today, fim = qs.get("fim")||today;
    var html = gerarPDF(ini, fim);
    res.writeHead(200, {"Content-Type":"text/html;charset=utf-8","Access-Control-Allow-Origin":"*"});
    return res.end(html);
  }

  // CHECK CONFLITO
  // VAGAS DE VOLUNTARIADO (criadas por operador/admin)
  if (resource==="vagas-voluntariado") {
    var db=readDB("vagas_vol",[]);
    if(method==="GET"){
      var tipo2=qs.get("tipo"),ativo=qs.get("ativo");
      var list=db.slice();
      if(tipo2)list=list.filter(function(v){return v.tipo===tipo2;});
      if(ativo==="1")list=list.filter(function(v){return v.ativo!==false;});
      return jsn(res,list.sort(function(a,b){return(a.dataIni||a.data||"").localeCompare(b.dataIni||b.data||"");}));
    }
    if(method==="POST"){
      var rec=Object.assign({},body,{id:uid(),ativo:true,inscritos:[],createdAt:new Date().toISOString()});
      db.push(rec);writeDB("vagas_vol",db);
      audit("CRIAR","VAGAS_VOL",rec.id,(body.titulo||body.tipo),body.usuario);
      return jsn(res,{ok:true,id:rec.id});
    }
    if((method==="PATCH"||method==="PUT")&&id){
      var i=db.findIndex(function(x){return x.id===id;});
      if(i===-1)return jsn(res,{error:"NF"},404);
      Object.assign(db[i],body);writeDB("vagas_vol",db);return jsn(res,db[i]);
    }
    if(method==="DELETE"&&id){writeDB("vagas_vol",db.filter(function(x){return x.id!==id;}));return jsn(res,{ok:true});}
  }

  // INSCRICAO EM VAGA (militar se inscreve)
  if (resource==="inscricao-vol") {
    var db=readDB("vagas_vol",[]);
    var vagaId=qs.get("vaga")||body.vagaId;
    var i=db.findIndex(function(x){return x.id===vagaId;});
    if(i===-1)return jsn(res,{error:"Vaga nao encontrada"},404);
    var vaga=db[i];
    var milId=String(body.milId||"");
    if(method==="POST"){
      // Verificar vagas disponiveis
      var inscritos=vaga.inscritos||[];
      if(inscritos.some(function(x){return String(x.milId)===milId;}))
        return jsn(res,{ok:false,msg:"Voce ja esta inscrito nesta vaga"},400);
      if(inscritos.length>=(vaga.vagas||99))
        return jsn(res,{ok:false,msg:"Vagas esgotadas"},400);
      // Valida prazo apenas para JE (operacoes nao tem restricao de data)
      var now=new Date();
      if(vaga.tipo==="je"){
        var dow=now.getDay();
        if(dow===0)return jsn(res,{ok:false,msg:"Prazo encerrado (inscricoes ate sexta-feira)"},400);
      }
      inscritos.push({milId:milId,inscritoEm:new Date().toISOString()});
      db[i].inscritos=inscritos;
      writeDB("vagas_vol",db);
      audit("INSCRICAO","VAGAS_VOL",vagaId,"Mil "+milId+" inscrito",milId);
      return jsn(res,{ok:true});
    }
    if(method==="DELETE"){
      db[i].inscritos=(vaga.inscritos||[]).filter(function(x){return String(x.milId)!==milId;});
      writeDB("vagas_vol",db);
      return jsn(res,{ok:true});
    }
  }

  // VOLUNTARIADO (legado - manter compatibilidade)
  if (resource==="voluntariado") {
    var db = readDB("voluntariado",[]);
    if(method==="GET"){var tipo=qs.get("tipo"),mes=qs.get("mes");var list=db.slice();if(tipo)list=list.filter(function(v){return v.tipo===tipo;});if(mes)list=list.filter(function(v){return v.mes===mes;});return jsn(res,list);}
    if(method==="POST"){var rec=Object.assign({},body,{id:uid(),createdAt:new Date().toISOString()});db.push(rec);writeDB("voluntariado",db);return jsn(res,{ok:true,id:rec.id});}
    if(method==="DELETE"&&id){writeDB("voluntariado",db.filter(function(x){return x.id!==id;}));return jsn(res,{ok:true});}
  }

  // TROCA DE SERVIÇO
  if (resource==="trocas") {
    var db=readDB("trocas",[]);
    if(method==="GET"){var mid=qs.get("mil");return jsn(res,mid?db.filter(function(t){return String(t.milOrigem)===mid||String(t.milDestino)===mid;}):db);}
    if(method==="POST"){
      var rec=Object.assign({},body,{id:uid(),status:"pendente",createdAt:new Date().toISOString()});
      db.push(rec);writeDB("trocas",db);
      audit("TROCA_SOLICITADA","TROCAS",rec.id,"Mil "+body.milOrigem+" -> Mil "+body.milDestino,body.usuario);
      return jsn(res,{ok:true,id:rec.id});
    }
    if((method==="PATCH"||method==="PUT")&&id){
      var i=db.findIndex(function(x){return x.id===id;});
      if(i===-1)return jsn(res,{error:"NF"},404);
      Object.assign(db[i],body);writeDB("trocas",db);
      return jsn(res,db[i]);
    }
  }

  // TROCAS DE SERVICO
  if (resource==="trocas") {
    var db=readDB("trocas",[]);
    if(method==="GET"){
      var mid=qs.get("mil"),sta=qs.get("status");
      var list=db.slice();
      if(mid)list=list.filter(function(t){return String(t.milOrigem)===mid||String(t.milDestino)===mid;});
      if(sta)list=list.filter(function(t){return t.status===sta;});
      return jsn(res,list.sort(function(a,b){return b.createdAt.localeCompare(a.createdAt);}));
    }
    if(method==="POST"){
      var rec=Object.assign({},body,{id:uid(),status:"pendente_aceite",createdAt:new Date().toISOString()});
      db.push(rec);writeDB("trocas",db);
      audit("TROCA_SOLICITADA","TROCAS",rec.id,"Mil "+body.milOrigem+" -> Mil "+body.milDestino,(body.usuario||"Sistema"));
      return jsn(res,{ok:true,id:rec.id});
    }
    if((method==="PATCH"||method==="PUT")&&id){
      var i=db.findIndex(function(x){return x.id===id;});
      if(i===-1)return jsn(res,{error:"NF"},404);
      Object.assign(db[i],body);
      db[i].updatedAt=new Date().toISOString();
      writeDB("trocas",db);
      audit("TROCA_"+String(body.status||"UPDATE").toUpperCase(),"TROCAS",id,"",(body.validadoPor||"Sistema"));
      return jsn(res,db[i]);
    }
    if(method==="DELETE"&&id){writeDB("trocas",db.filter(function(x){return x.id!==id;}));return jsn(res,{ok:true});}
  }

  // TRAMITAR
  if (resource==="tramitar" && method==="POST") {
    var tr=readDB("tramites",[]);
    var rec={id:uid(),dataIni:body.dataIni,dataFim:body.dataFim,
      status:"pendente",tramitadoPor:body.tramitadoPor||"Sistema",
      tramitadoEm:new Date().toISOString(),validadoPor:null,validadoEm:null};
    tr=tr.filter(function(t){return !(t.dataIni===body.dataIni&&t.dataFim===body.dataFim);});
    tr.push(rec); writeDB("tramites",tr);
    audit("TRAMITAR","ESCALA",rec.id,body.dataIni+"->"+body.dataFim,body.tramitadoPor);
    return jsn(res,{ok:true,id:rec.id});
  }
  if (resource==="tramitar" && method==="GET") {
    return jsn(res,readDB("tramites",[]));
  }
  if (resource==="validar" && method==="POST") {
    var tr=readDB("tramites",[]);
    var idx=tr.findIndex(function(t){return t.id===body.tramiteId;});
    if(idx===-1)return jsn(res,{ok:false,msg:"Tramite nao encontrado"},404);
    tr[idx].status="validado"; tr[idx].validadoPor=body.validadoPor; tr[idx].validadoEm=new Date().toISOString();
    writeDB("tramites",tr);
    audit("VALIDAR","ESCALA",body.tramiteId,"Validado por "+body.validadoPor,body.validadoPor);
    return jsn(res,{ok:true});
  }
  if (resource==="assinaturas") {
    var db=readDB("assinaturas",[]);
    if(method==="GET"&&!id)return jsn(res,db);
    if(method==="POST"){
      var ei=db.findIndex(function(a){return String(a.milId)===String(body.milId);});
      var rec=Object.assign({},body,{updatedAt:new Date().toISOString()});
      if(ei>=0)db[ei]=rec;else db.push(rec);
      writeDB("assinaturas",db);return jsn(res,{ok:true});
    }
    if(method==="DELETE"&&id){writeDB("assinaturas",db.filter(function(a){return String(a.milId)!==id;}));return jsn(res,{ok:true});}
  }
  if (resource==="backup"&&method==="GET"){
    var bk={};
    ["efetivo_v6","funcoes_v2","turnos","tservico_v5","locais","tiposAfst","usuarios_v2","escalas_v5","afastamentos","auditoria","assinaturas","tramites"].forEach(function(n){bk[n]=readDB(n,[]);});
    bk._ts=new Date().toISOString();bk._v="7.0";
    res.writeHead(200,{"Content-Type":"application/json","Content-Disposition":"attachment; filename=backup_3cipmpa_"+new Date().toISOString().split("T")[0]+".json","Access-Control-Allow-Origin":"*"});
    return res.end(JSON.stringify(bk,null,2));
  }
  if (resource==="backup"&&method==="POST"){
    try{var bk=body;var ok=0;
      ["efetivo_v6","funcoes_v2","turnos","tservico_v5","locais","tiposAfst","usuarios_v2","escalas_v5","afastamentos","auditoria","assinaturas"].forEach(function(n){if(bk[n]){writeDB(n,bk[n]);ok++;}});
      return jsn(res,{ok:true,tabelas:ok,ts:bk._ts||"?"});
    }catch(e){return jsn(res,{ok:false,msg:String(e)},400);}
  }
  if (resource==="duplicar-dia" && method==="POST") {
    var db=readDB("escalas_v5",[]);var origem=body.dataOrigem;var destinos=body.dataDestinos||[];
    if(!origem||!destinos.length)return jsn(res,{ok:false,msg:"Informe origem e destinos"},400);
    var tipoFiltro=body.tipoFiltro||"";
    var escOrigem=db.filter(function(e){
      var dMatch=e.dataIni===origem&&(e.dataFim===origem||!e.dataFim||e.dataFim===origem);
      var tMatch=!tipoFiltro||e.tipo===tipoFiltro;
      return dMatch&&tMatch;
    });
    if(!escOrigem.length)return jsn(res,{ok:false,msg:"Nenhuma escala neste dia"},404);
    var criados=0;
    destinos.forEach(function(dest){
      escOrigem.forEach(function(e){
        var jaExiste=db.some(function(x){return x.dataIni===dest&&x.tipo===e.tipo&&JSON.stringify((x.militares||[]).map(function(m){return m.milId;}))=== JSON.stringify((e.militares||[]).map(function(m){return m.milId;}));});
        if(jaExiste)return;
        db.push(Object.assign({},e,{id:uid(),dataIni:dest,dataFim:dest,createdAt:new Date().toISOString()}));criados++;
      });
    });
    writeDB("escalas_v5",db);
    audit("CRIAR","ESCALA","dup","Duplicado de "+origem+" para "+destinos.join(","),(body.usuario||"Sistema"));
    return jsn(res,{ok:true,criados:criados});
  }

  if (resource==="check-descanso") {
    var db = readDB("escalas_v5", []);
    var alts = checkDescanso(qs.get("mil"), qs.get("ini"), qs.get("hor"), qs.get("tipo"), db, null);
    return jsn(res, {alertas:alts});
  }
  // DUPLICAR DIA
  if (resource==="duplicar-dia" && method==="POST") {
    var db = readDB("escalas_v5", []);
    var origem = body.dataOrigem;
    var destinos = body.dataDestinos || [];
    if (!origem || !destinos.length) return jsn(res, {ok:false, msg:"Informe origem e destinos"}, 400);
    var escOrigem = db.filter(function(e){
      return e.dataIni === origem && (e.dataFim === origem || !e.dataFim || e.dataFim === origem);
    });
    if (!escOrigem.length) return jsn(res, {ok:false, msg:"Nenhuma escala neste dia"}, 404);
    var criados = 0;
    destinos.forEach(function(dest){
      escOrigem.forEach(function(e){
        // Checar se ja existe escala igual no destino
        var jaExiste = db.some(function(x){
          return x.dataIni===dest && x.tipo===e.tipo &&
            JSON.stringify((x.militares||[]).map(function(m){return m.milId;})) ===
            JSON.stringify((e.militares||[]).map(function(m){return m.milId;}));
        });
        if (jaExiste) return;
        var novo = Object.assign({}, e, {
          id: uid(),
          dataIni: dest,
          dataFim: dest,
          createdAt: new Date().toISOString()
        });
        db.push(novo);
        criados++;
      });
    });
    writeDB("escalas_v5", db);
    audit("CRIAR","ESCALA","dup","Duplicado de "+origem+" para "+destinos.join(","),(body.usuario||"Sistema"));
    return jsn(res, {ok:true, criados:criados});
  }

  if (resource==="check-conflito") {
    var db = readDB("escalas_v5", []);
    var conf = checkConflito(qs.get("mil"), qs.get("ini"), qs.get("fim")||qs.get("ini"), db, null, qs.get("hor"), qs.get("turno"));
    return jsn(res, {conflitos:conf});
  }

  // EFETIVO
  if (resource==="efetivo") {
    var db = readDB("efetivo_v6", []);
    if (method==="GET" && !id) {
      var afst = readDB("afastamentos", []);
      return jsn(res, db.map(function(m) {
        var isA = afst.some(function(a){return String(a.milId)===String(m.id) && a.dataIni<=today && (!a.dataFim||a.dataFim>=today);});
        return Object.assign({}, m, {statusFinal: isA?"Afastado":(m.status||"Ativo")});
      }));
    }
    if (method==="POST") {
      var last = db.reduce(function(mx,m){return Math.max(mx,typeof m.id==="number"?m.id:0);},0);
      var rec = Object.assign({}, body, {id:last+1, createdAt:new Date().toISOString()});
      if (!rec.nomeGuerra) rec.nomeGuerra = rec.nome.split(" ").pop().toUpperCase();
      db.push(rec); writeDB("efetivo_v6", db); audit("CRIAR","EFETIVO",rec.id,rec.nome);
      return jsn(res, rec, 201);
    }
    if ((method==="PATCH"||method==="PUT") && id) {
      var i = db.findIndex(function(x){return String(x.id)===id;});
      if (i===-1) return jsn(res, {error:"NF"}, 404);
      Object.assign(db[i], body); writeDB("efetivo_v6", db);
      audit("ATUALIZAR","EFETIVO",id,JSON.stringify(body));
      return jsn(res, db[i]);
    }
    if (method==="DELETE" && id) {
      var i = db.findIndex(function(x){return String(x.id)===id;});
      if (i===-1) return jsn(res, {error:"NF"}, 404);
      var r = db.splice(i,1)[0]; writeDB("efetivo_v6", db); audit("EXCLUIR","EFETIVO",id,r.nome);
      return jsn(res, {ok:true});
    }
  }

  // ESCALAS
  if (resource==="escalas") {
    var db = readDB("escalas_v5", []);
    if (method==="GET" && !id) {
      var list = db.slice();
      var ini=qs.get("ini"),fim=qs.get("fim"),mil=qs.get("mil"),tipo=qs.get("tipo");
      if (ini) list=list.filter(function(e){return (e.dataFim||e.dataIni)>=ini;});
      if (fim) list=list.filter(function(e){return e.dataIni<=fim;});
      if (mil) list=list.filter(function(e){return (e.militares||[]).some(function(m){return String(m.milId)===mil;});});
      if (tipo) list=list.filter(function(e){return e.tipo===tipo;});
      return jsn(res, list.sort(function(a,b){return a.dataIni.localeCompare(b.dataIni)||a.hor.localeCompare(b.hor);}));
    }
    if (method==="POST") {
      var rec = Object.assign({}, body, {id:uid(), createdAt:new Date().toISOString()});
      // Verificar conflito
      var erros = [];
      (rec.militares||[]).forEach(function(m) {
        var conf = checkConflito(m.milId, rec.dataIni, rec.dataFim, db, null, rec.hor, rec.turno);
        if (conf.length) {
          var mil2 = readDB("efetivo_v6",[]).find(function(x){return String(x.id)===String(m.milId);})||{};
          erros.push({milId:m.milId, nome:mil2.nome||String(m.milId), conflitos:conf});
        }
      });
      if (erros.length && !body.forcarConflito) return jsn(res, {conflito:true, erros:erros}, 409);
      // Verificar descanso minimo
      if (!body.forcarDescanso) {
        var descansoErros = [];
        (rec.militares||[]).forEach(function(m) {
          var alts = checkDescanso(m.milId, rec.dataIni, rec.hor, rec.tipo, db, null);
          if (alts.length) {
            var ef2 = readDB("efetivo_v6",[]).find(function(x){return String(x.id)===String(m.milId);})||{};
            descansoErros.push({milId:m.milId, nome:ef2.nome||String(m.milId), alertas:alts});
          }
        });
        if (descansoErros.length) return jsn(res, {descansoAlert:true, erros:descansoErros}, 409);
      }
      // Verificar JE 50h
      if (rec.tipo==="je" && !body.forcarJE) {
        var jeA = [], hE = calcH(rec);
        (rec.militares||[]).forEach(function(m) {
          var cur = horasJE(m.milId, db);
          if (cur+hE > 50) {
            var mil2 = readDB("efetivo_v6",[]).find(function(x){return String(x.id)===String(m.milId);})||{};
            jeA.push({milId:m.milId, nome:mil2.nome||String(m.milId), atual:cur, adicionar:hE, total:cur+hE});
          }
        });
        if (jeA.length) return jsn(res, {jeAlert:true, militares:jeA}, 409);
      }
      db.push(rec); writeDB("escalas_v5", db);
      audit("CRIAR","ESCALA",rec.id,rec.tipo+" "+rec.dataIni+(rec.dataFim&&rec.dataFim!==rec.dataIni?"->"+rec.dataFim:""),body.usuario);
      return jsn(res, rec, 201);
    }
    if ((method==="PATCH"||method==="PUT") && id) {
      var i = db.findIndex(function(x){return x.id===id;});
      if (i===-1) return jsn(res,{error:"NF"},404);
      Object.assign(db[i], body);
      writeDB("escalas_v5", db);
      audit("EDITAR","ESCALA",id,db[i].tipo+" "+db[i].dataIni,(body.usuario||"Sistema"));
      return jsn(res, db[i]);
    }
    if (method==="DELETE" && id) {
      var e = db.find(function(x){return x.id===id;});
      writeDB("escalas_v5", db.filter(function(x){return x.id!==id;}));
      if (e) audit("EXCLUIR","ESCALA",id,e.tipo+" "+e.dataIni);
      return jsn(res, {ok:true});
    }
  }

  // RELATORIO HORAS
  if (resource==="relatorio" && id==="horas") {
    var db = readDB("escalas_v5",[]), ef = readDB("efetivo_v6",[]);
    var tipo = qs.get("tipo")||"";
    var lista = tipo ? db.filter(function(e){return e.tipo===tipo;}) : db;
    var horas = {};
    lista.forEach(function(e) {
      var h = calcH(e);
      (e.militares||[]).forEach(function(m) {
        var k = String(m.milId);
        if (!horas[k]) horas[k] = {milId:m.milId, total:0, porTipo:{}};
        horas[k].total += h;
        horas[k].porTipo[e.tipo] = (horas[k].porTipo[e.tipo]||0) + h;
      });
    });
    return jsn(res, Object.values(horas).map(function(r) {
      var m = ef.find(function(x){return String(x.id)===String(r.milId);})||{};
      return Object.assign(r, {nome:m.nome||"?",grad:m.grad||"",mat:m.mat||"",nomeGuerra:m.nomeGuerra||""});
    }).sort(function(a,b){return b.total-a.total;}));
  }

  // AFASTAMENTOS
  if (resource==="afastamentos") {
    var db = readDB("afastamentos",[]);
    if (method==="GET") {
      var mil=qs.get("mil"),sit=qs.get("sit");
      if (mil) db=db.filter(function(a){return String(a.milId)===mil;});
      if (sit==="ativo") db=db.filter(function(a){return a.dataIni<=today&&(!a.dataFim||a.dataFim>=today);});
      if (sit==="enc")   db=db.filter(function(a){return a.dataFim&&a.dataFim<today;});
      return jsn(res, db.sort(function(a,b){return b.dataIni.localeCompare(a.dataIni);}));
    }
    if (method==="POST") {
      var rec = Object.assign({}, body, {id:uid(), createdAt:new Date().toISOString()});
      db.push(rec); writeDB("afastamentos", db); return jsn(res, rec, 201);
    }
    if (method==="DELETE" && id) { writeDB("afastamentos", db.filter(function(x){return x.id!==id;})); return jsn(res, {ok:true}); }
  }

  // AUDITORIA
  if (resource==="auditoria") {
    var db = readDB("auditoria",[]);
    if (method==="GET") return jsn(res, db.slice(0,200));
    if (method==="DELETE") { writeDB("auditoria",[]); return jsn(res,{ok:true}); }
  }

  // TABELAS GENÉRICAS
  var TBLS = {"funcoes":"funcoes_v2","turnos":"turnos","tipos-servico":"tservico_v5","locais":"locais","tipos-afst":"tiposAfst","usuarios":"usuarios_v2"};
  if (TBLS[resource]) {
    var dbN = TBLS[resource], db = readDB(dbN,[]);
    if (method==="GET" && !id) {
      if (resource==="usuarios") {
        return jsn(res, db.map(function(u){return {id:u.id,nome:u.nome,mat:u.mat||u.login,login:u.login,email:u.email||"",perfil:u.perfil,ativo:u.ativo,createdAt:u.createdAt};}));
      }
      return jsn(res, db);
    }
    if (method==="POST") { var rec=Object.assign({},body,{id:body.id||uid(),createdAt:new Date().toISOString()}); db.push(rec); writeDB(dbN,db); return jsn(res,rec,201); }
    if ((method==="PATCH"||method==="PUT") && id) { var i=db.findIndex(function(x){return String(x.id)===id;}); if(i===-1)return jsn(res,{error:"NF"},404); Object.assign(db[i],body); writeDB(dbN,db); return jsn(res,db[i]); }
    if (method==="DELETE" && id) { writeDB(dbN, db.filter(function(x){return String(x.id)!==id;})); return jsn(res,{ok:true}); }
  }

  jsn(res, {error:"Not found"}, 404);
}

var server = http.createServer(function(req, res) {
  if (req.method==="OPTIONS") {
    res.writeHead(204, {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,PUT,PATCH,DELETE","Access-Control-Allow-Headers":"Content-Type"});
    return res.end();
  }
  var URL2 = (typeof URL !== "undefined") ? URL : require("url").URL;
  var url = new URL2(req.url, "http://localhost:"+PORT);
  if (!url.pathname.startsWith("/api")) {
    // Favicon inline (small green square)
    if (url.pathname==="/favicon.ico") {
      var ico=Buffer.from("AAABAAEAEBAQAAEABAAoAQAAFgAAACgAAAAQAAAAIAAAAAEABAAAAAAAgAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAA/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","base64");
      res.writeHead(200,{"Content-Type":"image/x-icon"});
      return res.end(ico);
    }
    var fp = url.pathname==="/" ? "/index.html" : url.pathname;
    var full = path.join(PUBLIC, fp), ext = path.extname(full);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      res.writeHead(200, {
        "Content-Type":MIMES[ext]||"text/plain",
        "X-Frame-Options":"DENY",
        "X-Content-Type-Options":"nosniff",
        "X-XSS-Protection":"1; mode=block",
        "Referrer-Policy":"no-referrer",
        "Content-Security-Policy":"default-src 'self';script-src 'self' 'unsafe-inline' https://fonts.googleapis.com;style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com;font-src 'self' https://fonts.gstatic.com;img-src 'self' data:;connect-src 'self';"
      });
      return res.end(fs.readFileSync(full));
    }
    res.writeHead(404); return res.end("Not found");
  }
  var body = "";
  req.on("data", function(c){body+=c;});
  req.on("end", function() {
    var p = {}; try{p=body?JSON.parse(body):{};}catch(e){}
    res.setHeader("Content-Type","application/json");
    res.setHeader("Access-Control-Allow-Origin","*");
    try { handle(req.method.toUpperCase(), url.pathname, p, url.searchParams, res); }
    catch(e) { console.error(e); res.writeHead(500); res.end(JSON.stringify({error:String(e)})); }
  });
});

server.on("error", function(e) {
  console.log("ERRO: "+e.message);
  if (e.code==="EADDRINUSE") console.log("Porta "+PORT+" ja em uso. Feche outros programas e tente novamente.");
  process.exit(1);
});

// Migrate on startup
(function(){
  var udb = readDB("usuarios_v2", []);
  var changed = false;
  udb.forEach(function(u){
    if(u.perfil==="Visualizador"){u.perfil="Usuario";changed=true;}
  });
  if(changed) writeDB("usuarios_v2", udb);
  // Migrar senhas legado
  if(typeof migrarSenhas === "function") migrarSenhas();
  // Log de inicializacao
  var logEntry = {ts:new Date().toISOString(),evento:"SISTEMA_INICIADO",versao:"7.2",
    node:process.version,pid:process.pid};
  console.log("[SISTEMA]", JSON.stringify(logEntry));
})();

server.listen(PORT, function() {
  console.log("================================================");
  console.log(" 3a CIPMPA - Sistema de Escala v7.0");
  console.log(" Acesse: http://localhost:"+PORT);
  console.log(" Matricula: 883039  Senha: 883039");
  console.log(" Matricula: 884507  Senha: 884507");
  console.log("================================================");
  var exec = require("child_process").exec, p = process.platform;
  if (p==="win32") exec("start http://localhost:"+PORT);
  else if (p==="darwin") exec("open http://localhost:"+PORT);
  else exec("xdg-open http://localhost:"+PORT);
});
