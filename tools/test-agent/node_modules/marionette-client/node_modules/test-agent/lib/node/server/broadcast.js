var WebSocketPool = require(__dirname + '/../websocket-pool');

/**
 * REQUIRES: responder
 *
 * Provides a broadcast method to the server
 * which will `send` data to each connected client.
 */
function Broadcast() {
  this.pool = new WebSocketPool();
}

Broadcast.prototype.enhance = function enhance(server) {
  server.socket.on('connection', this._onConnection.bind(this));
  server.broadcast = this._broadcast.bind(this);
};

Broadcast.prototype._broadcast = function _broadcast(message) {
  this.pool.broadcast(message);
};

Broadcast.prototype._onConnection = function _onConnection(socket) {
  this.pool.add(socket);

  socket.on('close', this._onConnectionClose.bind(this, socket));
};

Broadcast.prototype._onConnectionClose = function _onConnectionClose(socket) {
  this.pool.remove(socket);
};

module.exports = exports = Broadcast;
