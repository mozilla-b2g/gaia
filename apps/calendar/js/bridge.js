define(function(require, exports) {
'use strict';

var EventEmitter2 = require('ext/eventemitter2');
var co = require('ext/co');
var core = require('core');
var dayObserver = require('day_observer');
var nextTick = require('common/next_tick');
var object = require('common/object');

/**
 * Fetch all the data needed to display the busytime information on the event
 * views based on the busytimeId
 */
exports.fetchRecord = function(busytimeId) {
  return co(function *() {
    var record = yield dayObserver.findAssociated(busytimeId);
    var eventStore = core.storeFactory.get('Event');
    var owners = yield eventStore.ownersOf(record.event);
    var provider = core.providerFactory.get(owners.account.providerType);
    var capabilities = yield provider.eventCapabilities(record.event);

    record.calendar = owners.calendar;
    record.account = owners.account;
    record.capabilities = capabilities;

    return record;
  });
};

/**
 * Fetch all the calendars from database and emits a new event every time the
 * values changes.
 *
 * @returns {ClientStream}
 */
exports.observeCalendars = function() {
  // TODO: replace with real threads.client.stream when we get db into worker
  var stream = new FakeClientStream();
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
    stream._cancel();
  };

  nextTick(getAllAndWrite);

  return stream;
};

exports.updateCalendar = function(calendar) {
  var calendarStore = core.storeFactory.get('Calendar');
  return calendarStore.persist(calendar);
};

exports.createEvent = function(event) {
  return persistEvent(event, 'create', 'canCreate');
};

exports.updateEvent = function(event) {
  return persistEvent(event, 'update', 'canUpdate');
};

exports.deleteEvent = function(event) {
  return persistEvent(event, 'delete', 'canDelete');
};

var persistEvent = co.wrap(function *(event, action, capability) {
  event = event.data || event;
  try {
    var eventStore = core.storeFactory.get('Event');
    var provider = yield eventStore.providerFor(event);
    var caps = yield provider.eventCapabilities(event);
    if (!caps[capability]) {
      return Promise.reject(new Error(`Can't ${action} event`));
    }
    return provider[action + 'Event'](event);
  } catch(err) {
    console.error(
      `${action} Error for event "${event._id}" ` +
      `on calendar "${event.calendarId}"`
    );
    console.error(err);
    return Promise.reject(err);
  }
});

exports.getSetting = function(id) {
  var settingStore = core.storeFactory.get('Setting');
  return settingStore.getValue(id);
};

exports.setSetting = function(id, value) {
  var settingStore = core.storeFactory.get('Setting');
  return settingStore.set(id, value);
};

exports.observeSetting = function(id) {
  var stream = new FakeClientStream();
  var settingStore = core.storeFactory.get('Setting');

  var writeOnChange = function(value) {
    stream.write(value);
  };

  settingStore.on(`${id}Change`, writeOnChange);

  stream.cancel = function() {
    settingStore.off(`${id}Change`, writeOnChange);
    stream._cancel();
  };

  exports.getSetting(id).then(writeOnChange);

  return stream;
};

exports.observeAccounts = function() {
  var stream = new FakeClientStream();
  var accountStore = core.storeFactory.get('Account');

  var getAllAndWrite = co.wrap(function *() {
    try {
      var accounts = yield accountStore.all();
      var data = object.map(accounts, (id, account) => {
        return {
          account: account,
          provider: core.providerFactory.get(account.providerType)
        };
      });
      stream.write(data);
    } catch(err) {
      console.error(`Error fetching accounts: ${err.message}`);
    }
  });

  accountStore.on('add', getAllAndWrite);
  accountStore.on('remove', getAllAndWrite);
  accountStore.on('update', getAllAndWrite);

  stream.cancel = function() {
    accountStore.off('add', getAllAndWrite);
    accountStore.off('remove', getAllAndWrite);
    accountStore.off('update', getAllAndWrite);
    stream._cancel();
  };

  nextTick(getAllAndWrite);

  return stream;
};

/**
 * FakeClientStream is used as a temporary solution while we move all the db
 * calls into the worker. In the end all the methods inside this file will be
 * transfered into the "backend/calendar_service.js" and we will simply call
 * the `threads.client('calendar')` API
 */
function FakeClientStream() {
  this._emitter = new EventEmitter2();
  this._enabled = true;
}

FakeClientStream.prototype.write = function(data) {
  this._enabled && this._emitter.emit('data', data);
};

FakeClientStream.prototype.listen = function(callback) {
  this._enabled && this._emitter.on('data', callback);
};

FakeClientStream.prototype.unlisten = function(callback) {
  this._enabled && this._emitter.off('data', callback);
};

FakeClientStream.prototype._cancel = function() {
  this._emitter.removeAllListeners();
  this._enabled = false;
};

});
