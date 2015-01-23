define(function(require, exports, module) {
'use strict';

var EventEmitter2 = require('ext/eventemitter2');
var nextTick = require('next_tick');

var observer = module.exports = new EventEmitter2();

// TODO: convert these dependencies into static modules to avoid ugly injection
// injected later to avoid circular dependencies
observer.calendarStore = null;

observer.calendarList = null;

observer.init = function() {
  this.calendarList = {};
  this._cacheCalendar = this._cacheCalendar.bind(this);
  this.calendarStore.on('add', this._cacheCalendar);
  this.calendarStore.on('update', this._cacheCalendar);
  this._purgeCalendar = this._purgeCalendar.bind(this);
  this.calendarStore.on('remove', this._purgeCalendar);
};

observer._cacheCalendar = function(id, calendar) {
  return this.calendarStore.providerFor(calendar)
  .then(provider => {
    var capabilities = provider.calendarCapabilities(calendar);
    this.calendarList[id] = {
      calendar: calendar,
      capabilities: capabilities
    };

    this.emit('change', this.calendarList);
  });
};

observer._purgeCalendar = function(id) {
  delete this.calendarList[id];
  this.emit('change', this.calendarList);
};

observer.on('newListener',  (event, listener) => {
  if (event !== 'change') {
    // What do you want from us then?!
    return;
  }

  nextTick(() => listener(observer.calendarList));
});

});
