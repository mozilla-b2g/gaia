/*
 *  Module: Remote Console.
 *
 *  Implements the Web Socket Server that supports a Remote Console
 *
 *  Product: Open Web Device
 *
 *  Copyright(c) 2012 Telefónica I+D S.A.U.
 *
 *  LICENSE: TBD
 *
 *  @author José M. Cantera (jmcf@tid.es)
 *
 */

var http = require("http")
  , WebSocketServer = require('websocket').server;

console.log(process.pid);

function serveFile(req,res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write('<!DOCTYPE html>' + '<html><body><p>Hello!!!</p><iframe srcdoc="<script src=\'http://localhost/~jmcf/tests/script1.js\'></script>"></iframe></body></html>');
  res.end();
}

var httpSrv = http.createServer(serveFile);

var server = new WebSocketServer({
    httpServer: httpSrv,

    // Firefox 7 alpha has a bug that drops the
    // connection on large fragmented messages
    fragmentOutgoingMessages: false,
    autoAcceptConnections: false
});

var connections = [];
var consoles = {};
var applications = {};

server.on('request', function(request) {
    var connection =  request.accept(null, request.origin);
    console.log((new Date()) + " Connection accepted.");

    console.log(connection.remoteAddress + " connected - Protocol Version " + connection.websocketVersion);

    var obj = {};
    obj.type = 'notification';
    obj.remote = connection.remoteAddress;
    obj.data = " connected - Protocol Version " + connection.websocketVersion;
    connection.sendUTF( JSON.stringify(obj) );


    var obj2 = {};
    obj2.type = 'notification';
    obj2.remote = connection.remoteAddress;
    obj2.data = ' has entered the room';

    connections.forEach(function(destination) {
        destination.sendUTF( JSON.stringify(obj2) );
    });

    connections.push(connection);

    // Handle closed connections
    connection.on('close', function() {
        console.log('<' + connection.remoteAddress + '>' + " disconnected");

        var index = connections.indexOf(connection);
        if (index !== -1) {
            // remove the connection from the pool
            connections.splice(index, 1);
        }
        var obj = {};
        obj.type = 'notification';
        obj.remote = connection.remoteAddress;
        obj.data = 'has left the room';
        connections.forEach(function(destination) {
            destination.sendUTF( JSON.stringify(obj) );
        });

        delete consoles[connection.remoteAddress];
        delete applications[connection.remoteAddress];
    });

    connection.on('message',function(message) {
      console.log('Message Received: ' + message.utf8Data);
      // The content of the message is inspected

      // 3 types of messages (register, traces, eval)

      var messageObj = JSON.parse(message.utf8Data);

      if(messageObj.type === 'request') {
        if(messageObj.method === 'register') {
          if(messageObj.params.type === 'application') {
            applications[connection.remoteAddress] = connection;
          }
          else if(messageObj.params.type === 'console') {
            consoles[connection.remoteAddress] = connection;
          }
        }
        else if(messageObj.method === 'eval') {
          // The applications are requested to eval
          var request = messageObj;
          // Message broadcasted to all the apps
          for(var c in applications) {
             applications[c].sendUTF(JSON.stringify(request));
          }
        }
      }
      else if(messageObj.type === 'response') {
              if(messageObj.method === 'eval') {
                var obj = messageObj;
                obj.remote = connection.remoteAddress;
                // The response is broadcasted to all consoles
                for (var c in consoles) {
                  consoles[c].sendUTF( JSON.stringify(obj) );
                }
              }
      }
      else if(messageObj.type === 'trace') {
        // The message will be distributed to all the consoles
        var obj = {};
        obj.type = 'trace';
        obj.remote = connection.remoteAddress;
        obj.data = messageObj;

        for (var c in consoles) {
          consoles[c].sendUTF(JSON.stringify(obj));
        }
      }
  }); // connection.on
});

httpSrv.listen(8081, function() {
    console.log((new Date()) + " Server is listening on port 8081");
});
