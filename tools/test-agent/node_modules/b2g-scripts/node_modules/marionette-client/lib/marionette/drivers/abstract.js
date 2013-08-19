(function(exports) {
  if (typeof(exports.Marionette) === 'undefined') {
    exports.Marionette = {};
  }

  if (typeof(exports.Marionette.Drivers) === 'undefined') {
    exports.Marionette.Drivers = {};
  }

  function Abstract(options) {
    this._sendQueue = [];
    this._responseQueue = [];
  }

  Abstract.prototype = {

    /**
     * Timeout for commands
     *
     * @type Numeric
     */
    timeout: 10000,

    /**
     * Waiting for a command to finish?
     *
     * @type Boolean
     */
    _waiting: true,

    /**
     * Is system ready for commands?
     *
     * @type Boolean
     */
    ready: false,

    /**
     * Connection id for the server.
     *
     * @type Numeric
     */
    connectionId: null,

    /**
     * Sends remote command to server.
     * Each command will be queued while waiting for
     * any pending commands. This ensures order of
     * response is correct.
     *
     *
     * @param {Object} command remote command to send to marionette.
     * @param {Function} callback executed when response comes back.
     */
    send: function send(cmd, callback) {
      if (!this.ready) {
        throw new Error('connection is not ready');
      }

      if (typeof(callback) === 'undefined') {
        throw new Error('callback is required');
      }

      this._responseQueue.push(callback);
      this._sendQueue.push(cmd);

      this._nextCommand();

      return this;
    },

    /**
     * Connects to a remote server.
     * Requires a _connect function to be defined.
     * Example:
     *
     *    MyClass.prototype._connect = function _connect(){
     *      //open a socket to marrionete accept response
     *      //you *must* call _onDeviceResponse with the first
     *      //response from marionette it looks like this:
     *      //{ from: 'root', applicationType: 'gecko', traits: [] }
     *      this.connectionId = result.id;
     *    }
     *
     * @param {Function} callback \
     *  executes after successfully connecting to the server.
     */
    connect: function connect(callback) {
      this.ready = true;
      this._responseQueue.push(function(data) {
        this.applicationType = data.applicationType;
        this.traits = data.traits;
        callback();
      }.bind(this));
      this._connect();
    },

    /**
     * Destroys connection to server
     *
     * Will immediately close connection to server
     * closing any pending responses.
     */
    close: function() {
      this.ready = false;
      this._responseQueue.length = 0;
      if (this._close) {
        this._close();
      }
    },

    /**
     * Checks queue if not waiting for a response
     * Sends command to websocket server
     *
     * @private
     */
    _nextCommand: function _nextCommand() {
      var nextCmd;
      if (!this._waiting && this._sendQueue.length) {
        this._waiting = true;
        nextCmd = this._sendQueue.shift();
        this._sendCommand(nextCmd);
      }
    },

    /**
     * Handles responses from devices.
     * Will only respond to the event if the connectionId
     * is equal to the event id and the client is ready.
     *
     * @param {Object} data response from server.
     * @private
     */
    _onDeviceResponse: function _onDeviceResponse(data) {
      var cb;
      if (this.ready && data.id === this.connectionId) {
        this._waiting = false;
        cb = this._responseQueue.shift();
        cb(data.response);

        this._nextCommand();
      }
    }

  };

  exports.Marionette.Drivers.Abstract = Abstract;

}(
  (typeof(window) === 'undefined') ? module.exports : window
));
