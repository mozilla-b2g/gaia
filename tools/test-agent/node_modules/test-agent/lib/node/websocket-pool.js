var PoolBase = require('../../lib/test-agent/pool-base').TestAgent.PoolBase;

function WebsocketPool() {
  PoolBase.apply(this, arguments);
}

WebsocketPool.HEADER_KEY = 'sec-websocket-key';

WebsocketPool.prototype = Object.create(PoolBase.prototype);

WebsocketPool.prototype.objectDetails = function objectDetails(object) {
  var result = {};

  result.key = object.req.headers[WebsocketPool.HEADER_KEY];
  result.value = object;

  return result;
};

WebsocketPool.prototype.checkObjectValue = function checkObjectValue(value) {
  return (!('socket' in value) || !value.socket.destroyed);
};

/**
 * Sends a message to each socket (via .send)
 *
 * @param {String} message
 */
WebsocketPool.prototype.broadcast = function broadcast(message) {
  this.each(this._broadcastEach.bind(this, message));
};

WebsocketPool.prototype._broadcastEach = function _broadcastEach(message, socket) {
  socket.send(message);
};


module.exports = exports = WebsocketPool;
