var EventEmitter = require('events').EventEmitter,
    debug = require('debug')('marionette:command-stream');

/**
 * Command stream accepts a socket or any event
 * emitter that will emit data events
 *
 * @class
 * @param {EventEmitter} socket socket instance.
 * @constructor
 */
function CommandStream(socket) {
  this.buffer = '';
  this.inCommand = false;
  this.commandLength = 0;
  this.socket = socket;

  EventEmitter.apply(this);

  socket.on('data', this.add.bind(this));
  socket.on('error', function(){
    console.log(arguments);
  });
}

var proto = CommandStream.prototype = Object.create(EventEmitter.prototype);

/**
 * Length prefix
 *
 * @type String
 */
proto.prefix = ':';

/**
 * name of the event this class
 * will emit when a response to a
 * command is received.
 *
 * @type String
 */
proto.commandEvent = 'command';

/**
 * Parses command into a string to
 * be sent over a tcp socket to marionette.
 *
 *
 * @this
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
 * @this
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
 * @this
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
 * @this
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
 * @this
 * @param {Object} data marionette command.
 */
proto.send = function send(data) {
  debug('writing ', data, 'to socket');
  this.socket.write(this.stringify(data), 'utf8');
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
