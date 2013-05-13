var Agent = require('test-agent'),
    ConnectionManger = require('./connection-manager'),
    debug = require('debug')('marionette:websocket-server');

function WebsocketServer(options) {

  if (typeof(options) === 'undefined') {
    options = {};
  }

  this.manager = new ConnectionManger();

  Agent.WebsocketServer.apply(this, arguments);

  this.on('device create', this.onCreateDevice.bind(this));
  this.on('device command', this.onDeviceCommand.bind(this));
}

var proto = WebsocketServer.prototype = Object.create(
  Agent.WebsocketServer.prototype
);


/**
 * Start server on port
 *
 * @this
 */
proto.listen = function listen() {
  Agent.WebsocketServer.prototype.listen.apply(this, arguments);
  this.use(Agent.server.Responder);
};



/**
 * Handles device response.
 *
 * @this
 * @param {Object} device details for device. \
 *                        { id: id, connection: commandStream }.
 * @param {EventEmitter} socket socket instance.
 * @param {Object} data response from server.
 */
proto.onDeviceResponse = function onDeviceResponse(device, socket, data) {
  debug('SOCKET FOR - ', device.id, 'RESPONDING WITH', data);
  socket.send(this.stringify('device response', {
    id: device.id,
    response: data
  }));
};

/**
 * Closes socket for connection
 *
 * @this
 * @param {Object} connection connection to remove.
 * @param {Numeric} id connection id.
 */
proto._destroyConnection = function _destroyDeviceConnection(connection, id) {
  connection.socket.destroy();
  debug('CLOSING SOCKET', id);
};

/**
 * Creates a device connection for client.
 *
 * @this
 * @param {Object} options options for device connection.
 * @param {EventEmitter} socket client websocket instance.
 */
proto.onCreateDevice = function onCreateDevice(options, socket) {
  var destroy, command, device;

  if (!options) {
    options = {};
  }

  device = this.manager.open(options.port);
  socket.send(this.stringify('device ready', { id: device.id }));

  debug('CREATING DEVICE', device.id);

  destroy = this._destroyConnection.bind(null, device.connection, device.id);
  command = this.onDeviceResponse.bind(this, device, socket);

  socket.on('close', destroy);
  device.connection.on('command', command);
};

/**
 * Handles request to send a command to a device.
 *
 * @this
 * @param {Object} data marionette command to execute.
 * @param {EventEmitter} socket websocket client connection.
 */
proto.onDeviceCommand = function onDeviceCommand(data, socket) {
  if (typeof(data) === 'undefined') {
    data = {};
  }

  var device = this.manager.get(data.id);

  debug('SENDING DEVICE CMD', data.id, data.command);

  if (device) {
    device.send(data.command);
  } else {
    socket.send(this.stringify('device response', {
      error: 'connection id ' + data.id + ' was not found'
    }));
  }
};

module.exports = exports = WebsocketServer;
