var net = require('net'),
    WS = require('./lib/node/websocket-server'),
    server = new WS();

server.listen(8777);
