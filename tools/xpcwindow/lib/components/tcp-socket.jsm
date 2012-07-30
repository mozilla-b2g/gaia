
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;
const CC = Components.Constructor;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

var EXPORTED_SYMBOLS = ['TCPSocket'];

let debug = false;
function LOG(msg) {
  if (debug)
    dump("TCPSocket: " + msg + "\n");
}

/*
 * nsITCPSocketEvent object
 */

function TCPSocketEvent(type, sock, data) {
  this.type = type;
  this.socket = sock;
  this.data = data;
}

TCPSocketEvent.prototype = {
  classID: Components.ID("{f29a577b-e831-431e-a540-1c4856721c82}"),

  QueryInterface: XPCOMUtils.generateQI([Ci.nsITCPSocketEvent]),

  classInfo: XPCOMUtils.generateCI({
    classID: Components.ID("{f29a577b-e831-431e-a540-1c4856721c82}"),
    contractID: "@mozilla.org/tcp-socket-event;1",
    classDescription: "TCP Socket Event",
    interfaces: [Ci.nsITCPSocketEvent],
    flags: Ci.nsIClassInfo.DOM_OBJECT
  })
};


const InputStreamPump = CC(
        "@mozilla.org/network/input-stream-pump;1", "nsIInputStreamPump", "init"),
      AsyncStreamCopier = CC(
        "@mozilla.org/network/async-stream-copier;1", "nsIAsyncStreamCopier", "init"),
      ScriptableInputStream = CC(
        "@mozilla.org/scriptableinputstream;1", "nsIScriptableInputStream", "init"),
      BinaryInputStream = CC(
        "@mozilla.org/binaryinputstream;1", "nsIBinaryInputStream", "setInputStream"),
      StringInputStream = CC(
        '@mozilla.org/io/string-input-stream;1', 'nsIStringInputStream'),
      MultiplexInputStream = CC(
        '@mozilla.org/io/multiplex-input-stream;1', 'nsIMultiplexInputStream');

const kCONNECTING = 'connecting';
const kOPEN = 'open';
const kCLOSING = 'closing';
const kCLOSED = 'closed';

const BUFFER_SIZE = 65536;

/*
 * nsIDOMTCPSocket object
 */

function TCPSocket() {
  this.readyState = kCLOSED;

  this.onopen = null;
  this.ondrain = null;
  this.ondata = null;
  this.onerror = null;
  this.onclose = null;

  this.binaryType = "string";

  this.host = "";
  this.port = 0;
  this.ssl = false;
};


