'use strict';

/**
 * Dependencies
 */

var Messenger = require('./messenger');
var emitter = require('./emitter');
var utils = require('./utils');

/**
 * Exports
 */

module.exports = ChildThread;

/**
 * Mini debugger
 *
 * @type {Function}
 */

var debug = 0 ? console.log.bind(console, '[ChildThread]') : function() {};

/**
 * Extends `Emitter`
 */

ChildThread.prototype = Object.create(emitter.prototype);

/**
 * Wraps a reference to a 'thread'.
 *
 * Providing a means to send/recieve
 * messages to/from a 'thread'.
 *
 * Params:
 *
 *   - `src` {String}
 *   - `type` {String} ['window'|'worker'|'sharedworker']
 *   - `target` {HTMLIframeElement|Worker|SharedWorker}
 *   - `parentNode` {HTMLElement}
 *
 * @param {Object} params
 */

function ChildThread(params) {
  if (!(this instanceof ChildThread)) return new ChildThread(params);
  if (!knownType(params.type)) throw error(3, params.type);
  this.id = utils.uuid();
  this.src = params.src;
  this.type = params.type;
  this.parentNode = params.parentNode;
  this.target = params.target ||  this.createTarget();
  this.threadId = undefined;
  this.services = {};

  this.onmessage = this.onmessage.bind(this);
  this.messenger = new Messenger(this.id, '[ChildThread]')
    .handle('redundant', this.onredundant, this)
    .handle('serviceready', this.onserviceready, this);

  this.listen();
  this.ready = this.checkReady();
  debug('initialized', this.type);
}

/**
 * Prototype assigned to variable
 * to improve compression.
 *
 * @type {Object}
 */

var ChildThreadPrototype = ChildThread.prototype;

/**
 * Creates the actual target thread.
 *
 * @return {Worker|SharedWorker|HTMLIframeElement}
 */

ChildThreadPrototype.createTarget = function() {
  debug('create process');
  switch(this.type) {
    case 'worker': return new Worker(this.src);
    case 'sharedworker': return new SharedWorker(this.src);
    case 'window':
      if (utils.env() !== 'window') throw error(1);
      var iframe = document.createElement('iframe');
      (this.parentNode || document.body).appendChild(iframe);
      iframe.src = this.src;
      return iframe;
  }
};

/**
 * Attempts to get `Service` info from the target.
 *
 * @param  {String} name
 * @return {Object}
 */

ChildThreadPrototype.getService = function(name) {
  debug('get service when ready...', name);
  return this.ready.then(function() {
    return this._getService(name);
  }.bind(this));
};

/**
 * Returns the given service object,
 * or waits for a matching Service
 * to become ready.
 *
 * REVIEW: This logic could be bundled
 * inside `ThreadGlobal` and we could
 * instead send a 'getService' request
 * message to the thread when we don't
 * yet know about the asked `Service`.
 *
 * This would have to be done after 'ready'.
 *
 * @param  {String} name
 * @return {Promise}
 */

ChildThreadPrototype._getService = function(name) {
  debug('get service', name);
  var service = this.services[name];

  if (service) {
    debug('service already known');
    return Promise.resolve(service);
  }

  var deferred = utils.deferred();
  var self = this;

  this.on('serviceready', onServiceReady);

  function onServiceReady(service) {
    if (service.name !== name) return;
    debug('service ready', service.name);
    self.off('serviceready', onServiceReady);
    clearTimeout(timeout);
    deferred.resolve(service);
  }

  // Request will timeout when no service of
  // this name becomes ready within 4sec
  var timeout = setTimeout(function() {
    self.off('serviceready', onServiceReady);
    deferred.reject(error(2, name));
  }, 2000);

  return deferred.promise;
};

/**
 * Checks if the target's `ThreadGlobal` is 'ready'.
 *
 * We have a race of two approaches:
 *
 * 1. We attempt to ping the thread.
 * 2. We wait for the 'threadready' message.
 *
 * Approach 1. will occur when the thread is
 * already alive and kicking. Approach 2. will
 * occur when the thread is brand new and not
 * yet running.
 *
 * @return {Promise}
 */

ChildThreadPrototype.checkReady = function() {
  debug('check ready');
  var deferred = utils.deferred();
  var called = 0;
  var self = this;

  this.messenger.request(this, { type: 'ping' }).then(ready); // 1.
  this.messenger.handle('threadready', ready); // 2.

  function ready(thread) {
    if (called++) return;
    debug('thread ready', thread);
    self.messenger.unhandle('threadready');
    self.threadId = thread.id;
    self.services = thread.services;
    deferred.resolve();
  }

  return deferred.promise;
};

