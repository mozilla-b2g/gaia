(function(module, ns) {
  var WebsocketClient,
      Abstract = ns.require('drivers/abstract');

  if (!this.TestAgent) {
    WebsocketClient = require('test-agent/lib/test-agent/websocket-client');
  } else {
    WebsocketClient = TestAgent.WebsocketClient;
  }

  /**
   * WebSocket interface for marionette.
   * Generally {{#crossLink "Marionette.Drivers.Tcp"}}{{/crossLink}}
   * will be faster and more reliable but WebSocket can expose devices
   * over http instead of a pure socket.
   *
   *
   * @extend Marionette.Drivers.Abstract
   * @class Marionette.Drivers.Websocket
   * @param {Object} options options for abstract/prototype.
   */
  function Websocket(options) {
    Abstract.call(this, options);

    this.client = new WebsocketClient(options);
    this.client.on('device response', this._onDeviceResponse.bind(this));
  }

  Websocket.prototype = Object.create(Abstract.prototype);

  /**
   * Sends a command to the websocket server.
   *
   * @param {Object} command remote marionette command.
   * @private
   */
  Websocket.prototype._sendCommand = function _sendCommand(cmd) {
    this.client.send('device command', {
      id: this.connectionId,
      command: cmd
    });
  };

  /**
   * Opens a connection to the websocket server and creates
   * a device connection.
   *
   * @param {Function} callback sent when initial response comes back.
   */
  Websocket.prototype._connect = function connect() {
    var self = this;

    this.client.start();

    this.client.once('open', function wsOpen() {

      //because I was lazy and did not implement once
      function connected(data) {
        self.connectionId = data.id;
      }

      self.client.once('device ready', connected);
      self.client.send('device create');

    });

  };

  /**
   * Closes connection to marionette.
   */
  Websocket.prototype._close = function close() {
    if (this.client && this.client.close) {
      this.client.close();
    }
  };

  module.exports = Websocket;

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('drivers/websocket'), Marionette] :
    [module, require('../marionette')]
));