TCPSocket.prototype = {
  // Constants
  CONNECTING: kCONNECTING,
  OPEN: kOPEN,
  CLOSING: kCLOSING,
  CLOSED: kCLOSED,

  // The binary type, "string" or "arraybuffer"
  binaryType: null,

  // Internal
  _hasPrivileges: null,
  _binaryType: "string",

  // Raw socket streams
  _transport: null,
  _socketInputStream: null,
  _socketOutputStream: null,

  // Input stream machinery
  _inputStreamPump: null,
  _inputStreamScriptable: null,
  _inputStreamBinary: null,

  // Output stream machinery
  _outputMultiplexStream: null,
  _outputStreamCopier: null,

  _asyncCopierActive: false,
  _waitingForDrain: false,
  _suspendCount: 0,

  _createTransport: function ts_createTransport(host, port, sslMode) {
    let options, optlen;
    if (sslMode) {
      options = [sslMode];
      optlen = 1;
    } else {
      options = null;
      optlen = 0;
    }
    return Cc["@mozilla.org/network/socket-transport-service;1"]
             .getService(Ci.nsISocketTransportService)
             .createTransport(options, optlen, host, port, null);
  },

  _ensureCopying: function ts_ensureCopying(that) {
    if (that._asyncCopierActive) {
      return;
    }
    that._asyncCopierActive = true;
    that._outputStreamCopier.asyncCopy({
      onStartRequest: function ts_output_onStartRequest() {
      },
      onStopRequest: function ts_output_onStopRequest() {
        that._asyncCopierActive = false;
        that._outputMultiplexStream.removeStream(0);
        if (that._outputMultiplexStream.count) {
          that._ensureCopying(that);
        } else {
          if (that._waitingForDrain) {
            that._waitingForDrain = false;
            that.callListener("ondrain");          
          }
          if (that.readyState === kCLOSING) {
            that._socketOutputStream.close();
          }
        }
      }
    }, null);
  },

  callListener: function ts_callListener(type, data) {
    if (!this[type])
      return;

    this[type].call(null, new TCPSocketEvent(type, this, data || ""));
  },

  get bufferedAmount() {
    return this._outputMultiplexStream.available();
  },

  init: function ts_init(aWindow) {
    // When the TCPSocket property is initialized for each window,
    // we check to see if the tcp-socket permission is set for this
    // domain. If not, open will refuse to create and open new sockets.
    let principal = aWindow.document.nodePrincipal;
    this._hasPrivileges = (
      Services.perms.testExactPermission(principal.URI, "tcp-socket")
      === Ci.nsIPermissionManager.ALLOW_ACTION);
  },

  // nsIDOMTCPSocket
  open: function ts_open(host, port, options) {
    // in the testing case, init won't be called and
    // hasPrivileges will be null. We want to proceed to test.
    if (this._hasPrivileges !== true && this._hasPrivileges !== null) {
      throw new Error("TCPSocket does not have permission in this context.\n");
    }
    let that = new TCPSocket();

    LOG("startup called\n");
    LOG("Host info: " + host + ":" + port + "\n");

    that.readyState = kCONNECTING;
    that.host = host;
    that.port = port;
    if (options !== undefined) {
      if (options.useSSL) {
          that.ssl = 'ssl';
      } else {
          that.ssl = false;
      }
      that.binaryType = options.binaryType || that.binaryType;
    }
    that._binaryType = that.binaryType;

    LOG("SSL: " + that.ssl + "\n");

    let transport = that._transport = this._createTransport(host, port, that.ssl);
    transport.setEventSink(that, Services.tm.currentThread);
    transport.securityCallbacks = new SecurityCallbacks(that);

    that._socketInputStream = transport.openInputStream(0, 0, 0);
    that._socketOutputStream = transport.openOutputStream(
      Ci.nsITransport.OPEN_UNBUFFERED, 0, 0);

    // If the other side is not listening, we will
    // get an onInputStreamReady callback where available
    // raises to indicate the connection was refused.
    that._socketInputStream.asyncWait(
      that, that._socketInputStream.WAIT_CLOSURE_ONLY, 0, Services.tm.currentThread);

    if (that.binaryType === "arraybuffer") {
      that._inputStreamBinary = new BinaryInputStream(that._socketInputStream);
    } else {
      that._inputStreamScriptable = new ScriptableInputStream(that._socketInputStream);
    }

    that._outputMultiplexStream = new MultiplexInputStream();

    that._outputStreamCopier = new AsyncStreamCopier(
      that._outputMultiplexStream,
      that._socketOutputStream,
      // (nsSocketTransport uses gSocketTransportService)
      Cc["@mozilla.org/network/socket-transport-service;1"]
        .getService(Ci.nsIEventTarget),
      /* source buffered */ true, /* sink buffered */ false,
      BUFFER_SIZE, /* close source*/ false, /* close sink */ false);

    return that;
  },

  close: function ts_close() {
    if (this.readyState === kCLOSED || this.readyState === kCLOSING)
      return;

    LOG("close called\n");
    this.readyState = kCLOSING;

    if (!this._outputMultiplexStream.count) {
      this._socketOutputStream.close();
    }
    this._socketInputStream.close();
  },

  send: function ts_send(data) {
    if (this.readyState !== kOPEN) {
      throw new Error("Socket not open.");
    }

    let new_stream = new StringInputStream();
    if (this._binaryType === "arraybuffer") {
      // It would be really nice if there were an interface
      // that took an ArrayBuffer like StringInputStream takes
      // a string. There is one, but only in C++ and not exposed
      // to js as far as I can tell
      data = Array.map(data, function(el, i) {
        return String.fromCharCode(el);
      }).join("");
    }
    new_stream.setData(data, data.length);
    this._outputMultiplexStream.appendStream(new_stream);

    this._ensureCopying(this);

    if (this.bufferedAmount >= BUFFER_SIZE) {
      // If we buffered more than some arbitrary amount of data,
      // (65535 right now) we should tell the caller so they can
      // wait until ondrain is called, once all the buffered data
      // has been written to the socket.
      this._waitingForDrain = true;
      return false;
    }
    return true;
  },

  suspend: function ts_suspend() {
    if (this._inputStreamPump) {
      this._inputStreamPump.suspend();
    } else {
      this._suspendCount++;
    }
  },

  resume: function ts_resume() {
    if (this._inputStreamPump) {
      this._inputStreamPump.resume();
    } else {
      this._suspendCount--;
    }
  },

  // nsITransportEventSink (Triggered by transport.setEventSink)
  onTransportStatus: function ts_onTransportStatus(
    transport, status, progress, max) {

    if (status === Ci.nsISocketTransport.STATUS_CONNECTED_TO) {
      this.readyState = kOPEN;
      this.callListener("onopen");

      this._inputStreamPump = new InputStreamPump(
        this._socketInputStream, -1, -1, 0, 0, false
      )
      while (this._suspendCount) {
        this._inputStreamPump.suspend();
        this._suspendCount--;
      }
      
      this._inputStreamPump.asyncRead(this, null);
    }
  },

  // nsIAsyncInputStream (Triggered by _socketInputStream.asyncWait)
  // Only used for detecting connection refused
  onInputStreamReady: function ts_onInputStreamReady(input) {
    try {
      input.available();
    } catch (e) {
      this.callListener("onerror", new Error("Connection refused"));
    }
  },

  // nsIRequestObserver (Triggered by _inputStreamPump.asyncRead)
  onStartRequest: function ts_onStartRequest(request, context) {
  },

  // nsIRequestObserver (Triggered by _inputStreamPump.asyncRead)
  onStopRequest: function ts_onStopRequest(request, context, status) {
    this.readyState = kCLOSED;
    this._inputStreamPump = null;

    if (status) {
      let err = new Error("Connection closed: " + status);
      err.status = status;
      this.callListener("onerror", err);
    }

    this.callListener("onclose");
  },

  // nsIStreamListener (Triggered by _inputStreamPump.asyncRead)
  onDataAvailable: function ts_onDataAvailable(request, context, inputStream, offset, count) {
    if (this._binaryType === "arraybuffer") {
      let ua = new Uint8Array(count);
      ua.set(this._inputStreamBinary.readByteArray(count));
      this.callListener("ondata", ua);
    } else {
      this.callListener("ondata", this._inputStreamScriptable.read(count));
    }
  },

  classID: Components.ID("{cda91b22-6472-11e1-aa11-834fec09cd0a}"),

  classInfo: XPCOMUtils.generateCI({
    classID: Components.ID("{cda91b22-6472-11e1-aa11-834fec09cd0a}"),
    contractID: "@mozilla.org/tcp-socket;1",
    classDescription: "Client TCP Socket",
    interfaces: [Ci.nsIDOMTCPSocket],
    flags: Ci.nsIClassInfo.DOM_OBJECT,
  }),

  QueryInterface: XPCOMUtils.generateQI([
    Ci.nsIDOMTCPSocket,
  ])
}

function SecurityCallbacks(socket) {
  this._socket = socket;
}
SecurityCallbacks.prototype = {
  notifySSLError: function sc_notifySSLError(socketInfo, error, targetSite) {
    return true;
  },

  notifyCertProblem: function sc_notifyCertProblem(socketInfo, status,
                                                   targetSite) {
    this._socket.callListener("onerror", status);
    this._socket.close();
    return true;
  },

  getInterface: function sc_getInterface(iid) {
    return this;
  }
};
