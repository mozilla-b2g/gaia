(function(module, ns) {

  /**
   *
   * Abstract driver that will handle
   * all common tasks between implementations.
   * Such as error handling, request/response queuing
   * and timeouts.
   *
   * @constructor
   * @class Marionette.Drivers.Abstract
   * @param {Object} options set options on prototype.
   */
  function Abstract(options) {
    this._sendQueue = [];
    this._responseQueue = [];
  }

  Abstract.prototype = {

    /**
     * Timeout for commands
     *
     * @property timeout
     * @type Numeric
     */
    timeout: 10000,

    /**
     * Waiting for a command to finish?
     *
     * @private
     * @property _waiting
     * @type Boolean
     */
    _waiting: true,

    /**
     * Is system ready for commands?
     *
     * @property ready
     * @type Boolean
     */
    ready: false,

    /**
     * Connection id for the server.
     *
     * @property connectionId
     * @type Numeric
     */
    connectionId: null,

    /**
     * We just set the script timeout.
     * If you need to do something in the driver.
     *
     * @method setScriptTiemout
     * @param {Integer} the timeout value.
     */
    setScriptTimeout: function setScriptTimeout(timeout) {
    },

    /**
     * Sends remote command to server.
     * Each command will be queued while waiting for
     * any pending commands. This ensures order of
     * response is correct.
     *
     *
     * @method send
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
     *
     *     MyClass.prototype._connect = function _connect(){
     *       //open a socket to marrionete accept response
     *       //you *must* call _onDeviceResponse with the first
     *       //response from marionette it looks like this:
     *       //{ from: 'root', applicationType: 'gecko', traits: [] }
     *       this.connectionId = result.id;
     *     }
     *
     * @method connect
     * @param {Function} callback executes
     *   after successfully connecting to the server.
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
     *
     * @method close
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
     * @method _nextCommand
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
     * @method _onDeviceResponse
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

  module.exports = Abstract;

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('drivers/abstract'), Marionette] :
    [module, require('../marionette')]
));
