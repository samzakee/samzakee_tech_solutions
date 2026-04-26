const http = require("http");
const fs   = require("fs");
const path = require("path");
const net  = require("net");
const tls  = require("tls");
const PORT = 3000;
const DATA = path.join(__dirname, "data");
const PUBLIC = path.join(__dirname, "public");
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, {recursive:true});

function readDB(n,def){try{return JSON.parse(fs.readFileSync(path.join(DATA,n+".json"),"utf8"));}catch(e){return JSON.parse(JSON.stringify(def));}}
function writeDB(n,d){fs.writeFileSync(path.join(DATA,n+".json"),JSON.stringify(d,null,2));}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}

// ── SMTP EMAIL (sem dependencias externas) ─────────────────────────────────
function smtpSend(cfg,from,to,subject,body,cb){
  var lines=[];
  function send(s,fn){lines.push({cmd:s,fn:fn});}
  var socket,step=0,buf="";
  var cmds=[
    null, // greeting
    "EHLO localhost",
    "AUTH LOGIN",
    Buffer.from(cfg.user).toString("base64"),
    Buffer.from(cfg.pass).toString("base64"),
    "MAIL FROM:<"+from+">",
    "RCPT TO:<"+to+">",
    "DATA",
    "From: Sistema 3a CIPMPA <"+from+">\r\nTo: "+to+"\r\nSubject: "+subject+"\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n"+body+"\r\n.",
    "QUIT"
  ];
  var ci=0;
  function connect(){
    if(cfg.ssl){
      socket=tls.connect({host:cfg.host,port:cfg.port||465,rejectUnauthorized:false},onConnect);
    } else {
      socket=net.createConnection({host:cfg.host,port:cfg.port||587},onConnect);
    }
    socket.setEncoding("utf8");
    socket.on("data",function(d){
      buf+=d;
      if(buf.indexOf("\n")===-1)return;
      var line=buf.trim();buf="";
      if(line.startsWith("220")||line.startsWith("235")||line.startsWith("250")||line.startsWith("334")||line.startsWith("354")||line.startsWith("221")){
        ci++;
        var cmd=cmds[ci];
        if(cmd===null){socket.write("QUIT\r\n");return;}
        socket.write(cmd+"\r\n");
      } else if(line.startsWith("354")){
        socket.write(cmds[8]+"\r\n");
      } else if(line.startsWith("5")||line.startsWith("4")){
        socket.destroy();cb(new Error("SMTP error: "+line));
      }
    });
    socket.on("end",function(){cb(null);});
    socket.on("error",function(e){cb(e);});
  }
  function onConnect(){
    // wait for greeting
  }
  connect();
}

// ── SMTP Config file ────────────────────────────────────────────────────────
function getSmtpCfg(){
  try{return JSON.parse(fs.readFileSync(path.join(DATA,"smtp.json"),"utf8"));}
  catch(e){return null;}
}

