(function(exports) {
  if (typeof(exports.Marionette) === 'undefined') {
    exports.Marionette = {};
  }

  if (typeof(exports.Marionette.Drivers) === 'undefined') {
    exports.Marionette.Drivers = {};
  }

  if (typeof(TestAgent) === 'undefined') {
    TestAgent = require('test-agent/lib/test-agent/websocket-client').TestAgent;
  }

  var Abstract;

  if (typeof(window) === 'undefined') {
    Abstract = require('./abstract').Marionette.Drivers.Abstract;
  } else {
    Abstract = Marionette.Drivers.Abstract;
  }

  function Websocket(options) {
    Abstract.call(this, options);

    this.client = new TestAgent.WebsocketClient(options);
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

  exports.Marionette.Drivers.Websocket = Websocket;

}(
  (typeof(window) === 'undefined') ? module.exports : window
));
