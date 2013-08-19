var ws = require('websocket.io'),
    fs = require('fs'),
    fsPath = require('path'),
    Responder = require(__dirname + '/../test-agent/responder').TestAgent.Responder,
    vm = require('vm');

function Server() {
  this.implementation = ws;
  this.socket = null;

  Responder.call(this);
}

Server.prototype = Object.create(Responder.prototype);
Server.prototype._createSandbox = function _createSandbox(file) {
  return {
    server: this,
    process: { argv: process.argv },
    console: console,
    TestAgent: require(__dirname + '/index'),
    require: require,
    __file: file,
    __dirname: fsPath.dirname(file)
  };
};

/**
 * Enhances server with functionality from class or function.
 *
 *    Enhancement = function(options){}
 *    Enhancement.prototype.enhance = function enhance(server){
 *      //do stuff
 *    }
 *
 *    //second argument passed to constructor
 *    server.use(Enhancement, {isBlue: true});
 *
 *
 * @param {Object} enhancement
 * @param {Object} options
 * @chainable
 */
Server.prototype.use = function use(enhancement, options) {
  new enhancement(options).enhance(this);

  return this;
};

/**
 * Exposes a file to the server via a VM.
 *
 * @param {String} file
 * @param {Function} callback
 */
Server.prototype.expose = function expose(file, callback) {
  var sandbox = this._createSandbox(file);
  fs.readFile(file, 'utf8', function(err, code) {
    if (err) {
      throw err;
    }
    vm.runInNewContext(code, sandbox, file);
    if (callback) {
      callback();
    }
  });
};

Server.prototype._delegate = function delegate() {
  var args = Array.prototype.slice.call(arguments),
      func = args.shift();

  var imp = this.implementation;
  return imp[func].apply(imp, args);
};

/**
 * Delegates to .implementation's attach method
 * and saves result to .socket.
 *
 * @return {Object} result of this.implementation.attach.
 */
Server.prototype.attach = function attach() {
  var args = Array.prototype.slice.call(arguments);
  args.unshift('attach');

  return this.socket = this._delegate.apply(this, args);
};

/**
 * Delegates to .implementation's attach method
 * and saves result to .listen.
 *
 * @return {Object} result of this.implementation.listen.
 */
Server.prototype.listen = function listen() {
  var args = Array.prototype.slice.call(arguments);
  args.unshift('listen');

  return this.socket = this._delegate.apply(this, args);
};


module.exports = exports = Server;

