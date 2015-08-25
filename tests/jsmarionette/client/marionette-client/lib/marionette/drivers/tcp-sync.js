'use strict';
var debug = require('debug')('marionette:tcp-sync');
var wire = require('json-wire-protocol');
var sockittome = require('sockit-to-me');

var DEFAULT_HOST = 'localhost';
var DEFAULT_PORT = 2828;
var SOCKET_TIMEOUT_EXTRA = 500;

function TcpSync(options) {
  if (!options) {
    options = {};
  }

  if ('port' in options) {
    this.port = options.port;
  }
  if ('host' in options) {
    this.host = options.host;
  }
  if ('connectionTimeout' in options) {
    this.connectionTimeout = options.connectionTimeout;
  }

  this.sockit = new sockittome.Sockit();
  this.sockit.setPollTimeout(this.connectionTimeout + SOCKET_TIMEOUT_EXTRA);
}

TcpSync.prototype.isSync = true;
TcpSync.prototype.host = DEFAULT_HOST;
TcpSync.prototype.port = DEFAULT_PORT;
TcpSync.prototype.connectionTimeout = 2000;
TcpSync.prototype.retryInterval = 300;

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
  var timeout = options.timeout || 30000;
  var socketTimeout = 1000;

  var sockit = new sockittome.Sockit();
  var start = Date.now();
  var lastDebugMessage = '';
  var self = this;

  // Use sockittome's built in polling timeout during calls to connect
  // to avoid socket misuse.
  sockit.setPollTimeout(socketTimeout);
  var socketConfig = { host: this.host, port: this.port };

  function probeSocket() {
    try {
      debug('probing socket');
      sockit.connect(socketConfig);

      var s = sockit.read(16).toString();
      sockit.close();
      if (s.indexOf(':') != -1) {
        callback();
        return;
      }
    }
    catch(e) {
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
      console.error('timeout connecting to b2g.');
      return;
    }
    // interval delay for the next iteration.
    setTimeout(probeSocket.bind(self), interval);
  }

  probeSocket();
};

TcpSync.prototype.connect = function(callback) {

  this.waitForSocket(function _connect() {
    try {
      this.sockit.connect({ host: this.host, port: this.port });
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

      this._readResponse();

      callback();
    }.bind(this));
  }.bind(this));
};

TcpSync.prototype.defaultCallback = function(err, result) {
  if (err) {
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
    debug('read', parsed);
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

  return data;
};

TcpSync.prototype.send = function(command, callback) {
  debug('write', command);
  this.sockit.write(wire.stringify(command));
  return callback(this._readResponse());
};

TcpSync.prototype.close = function() {
  this.sockit.close();
};

module.exports = TcpSync;