/**
 * Abstracted .postMessage() to send
 * a message directly to the target.
 *
 * @param  {Object} message
 * @private
 */

ChildThreadPrototype.postMessage = function(message) {
  debug('post message', message);
  switch(this.type) {
    case 'worker': this.target.postMessage(message); break;
    case 'sharedworker': this.target.port.postMessage(message); break;
    case 'window':
      if (!this.target.contentWindow) return;
      this.target.contentWindow.postMessage(message, '*');
  }
};

/**
 * Listen for messages that *may*
 * have come from the target thread.
 *
 * For iframe targets we can't listen
 * directly to the target, so we have
 * to listen on `window`. We depend
 * on `Messenger` to filter out any
 * stuff that not intended for us.
 *
 * @private
 */

ChildThreadPrototype.listen = function() {
  debug('listen (%s)', this.type);
  switch(this.type) {
    case 'worker':
      this.target.addEventListener('message', this.onmessage);
      break;
    case 'sharedworker':
      this.target.port.start();
      this.target.port.addEventListener('message', this.onmessage);
      break;
    case 'window':
      addEventListener('message', this.onmessage);
  }
};

/**
 * Remove target message listener.
 *
 * @private
 */

ChildThreadPrototype.unlisten = function() {
  switch(this.type) {
    case 'worker':
      this.target.removeEventListener('message', this.onmessage);
      break;
    case 'sharedworker':
      this.target.port.close();
      this.target.port.removeEventListener('message', this.onmessage);
      break;
    case 'window':
      removeEventListener('message', this.onmessage);
  }
};

/**
 * Parses raw message event through
 * `Messenger` and re-emits a public
 * 'message' event so that `Clients`
 * can listen for messages that may
 * be explicitly targeted at them.
 *
 * @param  {Event} e
 * @private
 */

ChildThreadPrototype.onmessage = function(e) {
  if (!this.fromTarget(e)) return;
  debug('on message', e.data.data);
  this.messenger.parse(e);
  this.emit('message', e);
};

/**
 * Check if message event comes from target.
 *
 * @param  {Event} e
 * @return {Boolean}
 */

ChildThreadPrototype.fromTarget = function(e) {
  return e.target === this.target
    || this.target.contentWindow === e.source
    || e.target === this.target.port;
};

/**
 * Whenever a `Sevice` becomes 'ready'
 * inside the target, a message will
 * be sent to us.
 *
 * We keep a list of known running `Services`.
 *
 * We emit the 'serviceready' event so that
 * the `.getService()` method knows when
 * to callback.
 *
 * TODO: Remove services from this list
 * if they are destroyed within the target
 * thread.
 *
 * @param  {Object} service
 */

ChildThreadPrototype.onserviceready = function(service) {
  debug('on service ready', service);
  this.services[service.name] = service;
  this.emit('serviceready', service);
};

/**
 * The target will send a 'redundant'
 * message to the outside world once
 * it's service have no more Clients.
 *
 * We emit this event so that a `Manager`
 * or whomever created the `ChildThread`
 * can destroy it.
 *
 * @private
 */

ChildThreadPrototype.onredundant = function() {
  debug('redundant');
  this.emit('redundant');
};

/**
 * Destroy the Thread.
 *
 * We unbind *all* listeners that may have
 * attached themselves to events emitted
 * from this object.
 *
 * @public
 */

ChildThreadPrototype.destroy = function() {
  this.unlisten();
  this.destroyTarget();
  this.off();
};

/**
 * Destroy the actual thread instance.
 *
 * @private
 */

ChildThreadPrototype.destroyTarget = function() {
  debug('destroy thread (%s)');

  switch(this.type) {
    case 'worker': this.target.terminate(); break;
    case 'sharedworker': this.target.port.close(); break;
    case 'window': this.target.remove(); break;
  }

  // If we don't clear the reference
  // the browser can't always cleanup.
  // Sometimes `SharedWorkers` don't die.
  delete this.target;
};

/**
 * Utils
 */

/**
 * Checks if given type is known.
 *
 * @param  {String} type
 * @return {Boolean}
 */

function knownType(type) {
  return !!~[
    'window',
    'worker',
    'sharedworker'
  ].indexOf(type);
}

/**
 * Handy `Error` factory.
 *
 * @param  {Number} id
 * @return {String}
 */

function error(id) {
  var args = [].slice.call(arguments, 1);
  return new Error({
    1: 'iframes can\'t be spawned from workers',
    2: 'Request to get service "' + args[0] + '" timed out',
    3: 'type "' + args[0] + '" not recognized, must be: ' +
      '\'window\', \'worker\' or \'sharedworker\''
  }[id]);
}
