
'use strict';

/**
 * Dependencies
 */

var ChildThread = require('./child-thread');
var utils = require('./utils');

/**
 * Exports
 */

module.exports = Manager;

/**
 * Locals
 */

var debug = 0 ? console.log.bind(console, '[Manager]') : function() {};
var channel = new BroadcastChannel('threadsmanager');

function Manager(descriptors) {
  if (!(this instanceof Manager)) return new Manager(descriptors);
  new ManagerInternal(descriptors);
}

function ManagerInternal(descriptors) {
  this.id = 'threadsmanager';
  this.readMessages = new Array(10);
  this.processes = { id: {}, src: {} };
  this.pending = { connects: {} };
  this.activeServices = {};
  this.registry = {};

  this.messages = new utils.Messages(this, this.id, ['connect']);
  channel.addEventListener('message', this.messages.handle);

  this.register(descriptors);
  debug('intialized');
}

ManagerInternal.prototype.register = function(descriptors) {
  debug('register', descriptors);
  for (var name in descriptors) {
    descriptors[name].name = name;
    this.registry[name] = descriptors[name];
  }
};

ManagerInternal.prototype.onbroadcast = function(broadcast) {
  debug('on broadcast', broadcast);
  this.emit(broadcast.type, broadcast.data);
};

/**
 * Run when a client attempts to connect.
 *
 * If a contract is found in the service
 * descriptor we pass it to the service
 * along with the connect request.
 *
 * @param  {Object} data {service,client,contract}
 * @private
 */
ManagerInternal.prototype.onconnect = function(data) {
  debug('on connect', data);
  var descriptor = this.registry[data.service];

  if (!descriptor) return debug('"%s" not managed here', data.service);

  var contract = descriptor.contract;
  var client = data.client;

  this.getThread(descriptor)
    .getService(descriptor.name)
    .then(function(service) {
      return this.connect(service, client, contract);
    }.bind(this))
    .catch(function(e) { throw new Error(e); });
};

ManagerInternal.prototype.connect = function(service, client, contract) {
  debug('connect', service, client, contract);
  channel.postMessage(this.messages.create('connect', {
    recipient: service.id,
    data: {
      client: client,
      service: service.name,
      contract: contract
    }
  }));
};

ManagerInternal.prototype.onclientdisconnected = function(msg) {
  debug('on client disconnected', msg);
};

ManagerInternal.prototype.onclientconnected = function(msg) {
  debug('on client connected', msg);
};

ManagerInternal.prototype.getThread = function(descriptor) {
  debug('get thread', descriptor, this.processes);
  var process = this.processes.src[descriptor.src];
  return process || this.createThread(descriptor);
};

ManagerInternal.prototype.createThread = function(descriptor) {
  debug('create thread', descriptor);
  var process = new ChildThread(descriptor);
  this.processes.src[process.src] = process;
  this.processes.id[process.id] = process;
  return process;
};
