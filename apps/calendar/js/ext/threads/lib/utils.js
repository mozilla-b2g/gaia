'use strict';

/**
 * Mini debugger
 * @type {Function}
 */

var debug = 0 ? console.log.bind(console, '[utils]') : function() {};

exports.uuid = function (){
  var timestamp = Date.now();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    function onEachCharacter(c) {
      var r = (timestamp + Math.random() * 16) % 16 | 0;
      timestamp = Math.floor(timestamp / 16);
      return (c == 'x' ? r : (r&0x7|0x8)).toString(16);
    }
  );
};

exports.typesMatch = function (args, types) {
  for (var i = 0, l = args.length; i < l; i++) {
    if (typeof args[i] !== types[i]) return false;
  }

  return true;
};

exports.deferred = function () {
  var deferred = {};
  deferred.promise = new Promise(function(resolve, reject) {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
};

exports.query = function(string) {
  var result = {};

  string
    .replace('?', '')
    .split('&')
    .forEach(function(param) {
      var parts = param.split('=');
      result[parts[0]] = parts[1];
    });

  return result;
};

exports.env = function() {
  return {
    'Window': 'window',
    'SharedWorkerGlobalScope': 'sharedworker',
    'DedicatedWorkerGlobalScope': 'worker',
    'ServiceWorkerGlobalScope': 'serviceworker'
  }[self.constructor.name] || 'unknown';
};

exports.message = {
  factory: function(sender) {
    return function Message(type, options) {
      options = options || {};
      return {
        type: type,
        id: exports.uuid(),
        sender: sender,
        recipient: options.recipient || '*',
        data: options.data
      };
    };
  },

  handler: function(uuid, types) {
    return function(e) {
      var message = e.data;
      var recipient = message.recipient;
      var type = message.type;
      var authorized = recipient === uuid || recipient === '*';
      if (!authorized) return;
      if (!~types.indexOf(type)) return;
      debug('onmessage', message);
      if (this['on' + type]) this['on' + type](message.data, e);
    };
  }
};

/**
 * Message
 */

exports.Messages = Messages;

function Messages(context, id, types) {
  this.context = context;
  this.id = id;
  this.types = types || [];
  this.history = new Array(10);
  this.handle = this.handle.bind(this);
}

Messages.prototype.handle = function(e) {
  var message = e.data;
  if (!this.handles(message)) return;
  if (!this.isRecipient(message)) return;
  if (this.hasRead(message)) return;
  this.context['on' + message.type](message.data, e);
  this.read(message);
};

Messages.prototype.handles = function(message) {
  return !!~this.types.indexOf(message.type);
};

Messages.prototype.isRecipient = function(message) {
  var recipient = message.recipient;
  return recipient === this.id || recipient === '*';
};

Messages.prototype.read = function(message) {
  this.history.push(message.id);
  this.history.shift();
};

Messages.prototype.hasRead = function(message) {
  return !!~this.history.indexOf(message.id);
};

Messages.prototype.create = function (type, options) {
  options = options || {};
  return {
    type: type,
    id: exports.uuid(),
    sender: this.id,
    recipient: options.recipient || '*',
    data: options.data
  };
};
