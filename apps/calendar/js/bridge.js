define(function(require, exports) {
'use strict';

var AccountModel = require('models/account');
var CalendarModel = require('models/calendar');
var EventModel = require('models/event');
var client;
var thread;
var threads = require('ext/threads');

function stream(...args) {
  return exec('stream', args);
}

function method(...args) {
  return exec('method', args);
}

function exec(type, args) {
  setupClient();

  // serialize models/data as plain objects when possible
  args = args.map(a => {
    return a && typeof a === 'object' && 'toJSON' in a ? a.toJSON() : a;
  });

  var maybePromise = client[type].apply(client, args);

  // "on/off" don't return promises, "method" does
  if (maybePromise && maybePromise.catch) {
    return maybePromise.catch(err => {
      // weird hack to make sure custom errors are propagated correctly
      // (otherwise they would be coerced into plain strings)
      return Promise.reject(err && JSON.parse(err));
    });
  }

  // "stream" returns a ClientStream
  return maybePromise;
}

function setupClient() {
  if (client) {
    return;
  }

  thread = threads.create({
    src: '/js/backend/calendar_worker.js',
    type: 'worker'
  });

  thread.process.onerror = function(err) {
    console.error(
      'Bridge Worker Error:', err.message, '@', err.file, ':',
      err.line, err.stack
    );
    return false;
  };

  client = threads.client('calendar', { thread: thread });
}

exports.on = function(type, fn) {
  return exec('on', [type, fn]);
};

exports.off = function(type, fn) {
  return exec('off', [type, fn]);
};

/**
 * notify the backend about timeController updates
 */
exports.updateTime = function(data) {
  return method('time/update', data);
};

/**
 * Fetch all the data needed to display the busytime information on the event
 * views based on the busytimeId
 */
exports.fetchRecord = function(busytimeId) {
  return method('records/get', busytimeId).then(r => {
    r.event = new EventModel(r.event);
    r.calendar = new CalendarModel(r.calendar);
    r.account = new AccountModel(r.account);
    return r;
  });
};

/**
 * Fetch all the calendars from database and emits a new event every time the
 * values changes.
 *
 * @returns {ClientStream}
 */
exports.observeCalendars = function() {
  return stream('calendars/observe');
};

exports.updateCalendar = function(calendar) {
  return method('calendars/update', calendar);
};

exports.createEvent = function(event) {
  return method('events/create', event);
};

exports.updateEvent = function(event) {
  return method('events/update', event);
};

exports.deleteEvent = function(event) {
  return method('events/remove', event);
};

exports.getSetting = function(id) {
  return method('settings/get', id);
};

exports.setSetting = function(id, value) {
  return method('settings/set', id, value);
};

exports.observeSetting = function(id) {
  return stream('settings/observe', id);
};

exports.getAllAccounts = function() {
  return method('accounts');
};

exports.getAccount = function(id) {
  return method('accounts/get', id);
};

exports.deleteAccount = function(id) {
  return method('accounts/remove', id);
};

/**
 * Sends a request to create an account.
 *
 * @param {Calendar.Models.Account} model account details.
 */
exports.createAccount = function(model) {
  return method('accounts/create', model);
};

exports.observeAccounts = function() {
  return stream('accounts/observe');
};

exports.initDay = function() {
  return method('days/init');
};

exports.observeDay = function(date) {
  return stream('days/observe', date);
};

/**
 * Returns a list of available presets filtered by
 * the currently used presets in the database.
 * (can't create multiple local calendars)
 */
exports.availablePresets = function(presetList) {
  return method('accounts/presets', presetList);
};

exports.getNotificationDetails = function(alarm) {
  return method('notifications/get', {
    eventId: alarm.eventId,
    busytimeId: alarm.busytimeId
  });
};

exports.syncAll = function() {
  return method('sync/all');
};

});
