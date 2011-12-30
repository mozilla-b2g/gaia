/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;
const CC = Components.Constructor;
const CID = Components.ID;

const ServerSocket = CC('@mozilla.org/network/server-socket;1',
                        'nsIServerSocket',
                        'init');

const BinaryInputStream = CC('@mozilla.org/binaryinputstream;1',
                             'nsIBinaryInputStream',
                             'setInputStream');

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');

let debug = false;
function log(str) {
  if (!debug)
    return;

  dump('WebSocketServer: ' + str + '\n');
}

// WebSocketServer Impl
const SOCKET_PORT = 6789;

function WebSocketServer() {
  log('new server');
}

WebSocketServer.prototype = {
  _listeners: [],
  addListener: function sg_addListener(listener) {
    this._listeners.push(listener);
  },

  removeListener: function sg_removeListener(listener) {
    let listeners = this._listeners;
    let index = listeners.indexOf(listener);
    if (index == -1)
      return;
    listeners.splice(index, 1);
  },

  dispatchMessage: function sg_dispatchMessage(msg) {
    let listeners = this._listeners;
    let count = listeners.length;
    for (let i = 0; i < count; i++)
      listeners[i](msg);
  },

  start: function sg_start() {
    log('starting socket...');
    let socket = this._socket = new ServerSocket(SOCKET_PORT, false, -1);
    socket.asyncListen(this);
    log('started');
  },

  stop: function sg_stop() {
    log('stopping server...');
    this._connections.forEach(function(client) {
      client.socks.close();
    });
    this._connections = [];

    this._socket.close();
    log('stopped');
  },

  send: function sg_send(message) {
    this._connections.forEach(function(client) {
      client.socks.write(message);
    });
  },

  // nsIServerSocketListener impl
  _connections: [],
  onSocketAccepted: function sg_onSocketAccepted(sock, transport) {
    let host = transport.host;
    let port = transport.port;
    log('new client connection: ' + host + ':' + port);

    let input = transport.openInputStream(0, 0, 0);
    let output = transport.openOutputStream(0, 0, 0);
    let client = new SocksClient(this, input, output);
    this._connections.push({
      socks: client,
      host: host,
      port: port
    });

    this.dispatchMessage({
      'type': 'connect',
      'host': host,
      'port': port
    });
  },

  onStopListening: function sg_onStopListening(sock, status) {
  }
};


// SocksClient Impl
function stringToSha1(str) {
  let hasher = Cc['@mozilla.org/security/hash;1']
                 .createInstance(Ci.nsICryptoHash);
  hasher.init(hasher.SHA1);

  let converter = Cc['@mozilla.org/intl/scriptableunicodeconverter']
                    .createInstance(Ci.nsIScriptableUnicodeConverter);
  converter.charset = 'UTF-8';

  let data = converter.convertToByteArray(str, {});
  hasher.update(data, data.length);
  let bytes = hasher.finish(false);

  let hex = '';
  for (let i = 0; i < bytes.length; i++)
    hex += ('0' + bytes[i].charCodeAt().toString(16)).slice(-2);
  return hex;
}

const STATE_CONNECTING = 0;
const STATE_CONNECTED = 1;

const kControlFrameMask = 0x8;
const kMaskBit = 0x80;
const kFinalFragBit = 0x80;

// Controls frames
const kClose = 0x8;
const kPing = 0x9;
const kPong = 0xA;

// Non-control frames
const kContinuation = 0x0;
const kText = 0x1;
const kBinary = 0x2;

const currentThread = Cc['@mozilla.org/thread-manager;1']
                        .getService()
                        .currentThread;

function SocksClient(server, input, output) {
  this._input = input;
  this._output = output;
  this._server = server;
  this.state = STATE_CONNECTING;

  this.waitRead();
}

