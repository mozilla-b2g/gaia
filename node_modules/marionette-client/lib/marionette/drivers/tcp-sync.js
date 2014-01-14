var wire = require('json-wire-protocol');
var debug = require('debug')('marionette:tcp-sync');
var sockittome = require('sockit-to-me');
var DEFAULT_HOST = 'localhost';
var DEFAULT_PORT = 2828;

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
};

TcpSync.prototype.isSync = true;
TcpSync.prototype.host = DEFAULT_HOST;
TcpSync.prototype.port = DEFAULT_PORT;
TcpSync.prototype.connectionTimeout = 2000;
TcpSync.prototype.retryInterval = 300;

TcpSync.prototype.connect = function(callback) {

  try {
    this.sockit.connect({ host: this.host, port: this.port });
  } catch(err) {
    if (Date.now() - this._beginConnect >= this.connectionTimeout) {
      callback(err);
    }
    setTimeout(this.connect.bind(this, callback), this.retryInterval);
    return;
  }

  if (!this._beginConnect) {
    this._beginConnect = Date.now();
  }

  // Ensure this method's resolution is asynchronous in all cases
  setTimeout(function() {
    debug('socket connected');
    delete this._beginConnect;

    this._readResponse();

    callback();
  }.bind(this), 0);
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
  var char, data, error;

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
