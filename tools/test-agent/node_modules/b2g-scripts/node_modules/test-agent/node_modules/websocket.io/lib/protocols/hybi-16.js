
/*!
 * socket.io-node
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */
 
/**
 * Module requirements.
 */

var Socket = require('../socket')
  , EventEmitter = process.EventEmitter
  , crypto = require('crypto')
  , url = require('url')
  , util = require('../util')
  , Parser = require('ws').Receiver;

/**
 * Module exports.
 */

exports = module.exports = WebSocket;
exports.Parser = Parser;

/**
 * HTTP interface constructor. Interface compatible with all transports that
 * depend on request-response cycles.
 *
 * @api public
 */

function WebSocket (server, req) {
  // parser
  var self = this;

  this.parser = new Parser();
  this.parser
    .on('text', function (packet) {
      self.onMessage(packet);
    })
    .on('binary', function (packet) {
      self.onMessage(packet);
    })
    .on('ping', function () {
      // version 8 ping => pong
      try {
        self.socket.write('\u008a\u0000');
      }
      catch (e) {
        self.end();
        return;
      }
    })
    .on('close', function () {
      self.end();
    })
    .on('error', function (reason) {
      self.log.warn(self.name + ' parser error: ' + reason);
      self.end();
    })

  Socket.call(this, server, req);
};

/**
 * Inherits from Socket.
 */

WebSocket.prototype.__proto__ = Socket.prototype;

/**
 * Websocket identifier
 *
 * @api public
 */

WebSocket.prototype.name = 'websocket-16';

/**
 * Websocket draft version
 *
 * @api public
 */

WebSocket.prototype.protocolVersion = '16';

/**
 * Called when the socket connects.
 *
 * @api private
 */

WebSocket.prototype.onOpen = function () {
  var self = this;

  if (typeof this.req.headers.upgrade === 'undefined' || 
      this.req.headers.upgrade.toLowerCase() !== 'websocket') {
    this.log.warn(this.name + ' connection invalid');
    this.end();
    return;
  }

  var origin = this.req.headers['origin']
    , location = (this.socket.encrypted ? 'wss' : 'ws')
               + '://' + this.req.headers.host + this.req.url;

  if (!this.req.headers['sec-websocket-key']) {
    this.log.warn(this.name + ' connection invalid: received no key');
    this.end();
    return;
  }

  // calc key
  var key = this.req.headers['sec-websocket-key']
    , shasum = crypto.createHash('sha1')

  shasum.update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11");
  key = shasum.digest('base64');

  var headers = [
      'HTTP/1.1 101 Switching Protocols'
    , 'Upgrade: websocket'
    , 'Connection: Upgrade'
    , 'Sec-WebSocket-Accept: ' + key
  ];

  try {
    this.socket.write(headers.concat('', '').join('\r\n'));
    this.socket.setTimeout(0);
    this.socket.setNoDelay(true);
  } catch (e) {
    this.end();
    return;
  }

  this.socket.on('data', function (data) {
    self.parser.add(data);
  });
};

/**
 * Writes to the socket.
 *
 * @api private
 */

WebSocket.prototype.write = function (data) {
  if (this.open) {
    var buf = this.frame(0x81, data);

    try {
      this.socket.write(buf, 'binary');
    } catch (e) {
      this.end();
      return;
    }

    this.log.debug(this.name + ' writing', data);
  }
};

/**
 * Writes a payload.
 *
 * @api private
 */

WebSocket.prototype.payload = function (msgs) {
  for (var i = 0, l = msgs.length; i < l; i++) {
    this.write(msgs[i]);
  }

  return this;
};

/**
 * Frame server-to-client output as a text packet.
 *
 * @api private
 */

WebSocket.prototype.frame = function (opcode, str) {
  var dataBuffer = new Buffer(str)
    , dataLength = dataBuffer.length
    , startOffset = 2
    , secondByte = dataLength;

  if (dataLength > 65536) {
    startOffset = 10;
    secondByte = 127;
  } else if (dataLength > 125) {
    startOffset = 4;
    secondByte = 126;
  }

  var outputBuffer = new Buffer(dataLength + startOffset);

  outputBuffer[0] = opcode;
  outputBuffer[1] = secondByte;
  dataBuffer.copy(outputBuffer, startOffset);

  switch (secondByte) {
    case 126:
      util.writeUInt16BE.call(outputBuffer, dataLength, 2);
      break;

    case 127:
      util.writeUInt32BE.call(outputBuffer, 0, 2);
      util.writeUInt32BE.call(outputBuffer, dataLength, 6);
  }

  return outputBuffer;
};
