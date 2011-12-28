/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;
const CC = Components.Constructor;
const CID = Components.ID;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");

const SERVER_CONTRACTID = "@mozilla.org/server/gaia;1";
const SERVER_CID = CID("{cff21d8a-3140-11e1-9a20-af1d63323c56}");

const ServerFactory = {
  _instance: null,
  createInstance: function sf_createInstance(outer, iid) {
    if (outer != null)
      throw Cr.NS_ERROR_NO_AGGREGATION;
    return this._instance || (this._instance = new ServerGaia());
  }
};


// ServerGaia Impl
const ServerSocket = CC("@mozilla.org/network/server-socket;1",
                        "nsIServerSocket",
                        "init");
const SOCKET_PORT = 6789;

function ServerGaia() {
}

ServerGaia.prototype = {
  start: function sg_start() {
    dump('server: starting socket: ');
    let socket = this._socket = new ServerSocket(SOCKET_PORT, false, -1);
    socket.asyncListen(this);
    dump('started\n');
  },

  stop: function sg_stop() {
    dump('server: closing clients connections: ');
    for each (let client in this._connections)
      client.close();
    dump('closed\n');

    dump('server: closing socket: ');
    this._socket.close();
    dump('closed\n');

  },

  // nsIServerSocketListener impl
  _connections: [],
  onSocketAccepted: function sg_onSocketAccepted(sock, transport) {
    dump('server: got client connection\n');
    let input = transport.openInputStream(0, 0, 0);
    let output = transport.openOutputStream(0, 0, 0);
    let client = new SocksClient(this, input, output);
    this._connections.push(client);
  },

  onStopListening: function sg_onStopListening(sock, status) {
  },

  // nsIObserver impl
  observe: function sg_observe(subject, topic, data) {
    switch (topic) {
      case 'profile-after-change':
        this.start();
        Services.obs.addObserver(this, 'quit-application', false);
        break;
      case 'quit-application':
        this.stop();
        Services.obs.removeObserver(this, 'quit-application');
        break;
      default:
        throw Components.Exception('Unknown topic: ' + topic);
    }
  },

  classID: SERVER_CID,
  _xpcom_factory: ServerFactory,
  QueryInterface: XPCOMUtils.generateQI([
    Ci.nsIObserver, Ci.nsIServerSocketListener
  ]),
};


// SocksClient Impl
function stringToSha1(str) {
  let hasher = Cc["@mozilla.org/security/hash;1"]
                 .createInstance(Ci.nsICryptoHash);
  hasher.init(hasher.SHA1);

  let converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                    .createInstance(Ci.nsIScriptableUnicodeConverter);
  converter.charset = "UTF-8";

  let data = converter.convertToByteArray(str, {});
  hasher.update(data, data.length);
  let bytes = hasher.finish(false);

  let hex = "";
  for (let i = 0; i < bytes.length; i++)
    hex += ("0" + bytes[i].charCodeAt().toString(16)).slice(-2);
  return hex;
}

const STATE_CONNECTING = 0;
const STATE_CONNECTED = 1;

const currentThread = Cc["@mozilla.org/thread-manager;1"]
                        .getService().currentThread;

function SocksClient(server, input, output) {
  this._input = input;
  this._output = output;
  this.state = STATE_CONNECTING;

  this.waitRead();
}

const BinaryInputStream = CC("@mozilla.org/binaryinputstream;1",
                             "nsIBinaryInputStream",
                             "setInputStream");

SocksClient.prototype = {
  onInputStreamReady: function sc_onInputStreamReady(input) {
    let len = input.available();
    if (len == 0) {
      dump('server: client close\n');
      return;
    }
    var bin = new BinaryInputStream(input);
    data = bin.readByteArray(len);
    dump('bytes: \n');
    dump(data);
    dump('\n');

    switch (this.state) {
      case STATE_CONNECTING:
        let headers = {};

        data = String.fromCharCode.apply(null, data);
        let fields = data.split('\r\n');
        for each (let field in fields) {
          let [name, value] = field.split(': ');
          headers[name] = value;
        }

        let magicKey = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
        let key = headers['Sec-WebSocket-Key'];
        let reply = key + magicKey;
        let sha1 = stringToSha1(reply);

        let str = '';
        for (var i = 0; i < sha1.length; i+=2)
          str += String.fromCharCode(parseInt(sha1.substr(i, 2), 16));

        dump('server: key: ' + key + '\n' +
             '        sha1: ' + sha1 + '\n' +
             '        b64:  ' + btoa(str) + '\n');

        let response = 'HTTP/1.1 101 Switching Protocols\r\n' +
                       'Upgrade: websocket\r\n' +
                       'Connection: Upgrade\r\n' +
                       'Sec-WebSocket-Accept: ' + btoa(str) + '\r\n' +
                       '\r\n';
        this.write(response);
        this.state = STATE_CONNECTED;
        break;
      default:
        let frameType = data[0];

        const kControlFrameMask = 0x8;
        const kMaskBit = 0x80;
        const kFinalFragBit = 0x80;

        if (frameType & kControlFrameMask) {
          // Controls frames
          const kClose = 0x8;
          const kPing = 0x9;
          const kPong = 0xA;

          dump('server: Got a control frame....\n');
          return;
        }

        dump('server: Got a regular frame....\n');

        // Non-control frames
        const kContinuation = 0x0;
        const kText = 0x1;
        const kBinary = 0x2;

        if (frameType & kContinuation) {
          dump('continuation\n');
        } else if (frameType & kText) {
          let length = data[1] & ~kMaskBit;
          let headerSize = 0;
          let mask = '';
          if (length < 126) {
            headerSize = 6;
            let decoded = [];
            let masks = data.slice(2, 6);
            dump('server: ' + masks + '\n');
            for (let i = headerSize, j = 0; i < data.length; i++, j++)
              decoded[j] = String.fromCharCode(data[i] ^ masks[j % 4]);

            dump('server: text: ' + decoded + '(' + length + ')\n');

            //data = String.fromCharCode.apply(null, data);
            this.write('toto');
          } else if (lenght == 126) {
            headerSize = 8;

            // XXX not supported yet
          } else if (length == 127) {
            headerSize = 14;

            // XXX not supported yet
          }
        } else if (frameType & kBinary) {
          dump('binary\n');
        }
  
        break;
    }

    this.waitRead();
  },

  onOutputStreamReady: function sc_onOutputStreamReady(output) {
    dump('server: output stream ready!\n');

    let buffer = this._outputBuffer;
    this._outputBuffer = '';

    let len = output.write(buffer, buffer.length);
    if (len == buffer.length) {
      return;
    }

    this._outputBuffer = buffer.substring(len);
    this.waitWrite();
  },

  close: function sc_close() {
    this._input.close();
    this._output.close();
  },

  waitRead: function sc_waitRead() {
    this._input.asyncWait(this, 0, 0, currentThread);
  },

  _outputBuffer: '',
  write: function(str) {
    if (this.state == STATE_CONNECTED) {
      str = String.fromCharCode(129) + 
            String.fromCharCode(str.length) +
            str;
    } 

    dump('sending....' + str + '\n');
    this._outputBuffer += str;
    this.waitWrite();
  },

  waitWrite: function sc_waitWrite() {
    this._output.asyncWait(this, 0, 0, currentThread);
  }
};


NSGetFactory = XPCOMUtils.generateNSGetFactory([ServerGaia]);

