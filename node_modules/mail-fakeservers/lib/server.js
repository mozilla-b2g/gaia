/**
 * @fileoverview handles TCP based interprocess communication from xpcshell ->
 * node right now this is very generic and in theory could be ported to its own
 * library for general use. This is based on how marionette works and uses the
 * same internal json wire protocol (byteLength:jsonBytes).
 */
var net = require('net'),
    EventEmitter = require('events').EventEmitter,
    wire = require('json-wire-protocol'),
    debug = require('debug')('fakeserver:proxy');

/**
 * Server instance which manages a xpcshell process.
 *
 * @param {Number} port which server should bind to.
 * @constructor
 */
function Server(server) {
  // super!
  EventEmitter.call(this);

  // keep a reference to server around
  this.net = server;

  // capture the port from the server so we can pass it to xpcshell
  this.port = server.address().port;
  this._nextId = 1;

  debug('listen', this.port);

  var handleResponse = this.handleResponse.bind(this);

  // ack listeners.
  this._ack = new EventEmitter();

  // wait until we are ready then activate listeners
  server.once('connection', function(socket) {
    debug('connected');
    this.client = socket;
    this.client.on('data', handleResponse);
    this.ready = true;


    // so consumers will know whats going on
    this.emit('ready');

    // when the socket closes we are done
    socket.once('close', function() {
      // reset state!
      socket.removeListener('data', handleResponse);
      // cleanup and emit close
      this._reset();
      // life is over let them know it
      this.emit('close');
    }.bind(this));
  }.bind(this));
}

Server.prototype = {
  __proto__: EventEmitter.prototype,

  /**
   * Connected client (there may only be one)
   * @type Socket
   */
  client: null,

  /**
   * Handles a response from the client.
   *
   * @param {Buffer} data from socket.
   */
  handleResponse: function(data) {
    var parsed = wire.parse(data);
    debug('recv', parsed);
    this._ack.emit(parsed[0], null, parsed[1]);
  },

  /**
   * When ready is false all operations will fail horribly.
   * @type Boolean
   */
  ready: false,

  /**
   * Send a request to the xpcshell process.
   *
   *
   * @param {Object} object content of request.
   * @param {Function} callback [Error err, Object response].
   */
  request: function(object, callback) {
    var id = this._nextId++;
    debug('request', object);
    this.client.write(wire.stringify([id, object]));
    this._ack.once(id, callback);
  },

  /**
   * Cleanup internal state of client and readiness.
   * @private
   */
  _reset: function() {
    this.client = null;
    this.ready = false;
  },

  /**
   * Close the connection to the server.
   */
  close: function() {
    this.net.close();
  }
};

/**
 * Creates a server instance.
 *
 * @param {Function} callback [Error err, Server server].
 */
function create(callback) {
  var server = net.createServer();
  server.listen(function(err) {
    callback(err, new Server(server));
  });
}

module.exports.create = create;
module.exports.Server = Server;
