(function(module, ns) {

  var debug = function() {},
      Responder;

  var isNode = typeof(window) === 'undefined';
  var isXpc = !isNode && (typeof(window.xpcModule) !== 'undefined');

  if (isNode) {
    debug = require('debug')('marionette:command-stream');
    Responder = require('test-agent/lib/test-agent/responder');
  } else {
    Responder = TestAgent.Responder;
  }

  if (isXpc) {
    debug = window.xpcModule.require('debug')('marionette:command-stream');
  }

  /**
   * Command stream accepts a socket or any event
   * emitter that will emit data events
   *
   * @class Marionette.CommandStream
   * @param {EventEmitter} socket socket instance.
   * @constructor
   */
  function CommandStream(socket) {
    this.buffer = '';
    this.inCommand = false;
    this.commandLength = 0;
    this.socket = socket;

    Responder.apply(this);

    socket.on('data', this.add.bind(this));
    socket.on('error', function() {
      console.log(arguments);
    });
  }

  var proto = CommandStream.prototype = Object.create(
    Responder.prototype
  );

  /**
   * Length prefix
   *
   * @property prefix
   * @type String
   */
  proto.prefix = ':';

  /**
   * name of the event this class
   * will emit when a response to a
   * command is received.
   *
   * @property commandEvent
   * @type String
   */
  proto.commandEvent = 'command';

  /**
   * Parses command into a string to
   * be sent over a tcp socket to marionette.
   *
   *
   * @method stringify
   * @param {Object} command marionette command.
   * @return {String} command as a string.
   */
  proto.stringify = function stringify(command) {
    var string;
    if (typeof(command) === 'string') {
      string = command;
    } else {
      string = JSON.stringify(command);
    }

    return String(string.length) + this.prefix + string;
  };

  /**
   * Accepts raw string command parses it and
   * emits a commandEvent.
   *
   * @private
   * @method _handleCommand
   * @param {String} string raw response from marionette.
   */
  proto._handleCommand = function _handleCommand(string) {
    debug('got raw bytes ', string);
    var data = JSON.parse(string);
    debug('sending event', data);
    this.emit(this.commandEvent, data);
  };


  /**
   * Checks if current buffer is ready to read.
   *
   * @private
   * @method _checkBuffer
   * @return {Boolean} true when in a command and buffer \
   *                   is ready to begin reading.
   */
  proto._checkBuffer = function _checkBuffer() {
    var lengthIndex;
    if (!this.inCommand) {
      lengthIndex = this.buffer.indexOf(this.prefix);
      if (lengthIndex !== -1) {
        this.commandLength = parseInt(this.buffer.slice(0, lengthIndex));
        this.buffer = this.buffer.slice(lengthIndex + 1);
        this.inCommand = true;
      }
    }

    return this.inCommand;
  };

  /**
   * Read current buffer.
   * Drain and emit all comands from the buffer.
   *
   * @method _readBuffer
   * @private
   * @return {Object} self.
   */
  proto._readBuffer = function _readBuffer() {
    var commandString;

    if (this._checkBuffer()) {
      if (this.buffer.length >= this.commandLength) {
        commandString = this.buffer.slice(0, this.commandLength);
        this._handleCommand(commandString);
        this.buffer = this.buffer.slice(this.commandLength);
        this.inCommand = false;

        this._readBuffer();
      }
    }
    return this;
  };

  /**
   * Writes a command to the socket.
   * Handles conversion and formatting of object.
   *
   * @method send
   * @param {Object} data marionette command.
   */
  proto.send = function send(data) {
    debug('writing ', data, 'to socket');
    if (this.socket.write) {
      //nodejs socket
      this.socket.write(this.stringify(data), 'utf8');
    } else {
      //moztcp socket
      this.socket.send(this.stringify(data));
    }
  };

  /**
   * Adds a chunk (string or buffer) to the
   * total buffer of this instance.
   *
   * @this
   * @param {String|Buffer} buffer buffer or string to add.
   */
  proto.add = function add(buffer) {
    var lengthIndex, command;

    this.buffer += buffer.toString();
    this._readBuffer();
  };

  module.exports = exports = CommandStream;

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('command-stream'), Marionette] :
    [module, require('./marionette')]
));
