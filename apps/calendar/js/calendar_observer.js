define(function(require, exports, module) {
'use strict';

var EventEmitter2 = require('ext/eventemitter2');
var debug = require('debug')('calendar_observer');
var forEach = require('object').forEach;
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
  this.calendarStore.all().then(calendars => {
    forEach(calendars, this._cacheCalendar);
  });
};

observer._cacheCalendar = function(id, calendar) {
  debug('Will cache new calendar', calendar);
  return this.calendarStore.providerFor(calendar).then(provider => {
    var capabilities = provider.calendarCapabilities(calendar);
    this.calendarList[id] = {
      calendar: calendar,
      capabilities: capabilities
    };

    this.emit('change', this.calendarList);
  });
};

observer._purgeCalendar = function(id) {
  debug('Will purge calendar', id);
  delete this.calendarList[id];
  this.emit('change', this.calendarList);
};

observer.on('newListener',  (event, listener) => {
  if (event !== 'change') {
    // What do you want from us then?!
    return;
  }

  debug('New change listener!');
  nextTick(() => {
    var calendars = observer.calendarList;
    if (calendars && Object.keys(calendars).length) {
      listener(calendars);
    }
  });
});

});
