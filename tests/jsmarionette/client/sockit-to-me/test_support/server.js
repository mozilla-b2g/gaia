'use strict';
var net = require('net');

var server = {
  _port: 44321,
  _host: '127.0.0.1',
  _server: null,

  _client: null,
  _accumulator: null,

  start: function() {
    this._server = net.createServer(this.connection.bind(this));
    this._server.listen(this._port, this._host, function() {
      process.send({ reply: 'started' });
    });
  },

  connection: function(socket) {
    this._client = socket;
    this._accumulator = '';

    process.send({ reply: 'connected' });
  },

  send: function(message) {
    this._client.write(message);
  },

  recv: function(expected) {
    this._client.setEncoding('utf8');
    this._client.on('data', function(buffer) {
      this._accumulator += buffer;
      if(this._accumulator == expected) {
        process.send({ reply: 'expected' });
      }
    }.bind(this));
  },

  stop: function() {
    this._server.close(function() {
      process.send({ reply: 'stopped' });
    });
  }
};

process.on('message', function(message) {
  switch(message.command) {
    case 'start':
      server.start();
    break;

    case 'send':
      server.send(message.data);
    break;

    case 'recv':
      server.recv(message.data);
    break;

    case 'stop':
      server.stop();
    break;
  }
});
