define(function(require, exports, module) {
'use strict';

var EventEmitter2 = require('ext/eventemitter2');
var nextTick = require('next_tick');

var observer = module.exports = new EventEmitter2();

// TODO: convert these dependencies into static modules to avoid ugly injection
// injected later to avoid circular dependencies
observer.settingsStore = null;

observer.setting = null;
observer.pending = null;

observer.init = function() {
  this.setting = {};
  this.pending = {};
};

observer.onNewListener = function(event, listener) {
  // Someone wants to observe a new setting.
  if (event in this.setting) {
    // We're already subscribed to the store.
    // Only call this listener because past listeners will
    // already have received the current value.
    return nextTick(() => listener(this.setting[event]));
  }

  if (event in this.pending) {
    // We're already subscribed to the store, but
    // we're also in the process of getting the initial value.
    // Return a promise that will resolve when we have the first value.
    return this.pending[event];
  }

  var store = this.settingsStore;

  // Put a promise in pending that represents when we
  // have our first value for a given setting.
  this.pending[event] = store.getValue(event).then(value => {
    this.setting[event] = value;
    this.emitValueFor(event);
    delete this.pending[event];
  });

  // Listen for updates to this setting.
  var eventType = event + 'Change';
  store.on(eventType, newValue => {
    this.setting[event] = newValue;
    this.emitValueFor(event);
  });
};
observer.on('newListener', observer.onNewListener.bind(observer));

observer.emitValueFor = function(key) {
  this.emit(key, this.setting[key]);
};

});
