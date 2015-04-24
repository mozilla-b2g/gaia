
'use strict';

/**
 * Dependencies
 */

var emitter = require('./emitter');
var utils = require('./utils');

/**
 * Exports
 */

module.exports = ChildThread;

/**
 * Mini debugger
 * @type {Function}
 */

var debug = 0 ? console.log.bind(console, '[ChildThread]') : function() {};

/**
 * Error messages
 * @type {Object}
 */

const ERRORS = {
  1: 'iframes can\'t be spawned from workers',
  2: 'requst to get service timed out'
};

/**
 * Extends `Emitter`
 */

ChildThread.prototype = Object.create(emitter.prototype);

function ChildThread(params) {
  if (!(this instanceof ChildThread)) return new ChildThread(params);
  this.id = utils.uuid();
  this.src = params.src;
  this.type = params.type;
  this.parentNode = params.parentNode;
  this.services = {};

  this.message = new utils.Messages(this, this.id, ['broadcast']);
  this.on('serviceready', this.onserviceready.bind(this));
  this.process = this.createProcess();
  this.listen();
  debug('initialized', this.type);
}

ChildThread.prototype.createProcess = function() {
  debug('create process');
  switch(this.type) {
    case 'worker':
      return new Worker(this.src + '?pid=' + this.id);
    case 'sharedworker':
      return new SharedWorker(this.src + '?pid=' + this.id);
    case 'window':
      if (utils.env() !== 'window') throw new Error(ERRORS[1]);
      var iframe = document.createElement('iframe');
      (this.parentNode || document.body).appendChild(iframe);
      iframe.name = this.id;
      iframe.src = this.src;
      return iframe;
  }
};

ChildThread.prototype.getService = function(name, options) {
  debug('get service', name, options);

  var wait = (options && options.wait) || 4000;
  var service = this.services[name];
  if (service) return Promise.resolve(service);

  var deferred = utils.deferred();
  this.on('serviceready', function fn(service) {
    if (service.name !== name) return;
    debug('serviceready', service.name);
    this.off('serviceready', fn);
    clearTimeout(timeout);
    deferred.resolve(service);
  });

  // Request will timeout when no service of
  // this name becomes ready within the given wait
  var timeout = setTimeout(function() {
    deferred.reject(new Error(ERRORS[2]));
  }, wait);
  return deferred.promise;
};

ChildThread.prototype.postMessage = function(message) {
  switch(this.type) {
    case 'worker': this.process.postMessage(message); break;
    case 'sharedworker': this.process.port.postMessage(message); break;
    case 'window': this.process.contentWindow.postMessage(message, '*'); break;
  }
};

ChildThread.prototype.listen = function() {
  debug('listen (%s)', this.type);
  switch(this.type) {
    case 'worker':
      this.process.addEventListener('message', this.message.handle);
      break;
    case 'sharedworker':
      this.process.port.start();
      this.process.port.addEventListener('message', this.message.handle);
      break;
    case 'window':
      addEventListener('message', this.message.handle);
  }
};

ChildThread.prototype.unlisten = function() {
  switch(this.type) {
    case 'worker':
      this.process.removeEventListener('message', this.message.handle);
      break;
    case 'sharedworker':
      this.process.port.close();
      this.process.port.removeEventListener('message', this.message.handle);
      break;
    case 'window':
      removeEventListener('message', this.message.handle);
  }
};

ChildThread.prototype.onbroadcast = function(broadcast) {
  debug('on broadcast', broadcast);
  this.emit(broadcast.type, broadcast.data);
};

ChildThread.prototype.onserviceready = function(service) {
  debug('on service ready', service);
  this.services[service.name] = service;
};

ChildThread.prototype.destroy = function() {
  this.unlisten();
  this.destroyProcess();
};

ChildThread.prototype.destroyProcess = function() {
  debug('destroy thread (%s)');
  switch(this.type) {
    case 'worker': this.process.terminate(); break;
    case 'sharedworker': this.process.port.close(); break;
    case 'window': this.process.remove(); break;
  }
};
