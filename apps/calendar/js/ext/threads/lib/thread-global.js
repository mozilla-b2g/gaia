
/**
 * Dependencies
 */

var emitter = require('./emitter');
var utils = require('./utils');

/**
 * Locals
 */

var debug = 0 ? console.log.bind(console, '[ThreadGlobal]') : function() {};

const ERRORS = {
  1: 'Unknown connection type'
};

/**
 * Extend `Emitter`
 */

ThreadGlobal.prototype = Object.create(emitter.prototype);

function ThreadGlobal() {
  this.id = getThreadId();
  this.type = utils.env();
  this.manager = new BroadcastChannel('threadsmanager');
  this.ports = [];
  this.connections = {
    inbound: 0,
    outbound: 0
  };

  this.messages = new utils.Messages(this, this.id);
  this.onmessage = this.onmessage.bind(this);
  this.listen();

  debug('initialized', this.type);
}

ThreadGlobal.prototype.listen = function() {
  debug('listen');
  switch (this.type) {
    case 'sharedworker':
      addEventListener('connect', function(e) {
        debug('port connect');
        var port = e.ports[0];
        this.ports.push(port);
        port.onmessage = this.onmessage;
        port.start();
      }.bind(this));
    break;
    case 'worker':
    case 'window':
      addEventListener('message', this.onmessage);
  }
};

ThreadGlobal.prototype.onmessage = function(e) {
  debug('on message', e);
  this.emit('message', e);
};

ThreadGlobal.prototype.broadcast = function(type, data) {
  this.postMessage(this.messages.create('broadcast', {
    recipient: this.id, // ChildThread ID
    data: {
      type: type,
      data: data
    }
  }));
};

/**
 * Message the thread parent
 * (instanceof ChildThread) to
 * inform them of something that
 * has happened inside the thread.
 *
 * The Manager could have created
 * the `ChildThread` or it could
 * have been created manually by
 * the user.
 *
 * @param  {Message} message
 * @public
 */
ThreadGlobal.prototype.postMessage = function(message) {
  debug('postMessage (%s)', this.type, message);
  switch (this.type) {
    case 'worker':
      postMessage(message); break;
    case 'sharedworker':
      this.ports.map(function(port) { return port.postMessage(message); });
      break;
    case 'window':
      window.parent.postMessage(message, '*'); break;
  }
};

ThreadGlobal.prototype.connection = function(type) {
  if (!(type in this.connections)) throw Error(ERRORS[1]);
  this.connections[type]++;
  debug('connection', type, this.connections[type]);
  this.check();
};

ThreadGlobal.prototype.disconnection = function(type) {
  if (!(type in this.connections)) throw Error(ERRORS[1]);
  this.connections[type]--;
  debug('disconnection', type, this.connections[type]);
  this.check();
};

ThreadGlobal.prototype.check = function() {
  if (this.redundant()) {
    debug('redundant');
    this.broadcast('redundant');
  }
};

ThreadGlobal.prototype.isRoot = function() {
  return this.id === 'root';
};

ThreadGlobal.prototype.redundant = function() {
  return !this.isRoot() && this.detached();
};

ThreadGlobal.prototype.detached = function() {
  return !this.connections.inbound;
};

/**
 * Utils
 */

function getThreadId() {
  return utils.query(location.search).pid
    || (typeof window != 'undefined' && window.name)
    || 'root';
}

/**
 * Exports
 */

module.exports = new ThreadGlobal();
