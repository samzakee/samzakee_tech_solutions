const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');
const crypto = require('crypto');
 
const PORT = process.env.PORT || 3000;
const DATA = path.join(__dirname, 'data');
 
// ══════════════════════════════════════════════════════════════════════════════
// 🔐 UTILITÁRIOS
// ══════════════════════════════════════════════════════════════════════════════
 
function uid() {
  return crypto.randomBytes(8).toString('hex');
}
 
function readDB(name, def) {
  var file = path.join(DATA, name + '.json');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return def || [];
  }
}
 
function writeDB(name, data) {
  if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, {recursive: true});
  fs.writeFileSync(path.join(DATA, name + '.json'), JSON.stringify(data, null, 2), 'utf8');
}
 
function jsn(res, data, status) {
  res.writeHead(status || 200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  res.end(JSON.stringify(data));
}
 
function cors(res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end();
}
 
// ══════════════════════════════════════════════════════════════════════════════
// 📊 DATABASE PADRÃO
// ══════════════════════════════════════════════════════════════════════════════
 
var DEF_USERS = [
  {id:"u1",nome:"Flavio Pereira Diniz",mat:"883039",login:"883039",senha:"883039",email:"",perfil:"Administrador",ativo:true,createdAt:"2026-01-01T00:00:00.000Z"},
  {id:"u2",nome:"Samuel Ribeiro dos Santos",mat:"884507",login:"884507",senha:"884507",email:"",perfil:"Administrador",ativo:true,createdAt:"2026-01-01T00:00:00.000Z"}
];
 
function initDB() {
  var dbs = [
    ["usuarios_v2", DEF_USERS],
    ["escalas_v5", []],
    ["afastamentos", []],
    ["auditoria", []],
    ["voluntariado", []],
    ["vagas_vol", []],
    ["trocas", []]
  ];
  dbs.forEach(function(d) {
    if (!fs.existsSync(path.join(DATA, d[0] + ".json"))) {
      writeDB(d[0], d[1]);
    }
  });
}
 
initDB();
 
// ══════════════════════════════════════════════════════════════════════════════
// 🚀 SERVIDOR HTTP
// ══════════════════════════════════════════════════════════════════════════════
 
const server = http.createServer(function(req, res) {
  var method = req.method;
  var parsedUrl = url.parse(req.url, true);
  var resource = parsedUrl.pathname.replace(/^\/|\/$/g, '');
  var query = parsedUrl.query;
  
  // CORS preflight
  if (method === 'OPTIONS') {
    return cors(res);
  }
 
  // Ler body
  var body = '';
  req.on('data', function(chunk) {
    body += chunk.toString();
  });
 
  req.on('end', function() {
    try {
      if (body && req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
        body = JSON.parse(body);
      } else {
        body = {};
      }
    } catch (e) {
      body = {};
    }
 
    // ════════════════════════════════════════════════════════════════════════════
    // 🔐 ENDPOINT: /login (POST)
    // ════════════════════════════════════════════════════════════════════════════
    
    if (resource === "login" && method === "POST") {
      var users = readDB("usuarios_v2", []);
      var u = users.find(function(x) {
        return x.login === body.login && x.senha === body.senha && x.ativo;
      });
      
      if (!u) {
        return jsn(res, {ok: false, msg: "Matricula ou senha incorreta"}, 401);
      }
      
      return jsn(res, {
        ok: true,
        user: {
          id: u.id,
          nome: u.nome,
          mat: u.mat,
          login: u.login,
          perfil: u.perfil,
          ativo: u.ativo,
          email: u.email || ""
        }
      });
    }
 
    // ════════════════════════════════════════════════════════════════════════════
    // 📋 ENDPOINT: /painel (GET) - Retorna HTML do painel
    // ════════════════════════════════════════════════════════════════════════════
    
    if (resource === "painel" && method === "GET") {
      var html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Painel - 3ª CIPMPA</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, sans-serif; background: #f5f5f5; }
            .navbar { background: #1a5a47; color: white; padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
            .container { max-width: 1200px; margin: 20px auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #1a5a47; margin-bottom: 20px; }
            button { background: #1a5a47; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
            button:hover { background: #0d3a2b; }
          </style>
        </head>
        <body>
          <div class="navbar">
            <h2>🎖️ 3ª CIPMPA - Painel Administrativo</h2>
          </div>
          <div class="container">
            <h1>Bem-vindo ao Sistema de Escala!</h1>
            <p>Login realizado com sucesso!</p>
            <br>
            <button onclick="logout()">Sair do sistema</button>
          </div>
          <script>
            function logout() {
              sessionStorage.clear();
              window.location.href = '/';
            }
          </script>
        </body>
        </html>
      `;
      res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
      res.end(html);
      return;
    }
 
    // ════════════════════════════════════════════════════════════════════════════
    // 🏠 ENDPOINT: / (GET) - Retorna o index.html
    // ════════════════════════════════════════════════════════════════════════════
    
    if ((resource === "" || resource === "index.html") && method === "GET") {
      var indexPath = path.join(__dirname, 'public', 'index.html');
      try {
        var content = fs.readFileSync(indexPath, 'utf8');
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache'
        });
        res.end(content);
        return;
      } catch (e) {
        return jsn(res, {erro: "index.html não encontrado"}, 404);
      }
    }
 
    // ════════════════════════════════════════════════════════════════════════════
    // 📁 STATIC FILES (CSS, JS, IMAGENS)
    // ════════════════════════════════════════════════════════════════════════════
    
    if (method === "GET") {
      var filePath = path.join(__dirname, 'public', resource);
      try {
        if (fs.existsSync(filePath)) {
          var content = fs.readFileSync(filePath);
          var ext = path.extname(filePath).toLowerCase();
          var contentType = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml'
          }[ext] || 'text/plain';
          
          res.writeHead(200, {'Content-Type': contentType});
          res.end(content);
          return;
        }
      } catch (e) {}
    }
 
    // ════════════════════════════════════════════════════════════════════════════
    // 404 - Não encontrado
    // ════════════════════════════════════════════════════════════════════════════
    
    jsn(res, {erro: "Recurso não encontrado"}, 404);
  });
});
 
server.listen(PORT, function() {
  console.log("🚀 Servidor rodando em http://localhost:" + PORT);
  console.log("📍 Domínio: https://samzakeetech.com");
  console.log("✅ Endpoint /login: POST");
  console.log("✅ Endpoint /painel: GET");
});
 
