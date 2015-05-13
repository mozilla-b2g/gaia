'use strict';
var WebSocketServer = require('websocket').server,
    emptyPort = require('empty-port'),
    debug = require('debug')('marionette-js-logger:server'),
    http = require('http'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter;

var PORT_START = 60000;

function locatePort(callback) {
  emptyPort({ startPort: PORT_START }, callback);
}

function Server(handleMessage) {
  EventEmitter.call(this);

  if (typeof handleMessage === 'function') {
    this.handleMessage = handleMessage;
  }
}
util.inherits(Server, EventEmitter);

Server.prototype._initEvents = function(server) {
  server.on('connect', function(con) {
    debug('client connect');
    con.on('message', function(message) {
      debug('client message', message);
      var json;
      try {
        json = JSON.parse(message.utf8Data);
      } catch (e) {
        debug('malformated message', message);
      }
      // Do not let a buggy handleMessage stop us from emitting our event.
      // (Although a bad subscriber still can break things for others.)
      try {
        if (this.handleMessage) {
          this.handleMessage(json);
        }
      }
      catch (e) {
        debug('handleMessage error:', e);
      }
      // emit does not catch errors in handlers, so we should catch and report
      try {
        this.emit('message', json);
      }
      catch (e) {
        debug('emit(message) error:', e);
      }
    }.bind(this));
  }.bind(this));
};

Server.prototype.handleMessage = function(event) {
  console.log('[marionette %s] %s:%s %s',
              event.level, event.filename, event.lineNumber, event.message);

  if (event.level === 'error') {
    event.stack.forEach(function(s) {
      console.log('  %s @ %s:%s', s.functionName, s.filename, s.lineNumber);
    });
  }
};

Server.prototype.listen = function(port, callback) {
  if (typeof port === 'function') {
    callback = port;
    port = null;
  }

  var self = this;
  function startServer(err, port) {
    if (err) {
      return callback && callback(err);
    }

    var httpServer = http.createServer().listen(port);
    var webSocketServer = new WebSocketServer({
      httpServer: httpServer,
      autoAcceptConnections: true
    });

    self.httpServer = httpServer;
    self.port = port;
    self.wsServer = webSocketServer;
    self._initEvents(webSocketServer);
    return callback && callback(null, httpServer, port);
  }

  if (!port) {
    locatePort(startServer);
  } else {
    startServer(null, port);
  }
};

Server.prototype.close = function(done) {
  if (this.httpServer) {
    this.wsServer.shutDown();
    return this.httpServer.close(done);
  }
  process.nextTick(done);
};

module.exports.Server = Server;
