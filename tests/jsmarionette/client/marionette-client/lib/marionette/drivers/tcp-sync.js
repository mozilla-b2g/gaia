'use strict';

var debug = require('debug')('marionette:tcp-sync');
var wire = require('json-wire-protocol');
var sockittome = require('sockit-to-me');

var Command = require('../message').Command;
var Response = require('../message').Response;

var DEFAULT_HOST = 'localhost';
var DEFAULT_PORT = 2828;
var SOCKET_TIMEOUT_EXTRA = 500;

function TcpSync(options) {
  if (!options) {
    options = {};
  }

  this.host = options.host || DEFAULT_HOST;
  this.port = options.port || DEFAULT_PORT;
  this.connectionTimeout = options.connectionTimeout || 2000;

  this.isSync = true;
  this.retryInterval = 300;
  this.sockit = new sockittome.Sockit();
  this.sockit.setPollTimeout(this.connectionTimeout + SOCKET_TIMEOUT_EXTRA);

  this._lastId = 0;
}

TcpSync.prototype._createSocketConfig = function() {
  return {host: this.host, port: this.port};
};

TcpSync.prototype.setScriptTimeout = function(timeout) {
  this.sockit.setPollTimeout(timeout + SOCKET_TIMEOUT_EXTRA);
};

/**
 * Utility to wait for the marionette socket to be ready.
 *
 * @method waitForSocket
 * @param {Object} [options] for timeout.
 * @param {Number} [options.interval] time between running test.
 * @param {Number} [options.timeout] maximum wallclock time before
 *   failing test.
 * @param {Function} [callback] callback.
 */
TcpSync.prototype.waitForSocket = function(options, callback) {
  // the logic is lifted from
  // mozilla-central/source/testing/marionette/client/marionette/marionette.py

  if (typeof(options) === 'function') {
    callback = options;
    options = null;
  }

  options = options || {};
  var interval = options.interval || 100;
  var timeout = options.timeout || 300000;
  var socketTimeout = 1000;

  var sockit = new sockittome.Sockit();
  var start = Date.now();
  var lastDebugMessage = '';
  var self = this;

  // Use sockittome's built in polling timeout during calls to connect
  // to avoid socket misuse.
  sockit.setPollTimeout(socketTimeout);

  var probeSocket = function() {
    try {
      sockit.connect(this._createSocketConfig());
      var s = sockit.read(16).toString();
      sockit.close();

      if (s.indexOf(':') != -1) {
        callback();
        return;
      }
    } catch (e) {
      // This may seem ridiculous, but we have to keep these errors showing up
      // but, they often repeat like CRAZY, so, quiet them down by only showing
      // each exception we encounter once.
      if (lastDebugMessage != e.message) {
        lastDebugMessage = e.message;
        debug('exception when probing socket', lastDebugMessage);
      }

      // Above read _may_ fail so it is important to close the socket...
      sockit.close();
    }
    // timeout. Abort.
    if ((Date.now() - start) > timeout) {
      console.error('Timeout connecting to B2G');
      return;
    }
    // interval delay for the next iteration.
    setTimeout(probeSocket.bind(self), interval);
  }.bind(this);

  debug('probing socket');
  probeSocket();
};

TcpSync.prototype.connect = function(callback) {
  this.waitForSocket(function _connect() {
    try {
      this.sockit.connect(this._createSocketConfig());
    } catch(err) {
      if (Date.now() - this._beginConnect >= this.connectionTimeout) {
        callback(err);
      }
      setTimeout(_connect.bind(this, callback), this.retryInterval);
      return;
    }

    if (!this._beginConnect) {
      this._beginConnect = Date.now();
    }

    // Ensure this method's resolution is asynchronous in all cases
    process.nextTick(function() {
      debug('socket connected');
      delete this._beginConnect;

      var resp = this._readResponse();
      this.marionetteProtocol = resp.marionetteProtocol || 1;
      this.traits = resp.traits;
      this.applicationType = resp.applicationType;

      callback();
    }.bind(this));
  }.bind(this));
};

TcpSync.prototype.defaultCallback = function(err, result) {
  if (err) {
    console.log("tcp-sync.js.defaultCallback:", err);
    throw err;
  }
  return result;
};

// Following the json-wire-protocol implementation, read one byte at a time
// until the 'separator' character is received. The data preceding the
// delimiter describes the length of the JSON string.
TcpSync.prototype._readResponse = function() {
  var stream = new wire.Stream();
  var data, error;

  stream.on('data', function(parsed) {
    data = parsed;
  });
  stream.on('error', function(err) {
    error = err;
  });

  while (!data && !error) {
    stream.write(this.sockit.read(1));
  }

  if (error) {
    throw error;
  }

  if (this.marionetteProtocol >= 3) {
    var resp = Response.fromMsg(data);
    return resp.error || resp.result;
  }

  return data;
};

/**
 * Sends a JSON data structure across the wire to the remote end.
 *
 * @param {(Object|Command|Response)} obj
 *     An object that can be dumped into a JSON data structure,
 *     or a message that can be marshaled.
 * @param {Function} cb
 *     Callback to be called when a response for the request is received.
 *
 * @return {?}
 *     The return value from the passed in callback.
 */
TcpSync.prototype.send = function(obj, cb) {
  if (obj instanceof Command || obj instanceof Response) {
    return this.sendMessage(obj, cb);
  } else {
    return this.sendRaw(obj, cb);
  }
};

/**
 * Sends a message across the wire to the remote end.
 *
 * @param {(Command|Response)} msg
 *     The message to send.
 * @param {Function} cb
 *     Callback to be called when a response for the command is received.
 *
 * @return {?}
 *     The return value from the passed in callback.
 */
TcpSync.prototype.sendMessage = function(msg, cb) {
  msg.id = ++this._lastId;
  return this.sendRaw(msg.toMsg(), cb);
};

/**
 * Sends a JSON data structure across the wire to the remote end.
 *
 * @param {Object} data
 *     An object that can be marshaled into a JSON data structure.
 * @param {Function} cb
 *     Callback to be called when a response for the request is received.
 *
 * @return {?}
 *     The return value from the passed in callback.
 */
TcpSync.prototype.sendRaw = function(data, cb) {
  debug('write', data);
  this.sockit.write(wire.stringify(data));
  return cb(this._readResponse());
};

TcpSync.prototype.close = function() {
  this.sockit.close();
};

module.exports = TcpSync;
