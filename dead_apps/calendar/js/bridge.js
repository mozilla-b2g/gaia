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
    var data = yield object.map(
      calendars,
      co.wrap(function *(id, calendar) {
        var caps;
        try {
          var provider = yield calendarStore.providerFor(calendar);
          caps = provider.calendarCapabilities(calendar);
        } catch (error) {
          console.error(error);
          return false;
        }

        return { calendar: calendar, capabilities: caps };
      })
    );

    stream.write(data.filter(element => !!element));
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

exports.getAccount = function(id) {
  var accountStore = core.storeFactory.get('Account');
  return accountStore.get(id);
};

exports.deleteAccount = function(id) {
  var accountStore = core.storeFactory.get('Account');
  return accountStore.remove(id);
};

/**
 * Sends a request to create an account.
 *
 * @param {Calendar.Models.Account} model account details.
 */
exports.createAccount = co.wrap(function *(model) {
  var storeFactory = core.storeFactory;
  var accountStore = storeFactory.get('Account');
  var calendarStore = storeFactory.get('Calendar');

  // begin by persisting the account
  var [, result] = yield accountStore.verifyAndPersist(model);

  // finally sync the account so when
  // we exit the request the user actually
  // has some calendars. This should not take
  // too long (compared to event sync).
  yield accountStore.sync(result);

  // begin sync of calendars
  var calendars = yield calendarStore.remotesByAccount(result._id);

  // note we don't wait for any of this to complete
  // we just begin the sync and let the event handlers
  // on the sync controller do the work.
  for (var key in calendars) {
    core.syncController.calendar(
      result,
      calendars[key]
    );
  }

  return result;
});

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

exports.observeDay = function(date) {
  var stream = new FakeClientStream();
  var emit = stream.write.bind(stream);

  stream.cancel = function() {
    dayObserver.off(date, emit);
    stream._cancel();
  };

  // FIXME: nextTick only really needed because dayObserver dispatches the
  // first callback synchronously, easier to solve it here than to change
  // dayObserver; we can remove this nextTick call after moving to threads.js
  // (since it will always be async)
  nextTick(() => dayObserver.on(date, emit));

  return stream;
};


/**
 * Returns a list of available presets filtered by
 * the currently used presets in the database.
 * (can't create multiple local calendars)
 */
exports.availablePresets = function(presetList) {
  var accountStore = core.storeFactory.get('Account');
  return accountStore.availablePresets(presetList);
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