// ── DATA ────────────────────────────────────────────────────────────────────
const DEF_EF=[
  {id:1,  nome:"Dayanne Alves da Silva",           nomeGuerra:"DAYANNE",     mat:"881405",grad:"3 SGT PM",  status:"Ativo"},
  {id:2,  nome:"Edmilson Lima Macedo",              nomeGuerra:"MACEDO",      mat:"880888",grad:"SUB TEN PM",status:"Ativo"},
  {id:3,  nome:"Evaldo Moreira de Araujo Junior",   nomeGuerra:"EVALDO",      mat:"883664",grad:"3 SGT PM",  status:"Ativo"},
  {id:4,  nome:"Flavio Pereira Diniz",              nomeGuerra:"DINIZ",       mat:"883039",grad:"TEN CEL PM",status:"Ativo"},
  {id:5,  nome:"Hernandes Aquino Custodio",         nomeGuerra:"HERNANDES",   mat:"884360",grad:"3 SGT PM",  status:"Ativo"},
  {id:6,  nome:"Kassio de Jesus Rocha",             nomeGuerra:"KASSIO",      mat:"882979",grad:"2 SGT PM",  status:"Ativo"},
  {id:7,  nome:"Kleber da Silva Machado",           nomeGuerra:"KLEBER",      mat:"883449",grad:"1 SGT PM",  status:"Ativo"},
  {id:8,  nome:"Luciene Alves de Sousa Lima",       nomeGuerra:"LUCIENE",     mat:"885180",grad:"3 SGT PM",  status:"Ativo"},
  {id:9,  nome:"Luiz Henrique Woiciechowski Cunha", nomeGuerra:"CUNHA",       mat:"885783",grad:"2 SGT PM",  status:"Ativo"},
  {id:10, nome:"Marcelo Ricardo de Campos Santos",  nomeGuerra:"CAMPOS",      mat:"883078",grad:"2 SGT PM",  status:"Ativo"},
  {id:11, nome:"Matheus Carolo do Nascimento",      nomeGuerra:"CAROLO",      mat:"885518",grad:"MAJ PM",    status:"Ativo"},
  {id:12, nome:"Mereles Moreira dos Santos Junior", nomeGuerra:"SANTOS JUNIOR",mat:"882960",grad:"2 SGT PM", status:"Ativo"},
  {id:13, nome:"Nubia Katiane de Jesus Rocha",      nomeGuerra:"NUBIA",       mat:"880888",grad:"1 SGT PM",  status:"Ativo"},
  {id:14, nome:"Samuel Ribeiro dos Santos",         nomeGuerra:"R. SANTOS",   mat:"884507",grad:"3 SGT PM",  status:"Ativo"},
  {id:15, nome:"Samuel Vilas Boa Goncalves",        nomeGuerra:"VILAS",       mat:"882031",grad:"1 SGT PM",  status:"Ativo"},
  {id:16, nome:"Sidiney Pereira dos Santos",        nomeGuerra:"SIDINEY",     mat:"879064",grad:"1 TEN PM",  status:"Ativo"},
  {id:17, nome:"Wanderson Ferreira Alves",          nomeGuerra:"F. ALVES",    mat:"886672",grad:"CB PM",     status:"Ativo"},
  {id:18, nome:"Weuller da Costa Moraes",           nomeGuerra:"WEULLER",     mat:"882935",grad:"1 SGT PM",  status:"Ativo"},
  {id:19, nome:"Joao Paulo Alves de Freitas Diniz", nomeGuerra:"J.P. DINIZ",  mat:"886589",grad:"CB PM",     status:"Ativo"},
  {id:20, nome:"Carlos",   nomeGuerra:"CARLOS",   mat:"878036",grad:"3 SGT PM RR A",status:"Ativo"},
  {id:21, nome:"Abreu",    nomeGuerra:"ABREU",    mat:"875668",grad:"CB PM RR",     status:"Ativo"},
  {id:22, nome:"Roberto",  nomeGuerra:"ROBERTO",  mat:"875645",grad:"CB PM RR",     status:"Ativo"},
  {id:23, nome:"Luz",      nomeGuerra:"LUZ",      mat:"875666",grad:"CB PM RR",     status:"Ativo"},
  {id:24, nome:"Pimentel", nomeGuerra:"PIMENTEL", mat:"875584",grad:"CB PM RR",     status:"Ativo"},
  {id:25, nome:"Joao",     nomeGuerra:"JOAO",     mat:"875506",grad:"CB PM RR",     status:"Ativo"}
];
const DEF_FUNCOES=[
  {id:"f1",nome:"Comandante de Unidade"},{id:"f2",nome:"Comandante Adjunto"},
  {id:"f3",nome:"Coordenador Operacional"},{id:"f4",nome:"Auxiliar Administrativo"},
  {id:"f5",nome:"Chefe de Sistemica"},{id:"f6",nome:"Comandante de Guarnicao"},
  {id:"f7",nome:"Comandante de Operacao"},{id:"f8",nome:"Motorista"},
  {id:"f9",nome:"Patrulheiro"},{id:"f10",nome:"Navegador"},
  {id:"f11",nome:"Analista"},{id:"f12",nome:"Apoio"}
];
const DEF_TURNOS=[{id:"t1",nome:"6 horas"},{id:"t2",nome:"8 horas"},{id:"t3",nome:"12 horas"},{id:"t4",nome:"24 horas"}];
const DEF_TSERV=[
  {id:"expediente",  label:"Expediente",          hor:"13:00",turno:"6 horas",  cor:"amber",ativo:true},
  {id:"diario",      label:"Servico Diario",       hor:"07:00",turno:"12 horas", cor:"gray", ativo:true},
  {id:"guarda",      label:"Guarda",               hor:"07:00",turno:"24 horas", cor:"blue", ativo:true},
  {id:"patrulhamento",label:"Patrulhamento Urbano",hor:"07:00",turno:"12 horas", cor:"teal", ativo:true},
  {id:"flora",       label:"Operacao Flora",        hor:"07:00",turno:"12 horas", cor:"green",ativo:true},
  {id:"fauna",       label:"Operacao Fauna",        hor:"07:00",turno:"12 horas", cor:"green",ativo:true},
  {id:"indea",       label:"Apoio INDEA",           hor:"07:00",turno:"12 horas", cor:"amber",ativo:true},
  {id:"ibama",       label:"Apoio IBAMA",           hor:"07:00",turno:"12 horas", cor:"amber",ativo:true},
  {id:"sema",        label:"Apoio SEMA",            hor:"07:00",turno:"12 horas", cor:"amber",ativo:true},
  {id:"prefeitura",  label:"Apoio Prefeitura",      hor:"07:00",turno:"12 horas", cor:"amber",ativo:true},
  {id:"educacao",    label:"Educacao Ambiental",     hor:"07:00",turno:"8 horas",  cor:"blue", ativo:true},
  {id:"je",          label:"Jornada Extraordinaria",hor:"07:00",turno:"8 horas",  cor:"red",  ativo:true}
];
const DEF_LOCAIS=[
  {id:"l1",nome:"Sede - 3a CIPMPA",ativo:true},{id:"l2",nome:"Area Urbana - Barra do Garcas",ativo:true},
  {id:"l3",nome:"Parque Estadual do Araguaia",ativo:true},{id:"l4",nome:"Parque Est. Gruta da Lagoa Azul",ativo:true},
  {id:"l5",nome:"Area Rural",ativo:true},{id:"l6",nome:"IBAMA Regional",ativo:true},
  {id:"l7",nome:"INDEA Regional",ativo:true},{id:"l8",nome:"SEMA Estadual",ativo:true},
  {id:"l9",nome:"Prefeitura Municipal",ativo:true}
];
const DEF_TAFST=[
  {id:"ta1",nome:"Ferias",afeta:true},{id:"ta2",nome:"Licenca Premio",afeta:true},
  {id:"ta3",nome:"Licenca Tratamento Interesse Particular",afeta:true},
  {id:"ta4",nome:"Licenca Maternidade",afeta:true},{id:"ta5",nome:"Licenca Paternidade",afeta:false},
  {id:"ta6",nome:"Licenca Tratamento Saude",afeta:true},{id:"ta7",nome:"Licenca Especial",afeta:true}
];
const DEF_USERS=[
  {id:"u1",nome:"Flavio Pereira Diniz",      mat:"883039",login:"883039",senha:"883039",email:"",perfil:"Administrador",ativo:true,createdAt:new Date().toISOString()},
  {id:"u2",nome:"Samuel Ribeiro dos Santos", mat:"884507",login:"884507",senha:"884507",email:"",perfil:"Administrador",ativo:true,createdAt:new Date().toISOString()},
  {id:"u3",nome:"Desenvolvedor Sistema",     mat:"000000",login:"000000",senha:"dev@3cipmpa",email:"",perfil:"Desenvolvedor",ativo:true,createdAt:new Date().toISOString()}
];

