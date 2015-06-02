(function(module, ns) {

  try {
    if (!window.navigator.mozTCPSocket) {
      return;
    }
  } catch(e) {
    return;
  }

  var TCPSocket = navigator.mozTCPSocket;

  var Responder = ns.require('responder');
  var ON_REGEX = /^on/;

 /**
   * Horrible hack to work around
   * missing stuff in TCPSocket & add
   * node compatible api.
   */
  function SocketWrapper(host, port, options) {
    var events = new Responder();
    var eventMethods = [
      'on',
      'addEventListener',
      'removeEventListener',
      'once',
      'emit'
    ];

    var rawSocket = TCPSocket.open(host, port, options);

    var eventList = [
      'onopen',
      'ondrain',
      'ondata',
      'onerror',
      'onclose'
    ];

    eventList.forEach(function(method) {
      rawSocket[method] = function(method, data) {
        var emitData;
        if ('data' in data) {
          emitData = data.data;
        } else {
          emitData = data;
        }
        events.emit(method, emitData);
      }.bind(socket, method.substr(2));
    });

    var socket = Object.create(rawSocket);

    eventMethods.forEach(function(method) {
      socket[method] = events[method].bind(events);
    });

    return socket;
  }

  var Abstract, CommandStream, Responder;

  Abstract = ns.require('drivers/abstract');
  CommandStream = ns.require('command-stream');

  /** TCP **/
  Tcp.Socket = SocketWrapper;

  /**
   * Connects to gecko marionette server using mozTCP api.
   *
   *
   *     // default options are fine for b2g-desktop
   *     // or a device device /w port forwarding.
   *     var tcp = new Marionette.Drivers.MozTcp();
   *
   *     tcp.connect(function() {
   *       // ready to use with client
   *     });
   *
   *
   * @class Marionette.Drivers.MozTcp
   * @extends Marionette.Drivers.Abstract
   * @constructor
   * @param {Object} options connection options.
   *   @param {String} [options.host="127.0.0.1"] ip/host.
   *   @param {Numeric} [options.port="2828"] marionette server port.
   */
  function Tcp(options) {
    if (typeof(options)) {
      options = {};
    }
    Abstract.call(this, options);


    this.connectionId = 0;
    this.host = options.host || '127.0.0.1';
    this.port = options.port || 2828;
  }

  Tcp.prototype = Object.create(Abstract.prototype);

  /**
   * Sends a command to the server.
   *
   * @param {Object} cmd remote marionette command.
   */
  Tcp.prototype._sendCommand = function _sendCommand(cmd) {
    this.client.send(cmd);
  };

  /**
   * Opens TCP socket for marionette client.
   */
  Tcp.prototype._connect = function connect() {
    var client, self = this;

    this.socket = new Tcp.Socket(this.host, this.port);
    client = this.client = new CommandStream(this.socket);
    this.client.on('command', this._onClientCommand.bind(this));
  };

  /**
   * Receives command from server.
   *
   * @param {Object} data response from marionette server.
   */
  Tcp.prototype._onClientCommand = function(data) {
    this._onDeviceResponse({
      id: this.connectionId,
      response: data
    });
  };

  /**
   * Closes connection to marionette.
   */
  Tcp.prototype._close = function close() {
    if (this.socket && this.socket.close) {
      this.socket.close();
    }
  };

  /** export */
  module.exports = exports = Tcp;

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('drivers/moz-tcp'), Marionette] :
    [module, require('../../lib/marionette/marionette')]
));