SocksClient.prototype = {
  onInputStreamReady: function sc_onInputStreamReady(input) {
    let len = input.available();
    if (len == 0) {
      this.close();
      return;
    }

    let binaryOutputStream = new BinaryInputStream(input);
    let bytes = binaryOutputStream.readByteArray(len);

    switch (this.state) {
      case STATE_CONNECTING:
        try {
          let data = String.fromCharCode.apply(null, bytes);
          let headers = this._parseHTTPHeaders(data);

          let securityKey = headers['Sec-WebSocket-Key'];
          this._acceptConnection(securityKey);

          this.state = STATE_CONNECTED;
        } catch (e) {
          dump('Error during client connection: ' + e + '\n');
        }
        break;

      case STATE_CONNECTED:
        try {
          let [frame, nextFrame] = [bytes, null];
          while (frame.length) {
            [frame, nextFrame] = this._parseFrame(frame);
            this._server.dispatchMessage(frame);

            frame = nextFrame;
          }
        } catch (e) {
          dump('Error while parsing frame: ' + e + '\n');
        }
        break;
    }

    this.waitRead();
  },

  onOutputStreamReady: function sc_onOutputStreamReady(output) {
    let buffer = this._outputBuffer;
    this._outputBuffer = '';

    let len = output.write(buffer, buffer.length);
    if (len == buffer.length) {
      this._outputBuffer = '';
      return;
    }

    this._outputBuffer = buffer.substring(len);
    this.waitWrite();
  },

  close: function sc_close() {
    log('client closed');
    this._input.close();
    this._output.close();
  },

  waitRead: function sc_waitRead() {
    this._input.asyncWait(this, 0, 0, currentThread);
  },

  _outputBuffer: '',
  write: function(str) {
    // If the socket is connected, the server needs to reply to the client
    // using the websocket framing protocol.
    // The following add a the minimum required.
    if (this.state == STATE_CONNECTED) {
      str = String.fromCharCode(kFinalFragBit | kText) +
            String.fromCharCode(str.length) +
            str;
    }

    log('sending: ' + str);
    this._outputBuffer += str;
    this.waitWrite();
  },

  waitWrite: function sc_waitWrite() {
    this._output.asyncWait(this, 0, 0, currentThread);
  },

  _parseHTTPHeaders: function sc_parseHTTPHeaders(str) {
    let headers = {};
    let fields = str.split('\r\n');
    for each(let field in fields) {
      let name = field.split(': ')[0];
      let value = field.split(': ')[1];
      headers[name] = value;
    }
    return headers;
  },

  _acceptConnection: function sc_acceptConnection(securityKey) {
    let reply = securityKey + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
    let sha1 = stringToSha1(reply);

    let str = '';
    for (let i = 0; i < sha1.length; i += 2)
      str += String.fromCharCode(parseInt(sha1.substr(i, 2), 16));

    log('server: key:  ' + securityKey + '\n' +
        '        sha1: ' + sha1 + '\n' +
        '        b64:  ' + btoa(str) + '\n');

    let response = 'HTTP/1.1 101 Switching Protocols\r\n' +
                   'Upgrade: websocket\r\n' +
                   'Connection: Upgrade\r\n' +
                   'Sec-WebSocket-Accept: ' + btoa(str) + '\r\n' +
                   '\r\n';
    this.write(response);
  },

  _parseFrame: function sc_parseFrame(bytes) {
    let type = bytes[0];

    if (type & kControlFrameMask) {
      log('receive a control frame. Aborting.');
      return [null, null];
    }

    if (type & kBinary) {
      log('receive a binary frame. Aborting.');
      return [null, null];
    } else if (type & kContinuation) {
      log('receive a continuation frame. Aborting.');
      return [null, null];
    }

    if (type & kText) {
      let headerSize = 0;

      let length = bytes[1] & ~kMaskBit;
      if (length < 126) {
        headerSize = 6;
      } else if (length == 126) {
        length = bytes[2] << 8 | bytes[3];
        headerSize = 8;
      } else if (length == 127) {
        length = bytes[2] << (1 << 7) |
                 bytes[3] << (1 << 6) |
                 bytes[4] << (1 << 5) |
                 bytes[5] << (1 << 4) |
                 bytes[6] << (1 << 3) |
                 bytes[7] << (1 << 2) |
                 bytes[8] << (1 << 1) |
                 bytes[9] << (1 << 0);
        headerSize = 14;
      }

      let masks = bytes.slice(headerSize - 4, headerSize);
      log('masks: ' + masks);

      let decoded = [];
      let frameLength = length + headerSize;
      for (let i = headerSize, j = 0; i < frameLength; i++, j++)
        decoded[j] = String.fromCharCode(bytes[i] ^ masks[j % 4]);

      log('server: text: ' + decoded + '(' + length + ')');

      let frame = decoded.join('');
      let nextFrame = bytes.slice(frameLength, bytes.length);
      return [frame, nextFrame];
    }
  }
};