function initDB(){
  [["efetivo_v6",DEF_EF],["funcoes_v2",DEF_FUNCOES],["turnos",DEF_TURNOS],
   ["tservico_v5",DEF_TSERV],["locais",DEF_LOCAIS],["tiposAfst",DEF_TAFST],
   ["usuarios_v2",DEF_USERS],["escalas_v5",[]],["afastamentos",[]],["auditoria",[]]
  ].forEach(function(d){if(!fs.existsSync(path.join(DATA,d[0]+".json")))writeDB(d[0],d[1]);});
  // Migrate existing users to add email field if missing
  var u=readDB("usuarios_v2",[]);
  var changed=false;
  u.forEach(function(x){if(!x.hasOwnProperty("email")){x.email="";changed=true;}});
  if(changed)writeDB("usuarios_v2",u);
}
initDB();

// Migracao: garantir que usuarios tenham senha e email
(function migrateUsers(){
  try{
    var fp=require("path").join(DATA,"usuarios_v2.json");
    if(!fs.existsSync(fp))return;
    var u=JSON.parse(fs.readFileSync(fp,"utf8"));
    var changed=false;
    u.forEach(function(x){
      if(!x.senha){x.senha=x.login||x.mat||"123456";changed=true;}
      if(!x.login&&x.mat){x.login=x.mat;changed=true;}
      if(!x.hasOwnProperty("email")){x.email="";changed=true;}
      if(!x.hasOwnProperty("ativo")){x.ativo=true;changed=true;}
    });
    if(changed){fs.writeFileSync(fp,JSON.stringify(u,null,2));console.log("Usuarios migrados.");}
  }catch(e){console.log("Aviso migracao:",e.message);}
})();


function audit(acao,tab,id,det,usr){
  var log=readDB("auditoria",[]);
  log.unshift({id:uid(),ts:new Date().toISOString(),usuario:usr||"Sistema",acao:acao,tabela:tab,regId:String(id),det:String(det)});
  if(log.length>500)log.length=500;
  writeDB("auditoria",log);
}

function turnoH(t){return({"6 horas":6,"8 horas":8,"12 horas":12,"24 horas":24})[t]||0;}
function calcH(e){
  var h=turnoH(e.turno);
  if(e.dataFim&&e.dataFim!==e.dataIni){
    var d1=new Date(e.dataIni+"T12:00:00"),d2=new Date(e.dataFim+"T12:00:00");
    return h*(Math.round((d2-d1)/86400000)+1);
  }
  return h;
}
function horasJE(milId,escalas){
  var t=0;
  escalas.filter(function(e){return e.tipo==="je";}).forEach(function(e){
    if((e.militares||[]).some(function(m){return String(m.milId)===String(milId);}))t+=calcH(e);
  });
  return t;
}
function checkConflito(milId,dataIni,dataFim,escalas,excludeId){
  dataFim=dataFim||dataIni;var conf=[];
  escalas.filter(function(e){return (!excludeId||e.id!==excludeId);}).forEach(function(e){
    var ef=e.dataFim||e.dataIni;
    if(!(e.dataIni<=dataFim&&ef>=dataIni))return;
    if((e.militares||[]).some(function(m){return String(m.milId)===String(milId);})){
      var ts=readDB("tservico_v5",[]).find(function(t){return t.id===e.tipo;})||{label:e.tipo};
      conf.push({escalaId:e.id,tipo:e.tipo,tipoLabel:ts.label,dataIni:e.dataIni,dataFim:e.dataFim||e.dataIni});
    }
  });
  return conf;
}

