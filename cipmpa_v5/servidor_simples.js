// Servidor ultra-simples de teste
var http = require('http');
var fs = require('fs');
var path = require('path');

var server = http.createServer(function(req, res) {
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
  res.end('<h1>SERVIDOR OK!</h1><p>Node.js esta funcionando.</p><p><a href="http://localhost:3000">Ir para o sistema</a></p>');
});

server.on('error', function(e) {
  console.log('');
  console.log('ERRO AO INICIAR SERVIDOR: ' + e.message);
  if (e.code === 'EADDRINUSE') {
    console.log('A porta 3000 ja esta em uso por outro programa.');
    console.log('Feche outros programas e tente novamente.');
  }
  if (e.code === 'EACCES') {
    console.log('Sem permissao para usar a porta 3000.');
    console.log('Execute o INICIAR.bat como Administrador.');
  }
});

server.listen(3000, function() {
  console.log('Servidor SIMPLES rodando em http://localhost:3000');
  console.log('Se voce ve esta mensagem, o Node.js funciona!');
  console.log('Feche esta janela e use o INICIAR.bat');
});
