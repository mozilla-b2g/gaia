/**
 * Make our TCPSocket implementation look like node's net library.
 *
 * We make sure to support:
 *
 * Attributes:
 * - encrypted (false, this is not the tls byproduct)
 * - destroyed
 *
 * Methods:
 * - setKeepAlive(Boolean)
 * - write(Buffer)
 * - end
 *
 * Events:
 * - "connect"
 * - "close"
 * - "end"
 * - "data"
 * - "error"
 **/
define('net',['require','exports','module','util','events'],function(require, exports, module) {

var util = require('util'),
    EventEmitter = require('events').EventEmitter;

function NetSocket(port, host, crypto) {
  this._host = host;
  this._port = port;
  this._actualSock = navigator.mozTCPSocket.open(
    host, port, { useSSL: crypto, binaryType: 'arraybuffer' });
  EventEmitter.call(this);

  this._actualSock.onopen = this._onconnect.bind(this);
  this._actualSock.onerror = this._onerror.bind(this);
  this._actualSock.ondata = this._ondata.bind(this);
  this._actualSock.onclose = this._onclose.bind(this);

  this.destroyed = false;
}
exports.NetSocket = NetSocket;
util.inherits(NetSocket, EventEmitter);
NetSocket.prototype.setTimeout = function() {
};
NetSocket.prototype.setKeepAlive = function(shouldKeepAlive) {
};
NetSocket.prototype.write = function(buffer) {
  this._actualSock.send(buffer);
};
NetSocket.prototype.end = function() {
  this._actualSock.close();
  this.destroyed = true;
};

NetSocket.prototype._onconnect = function(event) {
  this.emit('connect', event.data);
};
NetSocket.prototype._onerror = function(event) {
  this.emit('error', event.data);
};
NetSocket.prototype._ondata = function(event) {
  var buffer = Buffer(event.data);
  this.emit('data', buffer);
};
NetSocket.prototype._onclose = function(event) {
  this.emit('close', event.data);
  this.emit('end', event.data);
};


exports.connect = function(port, host) {
  return new NetSocket(port, host, false);
};

}); // end define
