define(function(require, exports) {
'use strict';

var co = require('ext/co');
var core = require('core');
var nextTick = require('common/next_tick');
var object = require('common/object');

exports.sync = function(account, calendar) {
  var calendarStore = core.storeFactory.get('Calendar');
  return calendarStore.sync(account, calendar);
};

/**
 * Fetch all the calendars from database and emits a new event every time the
 * values changes.
 *
 * @returns {ClientStream}
 */
exports.observe = function(stream) {
  var calendarStore = core.storeFactory.get('Calendar');

  var getAllAndWrite = co.wrap(function *() {
    // calendarStore.all() returns an object! we convert into an array since
    // that is easier to render/manipulate
    var calendars = yield calendarStore.all();
    var data = yield object.map(calendars, co.wrap(function *(id, calendar) {
      var provider = yield calendarStore.providerFor(calendar);
      var caps = provider.calendarCapabilities(calendar);
      return { calendar: calendar, capabilities: caps };
    }));
    stream.write(data);
  });

  calendarStore.on('add', getAllAndWrite);
  calendarStore.on('remove', getAllAndWrite);
  calendarStore.on('update', getAllAndWrite);

  stream.cancel = function() {
    calendarStore.off('add', getAllAndWrite);
    calendarStore.off('remove', getAllAndWrite);
    calendarStore.off('update', getAllAndWrite);
  };

  nextTick(getAllAndWrite);
};

exports.update = function(calendar) {
  var calendarStore = core.storeFactory.get('Calendar');
  return calendarStore.persist(calendar);
};

});