// ── PDF HTML ────────────────────────────────────────────────────────────────
function gerarPDF(escalas,ef,tserv,locais,ini,fim){
  var DIAS=["Domingo","Segunda-Feira","Terca-Feira","Quarta-Feira","Quinta-Feira","Sexta-Feira","Sabado"];
  var MESES=["JANEIRO","FEVEREIRO","MARCO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];
  function fD(s){var p=s.split("-");return p[2]+"/"+p[1]+"/"+p[0];}
  function fDL(s){var d=new Date(s+"T12:00:00");return d.getDate()+" DE "+MESES[d.getMonth()]+" DE "+d.getFullYear();}
  function dayN(s){var d=new Date(s+"T12:00:00");return DIAS[d.getDay()].toUpperCase();}
  function addH(hor,t){if(!hor)return"--";var p=hor.split(":");var h=parseInt(p[0]);h+=turnoH(t);if(h>=24)h-=24;return String(h).padStart(2,"0")+"H"+(p[1]||"00")+"MIN";}
  function hL(hor){if(!hor)return"--";return hor.replace(":","H")+"MIN";}
  function gM(id){return ef.find(function(m){return String(m.id)===String(id);})||{};}
  function gT(id){return tserv.find(function(t){return t.id===id;})||{label:id.toUpperCase(),hor:"07:00",turno:"12 horas"};}
  function gL(id){return locais.find(function(l){return l.id===id;});}
  function fnLabel(f){var m={"Comandante de Unidade":"COMANDANTE DA 3\u00ba CIPMPA","Comandante Adjunto":"SUB COMANDANTE DA 3\u00ba CIPMPA","Coordenador Operacional":"COORDENADOR OPERACIONAL","Auxiliar Administrativo":"AUX ADMINISTRATIVO","Chefe de Sistemica":"CHEFE DE SISTEM\u00caCA","Comandante de Guarnicao":"CMDT GUARNI\u00c7\u00c3O","Comandante de Operacao":"CMDT OPERA\u00c7\u00c3O","Motorista":"MOTORISTA","Patrulheiro":"PATRULHEIRO","Navegador":"NAVEGADOR","Analista":"ANALISTA","Apoio":"APOIO"};return m[f]||f.toUpperCase();}
  var today=new Date();
  var emissao=today.getDate()+" DE "+MESES[today.getMonth()]+" DE "+today.getFullYear();
  var dates=[];var d=new Date(ini+"T12:00:00"),de=new Date(fim+"T12:00:00");
  while(d<=de){dates.push(d.toISOString().split("T")[0]);d.setDate(d.getDate()+1);}
  var css=`*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,sans-serif;font-size:9pt;background:#fff;color:#000;}
.page{width:210mm;padding:7mm 10mm;page-break-after:always;min-height:280mm;}
.hdr{border:2px solid #1a4a10;padding:3mm 4mm;margin-bottom:3mm;text-align:center;background:#fff;}
.hdr h1{font-size:10.5pt;font-weight:bold;line-height:1.5;color:#1a3a08;}
.hdr .mot{font-size:9pt;font-style:italic;color:#2d5a1a;margin-top:2px;}
.hdr .dat{font-size:8.5pt;color:#333;margin-top:3px;font-weight:bold;}
.dbar{background:#1a4a10;color:#fff;text-align:center;padding:4px 8px;font-size:10pt;font-weight:bold;letter-spacing:.04em;margin-bottom:3mm;}
.sec{border:1px solid #555;margin-bottom:2.5mm;page-break-inside:avoid;}
.sh{background:#d9ead3;border-bottom:1px solid #555;padding:3px 7px;font-size:8.5pt;font-weight:bold;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.sh .tipo{font-size:9pt;font-weight:bold;color:#1a3a08;text-transform:uppercase;}
.sh .time{font-size:8pt;color:#333;font-weight:normal;}
.sh .per{font-size:8pt;color:#1a4a10;font-weight:bold;}
.sh .loc{font-size:7.5pt;color:#555;}
.mil-row{display:grid;grid-template-columns:200px 1fr;border-bottom:1px dotted #ccc;}
.mil-row:last-child{border-bottom:none;}
.mil-fn{padding:3px 7px;font-size:7.5pt;color:#333;font-weight:bold;border-right:1px dotted #ccc;background:#f8fdf5;}
.mil-nm{padding:3px 7px;font-size:8.5pt;font-weight:bold;}
.foot{margin-top:3mm;padding-top:2mm;border-top:1px solid #ccc;font-size:7pt;color:#666;text-align:center;}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}@page{size:A4 portrait;margin:0;}.page{page-break-after:always;}}`;
  var html='<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>Escala 3a CIPMPA</title><style>'+css+'</style></head><body>';
  dates.forEach(function(dia){
    var escDia=escalas.filter(function(e){var ef2=e.dataFim||e.dataIni;return e.dataIni<=dia&&ef2>=dia;})
      .sort(function(a,b){if(a.tipo==="expediente")return-1;if(b.tipo==="expediente")return 1;return a.tipo.localeCompare(b.tipo);});
    html+='<div class="page">';
    html+='<div class="hdr"><h1>ESTADO DE MATO GROSSO &mdash; SECRETARIA DE ESTADO DE SEGURANCA PUBLICA<br/>';
    html+='COMANDO ESPECIALIZADO &bull; 3&ordm; CIPMPA ARAGUAIA<br/>';
    html+='POL&Iacute;CIA MILITAR DE PROTE&Ccedil;&Atilde;O AMBIENTAL ARAGUAIA</h1>';
    html+='<div class="mot">&ldquo;Em Defesa da Vida, protegendo o Meio Ambiente&rdquo;</div>';
    html+='<div class="dat">'+emissao+'</div></div>';
    html+='<div class="dbar">ESCALA DE SERVI&Ccedil;O DO 3&ordm; CIPMPA ARAGUAIA &mdash; DIA '+fDL(dia)+' / '+dayN(dia)+'</div>';
    if(!escDia.length){html+='<p style="padding:8px;color:#888;font-style:italic;text-align:center">Nenhuma escala para este dia.</p>';}
    else{escDia.forEach(function(e){
      var ts=gT(e.tipo);var loc=gL(e.localId);
      var isM=e.dataFim&&e.dataFim!==e.dataIni;
      html+='<div class="sec"><div class="sh"><span>LOCAL OU POSTO DE SERVI&Ccedil;O</span>';
      html+='<span class="tipo">'+ts.label.toUpperCase()+'</span>';
      if(isM)html+='<span class="per">'+fD(e.dataIni)+' A '+fD(e.dataFim)+'</span>';
      if(e.hor)html+='<span class="time">DAS '+hL(e.hor)+' AS '+addH(e.hor,e.turno)+'</span>';
      if(loc)html+='<span class="loc">| '+loc.nome+'</span>';
      html+='</div>';
      var mils=e.militares||[];var byFn={};var ord=[];
      mils.forEach(function(m){var f=m.funcao||"";if(!byFn[f]){byFn[f]=[];ord.push(f);}byFn[f].push(m);});
      ord.forEach(function(fn){
        byFn[fn].forEach(function(m,mi){
          var mil=gM(m.milId);if(!mil.nome)return;
          var ng=mil.nomeGuerra||mil.nome.split(" ").pop();
          html+='<div class="mil-row">';
          html+='<div class="mil-fn">'+(mi===0?fnLabel(fn):"")+'</div>';
          html+='<div class="mil-nm">'+(mil.grad||"")+" "+ng+" &ndash; "+mil.mat+'</div>';
          html+='</div>';
        });
      });
      if(!mils.length)html+='<div style="padding:3px 7px;font-size:8pt;color:#888">Nenhum militar escalado.</div>';
      html+='</div>';
    });}
    html+='<div class="foot">Sistema de Escala &mdash; 3&ordm; CIPMPA Araguaia &mdash; '+emissao+'</div>';
    html+='</div>';
  });
  html+='<script>window.onload=function(){window.print();};</script>';
  html+='</body></html>';
  return html;
}

// ── HTTP ────────────────────────────────────────────────────────────────────
const MIMES={".html":"text/html;charset=utf-8",".js":"application/javascript",".css":"text/css",".json":"application/json"};
function json(res,data,code){
  var c=code||200;
  res.writeHead(c,{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"});
  res.end(JSON.stringify(data));
}

function handle(method,pathname,body,qs,res){
  var parts=pathname.replace(/^\/api\/?/,"").split("/").filter(Boolean);
  var resource=parts[0];var id=parts[1];
  var today=new Date().toISOString().split("T")[0];

  // PING
  if(resource==="ping"){return json(res,{ok:true,version:"6.0"});}

  // LOGIN
  if(resource==="login"&&method==="POST"){
    var users=readDB("usuarios_v2",[]);
    var u=users.find(function(x){return x.login===body.login&&x.senha===body.senha&&x.ativo;});
    if(!u){return json(res,{ok:false,msg:"Matricula ou senha incorreta"},401);}
    var safe={id:u.id,nome:u.nome,mat:u.mat,login:u.login,perfil:u.perfil,ativo:u.ativo,email:u.email||""};
    return json(res,{ok:true,user:safe});
  }

  // RECUPERAR SENHA - gera token temporario
  if(resource==="recuperar-senha"&&method==="POST"){
    var users=readDB("usuarios_v2",[]);
    var mat=body.matricula||"";
    var u=users.find(function(x){return x.login===mat&&x.ativo;});
    if(!u){return json(res,{ok:false,msg:"Matricula nao encontrada ou usuario inativo"},404);}
    // Gera senha temporaria de 6 digitos
    var tmp=Math.floor(100000+Math.random()*900000).toString();
    var expiry=new Date(Date.now()+3600000).toISOString(); // 1 hora
    var idx=users.indexOf(u);
    users[idx].senhaTemp=tmp;
    users[idx].senhaTempExpiry=expiry;
    writeDB("usuarios_v2",users);
    audit("RECUPERAR_SENHA","USUARIOS",u.id,"Senha temporaria gerada para "+u.login);
    // Tentar enviar email se configurado
    var smtp=getSmtpCfg();
    if(smtp&&u.email){
      var msg="Senha temporaria para acesso ao Sistema de Escala da 3a CIPMPA:\n\n"+
        "Matricula: "+u.login+"\nSenha temporaria: "+tmp+"\nValida por: 1 hora\n\n"+
        "Ao acessar, altere sua senha imediatamente.";
      smtpSend(smtp,smtp.from,u.email,"Recuperacao de Senha - 3a CIPMPA",msg,function(err){
        if(err){console.log("Email error:",err.message);}
      });
      return json(res,{ok:true,email:true,msg:"Senha temporaria enviada para o email cadastrado.",emailMasked:u.email.replace(/(.{2}).+(@.+)/,"$1***$2")});
    }
    // Sem email - retorna para admin mostrar
    return json(res,{ok:true,email:false,senhaTemp:tmp,nome:u.nome,msg:"Senha temporaria gerada. Informe ao militar: "+tmp});
  }

  // LOGIN COM SENHA TEMP
  if(resource==="login-temp"&&method==="POST"){
    var users=readDB("usuarios_v2",[]);
    var u=users.find(function(x){return x.login===body.login&&x.senhaTemp===body.senhaTemp&&x.ativo;});
    if(!u){return json(res,{ok:false,msg:"Codigo incorreto ou expirado"},401);}
    var now=new Date();
    if(u.senhaTempExpiry&&new Date(u.senhaTempExpiry)<now){return json(res,{ok:false,msg:"Codigo expirado. Solicite um novo."},401);}
    var safe={id:u.id,nome:u.nome,mat:u.mat,login:u.login,perfil:u.perfil,ativo:u.ativo,email:u.email||"",mustChangePassword:true};
    return json(res,{ok:true,user:safe});
  }

  // ALTERAR SENHA
  if(resource==="alterar-senha"&&method==="POST"){
    var users=readDB("usuarios_v2",[]);
    var idx=users.findIndex(function(x){return x.login===body.login;});
    if(idx===-1)return json(res,{ok:false,msg:"Usuario nao encontrado"},404);
    // Verificar senha atual ou temp
    var u=users[idx];
    var ok=(u.senha===body.senhaAtual)||(u.senhaTemp===body.senhaAtual&&u.senhaTempExpiry&&new Date(u.senhaTempExpiry)>new Date());
    if(!ok)return json(res,{ok:false,msg:"Senha atual incorreta"},401);
    users[idx].senha=body.novaSenha;
    delete users[idx].senhaTemp;delete users[idx].senhaTempExpiry;
    writeDB("usuarios_v2",users);
    audit("ALTERAR_SENHA","USUARIOS",u.id,u.login);
    return json(res,{ok:true,msg:"Senha alterada com sucesso!"});
  }

  // SMTP CONFIG (somente dev)
  if(resource==="smtp-config"){
    if(method==="GET"){var c=getSmtpCfg();return json(res,c?{configured:true,host:c.host,port:c.port,user:c.user,from:c.from}:{configured:false});}
    if(method==="POST"){writeDB("smtp",body);fs.writeFileSync(path.join(DATA,"smtp.json"),JSON.stringify(body,null,2));return json(res,{ok:true});}
  }

  // EFETIVO
  if(resource==="efetivo"){
    var db=readDB("efetivo_v6",[]);
    if(method==="GET"&&!id){
      var afst=readDB("afastamentos",[]);
      return json(res,db.map(function(m){
        var isA=afst.some(function(a){return String(a.milId)===String(m.id)&&a.dataIni<=today&&(!a.dataFim||a.dataFim>=today);});
        return Object.assign({},m,{statusFinal:isA?"Afastado":(m.status||"Ativo")});
      }));
    }
    if(method==="POST"){
      var last=db.reduce(function(mx,m){return Math.max(mx,typeof m.id==="number"?m.id:0);},0);
      var rec=Object.assign({},body,{id:last+1,createdAt:new Date().toISOString()});
      if(!rec.nomeGuerra)rec.nomeGuerra=rec.nome.split(" ").pop().toUpperCase();
      db.push(rec);writeDB("efetivo_v6",db);audit("CRIAR","EFETIVO",rec.id,rec.nome);
      return json(res,rec,201);
    }
    if((method==="PATCH"||method==="PUT")&&id){
      var i=db.findIndex(function(x){return String(x.id)===id;});
      if(i===-1)return json(res,{error:"NF"},404);
      Object.assign(db[i],body);writeDB("efetivo_v6",db);
      audit("ATUALIZAR","EFETIVO",id,JSON.stringify(body));
      return json(res,db[i]);
    }
    if(method==="DELETE"&&id){
      var i=db.findIndex(function(x){return String(x.id)===id;});
      if(i===-1)return json(res,{error:"NF"},404);
      var r=db.splice(i,1)[0];writeDB("efetivo_v6",db);audit("EXCLUIR","EFETIVO",id,r.nome);
      return json(res,{ok:true});
    }
  }

  // ESCALAS
  if(resource==="escalas"){
    var db=readDB("escalas_v5",[]);
    if(method==="GET"&&!id){
      var ini=qs.get("ini"),fim=qs.get("fim"),mil=qs.get("mil"),tipo=qs.get("tipo");
      var list=db.slice();
      if(ini)list=list.filter(function(e){return (e.dataFim||e.dataIni)>=ini;});
      if(fim)list=list.filter(function(e){return e.dataIni<=fim;});
      if(mil)list=list.filter(function(e){return (e.militares||[]).some(function(m){return String(m.milId)===mil;});});
      if(tipo)list=list.filter(function(e){return e.tipo===tipo;});
      return json(res,list.sort(function(a,b){return a.dataIni.localeCompare(b.dataIni)||a.hor.localeCompare(b.hor);}));
    }
    if(method==="POST"){
      var rec=Object.assign({},body,{id:uid(),createdAt:new Date().toISOString()});
      var erros=[];
      (rec.militares||[]).forEach(function(m){
        var conf=checkConflito(m.milId,rec.dataIni,rec.dataFim,db,null);
        if(conf.length){
          var ef2=readDB("efetivo_v6",[]);
          var mil2=ef2.find(function(x){return String(x.id)===String(m.milId);})||{};
          erros.push({milId:m.milId,nome:mil2.nome||String(m.milId),conflitos:conf});
        }
      });
      if(erros.length&&!body.forcarConflito){return json(res,{conflito:true,erros:erros},409);}
      if(rec.tipo==="je"&&!body.forcarJE){
        var jeA=[];var hE=calcH(rec);
        (rec.militares||[]).forEach(function(m){
          var cur=horasJE(m.milId,db);
          if(cur+hE>50){
            var ef2=readDB("efetivo_v6",[]);
            var mil2=ef2.find(function(x){return String(x.id)===String(m.milId);})||{};
            jeA.push({milId:m.milId,nome:mil2.nome||String(m.milId),atual:cur,adicionar:hE,total:cur+hE});
          }
        });
        if(jeA.length){return json(res,{jeAlert:true,militares:jeA},409);}
      }
      db.push(rec);writeDB("escalas_v5",db);
      audit("CRIAR","ESCALA",rec.id,rec.tipo+" "+rec.dataIni+(rec.dataFim&&rec.dataFim!==rec.dataIni?"->"+rec.dataFim:""),body.usuario);
      return json(res,rec,201);
    }
    if(method==="DELETE"&&id){
      var e=db.find(function(x){return x.id===id;});
      writeDB("escalas_v5",db.filter(function(x){return x.id!==id;}));
      if(e)audit("EXCLUIR","ESCALA",id,e.tipo+" "+e.dataIni);
      return json(res,{ok:true});
    }
  }

  if(resource==="check-conflito"){
    var db=readDB("escalas_v5",[]);
    var milId=qs.get("mil"),ini=qs.get("ini"),fim=qs.get("fim")||ini;
    if(!milId||!ini)return json(res,{conflitos:[]});
    return json(res,{conflitos:checkConflito(milId,ini,fim,db,null)});
  }

  if(resource==="relatorio"&&id==="horas"){
    var db=readDB("escalas_v5",[]);var ef=readDB("efetivo_v6",[]);
    var tipo=qs.get("tipo")||"";
    var lista=tipo?db.filter(function(e){return e.tipo===tipo;}):db;
    var horas={};
    lista.forEach(function(e){var h=calcH(e);(e.militares||[]).forEach(function(m){var k=String(m.milId);if(!horas[k])horas[k]={milId:m.milId,total:0,porTipo:{}};horas[k].total+=h;horas[k].porTipo[e.tipo]=(horas[k].porTipo[e.tipo]||0)+h;});});
    var result=Object.values(horas).map(function(r){var m=ef.find(function(x){return String(x.id)===String(r.milId);})||{};return Object.assign(r,{nome:m.nome||"?",grad:m.grad||"",mat:m.mat||"",nomeGuerra:m.nomeGuerra||""});}).sort(function(a,b){return b.total-a.total;});
    return json(res,result);
  }

  if(resource==="pdf"){
    var ini=qs.get("ini")||today,fim=qs.get("fim")||today;
    var html=gerarPDF(readDB("escalas_v5",[]),readDB("efetivo_v6",[]),readDB("tservico_v5",[]),readDB("locais",[]),ini,fim);
    res.writeHead(200,{"Content-Type":"text/html;charset=utf-8","Access-Control-Allow-Origin":"*"});
    return res.end(html);
  }

  if(resource==="afastamentos"){
    var db=readDB("afastamentos",[]);
    if(method==="GET"){var mil=qs.get("mil"),sit=qs.get("sit");if(mil)db=db.filter(function(a){return String(a.milId)===mil;});if(sit==="ativo")db=db.filter(function(a){return a.dataIni<=today&&(!a.dataFim||a.dataFim>=today);});if(sit==="enc")db=db.filter(function(a){return a.dataFim&&a.dataFim<today;});return json(res,db.sort(function(a,b){return b.dataIni.localeCompare(a.dataIni);}));}
    if(method==="POST"){var rec=Object.assign({},body,{id:uid(),createdAt:new Date().toISOString()});db.push(rec);writeDB("afastamentos",db);return json(res,rec,201);}
    if(method==="DELETE"&&id){writeDB("afastamentos",db.filter(function(x){return x.id!==id;}));return json(res,{ok:true});}
  }

  if(resource==="auditoria"){
    var db=readDB("auditoria",[]);
    if(method==="GET")return json(res,db.slice(0,200));
    if(method==="DELETE"){writeDB("auditoria",[]);return json(res,{ok:true});}
  }

  var TBLS={"funcoes":"funcoes_v2","turnos":"turnos","tipos-servico":"tservico_v5","locais":"locais","tipos-afst":"tiposAfst","usuarios":"usuarios_v2"};
  if(TBLS[resource]){
    var dbN=TBLS[resource];var db=readDB(dbN,[]);
    if(method==="GET"&&!id){
      if(resource==="usuarios"){
        return json(res,db.map(function(u){return{id:u.id,nome:u.nome,mat:u.mat||u.login,login:u.login,email:u.email||"",perfil:u.perfil,ativo:u.ativo,createdAt:u.createdAt};}));
      }
      return json(res,db);
    }
    if(method==="POST"){var rec=Object.assign({},body,{id:body.id||uid(),createdAt:new Date().toISOString()});db.push(rec);writeDB(dbN,db);return json(res,rec,201);}
    if((method==="PATCH"||method==="PUT")&&id){var i=db.findIndex(function(x){return String(x.id)===id;});if(i===-1)return json(res,{error:"NF"},404);Object.assign(db[i],body);writeDB(dbN,db);return json(res,db[i]);}
    if(method==="DELETE"&&id){writeDB(dbN,db.filter(function(x){return String(x.id)!==id;}));return json(res,{ok:true});}
  }

  json(res,{error:"Not found"},404);
}

const server=http.createServer(function(req,res){
  if(req.method==="OPTIONS"){res.writeHead(204,{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,PUT,PATCH,DELETE","Access-Control-Allow-Headers":"Content-Type"});return res.end();}
  var URL2=(typeof URL!=="undefined")?URL:require("url").URL;
  var url=new URL2(req.url,"http://localhost:"+PORT);
  if(!url.pathname.startsWith("/api")){
    var fp=url.pathname==="/"?"/index.html":url.pathname;
    var full=path.join(PUBLIC,fp);var ext=path.extname(full);
    if(fs.existsSync(full)&&fs.statSync(full).isFile()){res.writeHead(200,{"Content-Type":MIMES[ext]||"text/plain"});return res.end(fs.readFileSync(full));}
    res.writeHead(404);return res.end("NF");
  }
  var body="";req.on("data",function(c){body+=c;});
  req.on("end",function(){
    var p={};try{p=body?JSON.parse(body):{};}catch(e){}
    try{handle(req.method.toUpperCase(),url.pathname,p,url.searchParams,res);}
    catch(e){console.error(e);res.writeHead(500);res.end(JSON.stringify({error:String(e)}));}
  });
});

server.on("error",function(e){
  console.log("ERRO AO INICIAR: "+e.message);
  if(e.code==="EADDRINUSE"){console.log("Porta "+PORT+" ja esta em uso. Feche outros programas.");}
  if(e.code==="EACCES"){console.log("Sem permissao. Execute como Administrador.");}
  process.exit(1);
});
server.listen(PORT,function(){
  console.log("================================================");
  console.log(" 3a CIPMPA - Sistema de Escala v6.0");
  console.log(" Acesse: http://localhost:"+PORT);
  console.log(" Login: 883039  Senha: 883039");
  console.log(" Login: 884507  Senha: 884507");
  console.log("================================================");
  var exec=require("child_process").exec,p=process.platform;
  if(p==="win32")exec("start http://localhost:"+PORT);
  else if(p==="darwin")exec("open http://localhost:"+PORT);
  else exec("xdg-open http://localhost:"+PORT);
});
