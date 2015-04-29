define(function(require, exports, module) {
'use strict';

var Db = require('db');
var co = require('ext/co');
//var object = require('common/object');
var threads = require('ext/threads');

var db = new Db('b2g-calendar');
var service = threads.service('calendar');
var loadDb;

function start() {
  if (loadDb != null) {
    return loadDb;
  }

  loadDb = db.load();
  return loadDb;
}

function method(endpoint, handler) {
  service.method(endpoint, () => {
    var args = Array.slice(arguments);
    return co(function *() {
      yield start();
      return handler.apply(null, args);
    });
  });
}

function stream(endpoint, handler) {
  service.stream(endpoint, function *() {
    var args = Array.slice(arguments);
    yield start();
    handler.apply(null, args);
  });
}

function echo() {
  return Array.slice(arguments);
}

/**
 * This will not work until the sync controller
 * (1) is not a class anymore
 * (2) doesn't need the app ns/object
 */
function saveAccount(details) {
  return co(function *() {
    var store = db.getStore('Account');
    var account;
    try {
      account = yield store.verifyAndPersist(details);
    } catch (error) {
      return Promise.reject(error);
    }

    yield syncAccount(account);
    return account;
  });
}

function removeAccount(id) {
  return co(function *() {
    var store = db.getStore('Account');
    yield store.remove(id);
  });
}

/**
 * This will not work until the sync controller
 * (1) is not a class anymore
 * (2) doesn't need the app ns/object
 */
function syncAccount(account) {
  console.log('syncAccount', account);
  /*
  return co(function *() {
    var store = db.getStore('Calendar');
    var calendars;
    try {
      calendars = yield store.remotesByAccount(account._id);
    } catch (error) {
      return Promise.reject(error);
    }

    var syncCalendar = syncController.calendar.bind(null, account);
    yield Promise.all(object.map(calendars, syncCalendar));
  });
  */
}

function saveEvent(exists, event) {
  return co(function *() {
    var store = db.getStore('Event');
    var provider = yield store.providerFor(event);
    var capabilities;
    try {
      capabilities = yield provider.eventCapabilities(event.data);
    } catch (error) {
      return Promise.reject(error);
    }

    var capability = exists ? 'canUpdate' : 'canCreate';
    if (!capabilities[capability]) {
      return Promise.reject(new Error('User not allowed to perform operation'));
    }

    var method = exists ? 'updateEvent' : 'createEvent';
    try {
      yield provider[method](event.data);
    } catch (error) {
      return Promise.reject(error);
    }
  });
}

function removeEvent(event) {
  return co(function *() {
    var store = db.getStore('Event');
    var provider = yield store.providerFor(event);
    var capabilities;
    try {
      yield provider.eventCapabilities(event.data);
    } catch (error) {
      return Promise.reject(error);
    }

    if (!capabilities.canDelete) {
      return Promise.reject(new Error('User not allowed to perform operation'));
    }

    yield provider.deleteEvent(event.data);
  });
}

function setSetting(key, value) {
  var store = db.getStore('Setting');
  return store.set(key, value);
}

function listAccounts(stream) {
  // TODO
  console.log('accounts/list', stream);
}

function getAccount(stream, id) {
  // TODO
  console.log('accounts/get', stream, id);
}

function listCalendars(stream) {
  // TODO
  console.log('calendars/list', stream);
}

function getEvent(stream, id) {
  // TODO
  console.log('events/get', stream, id);
}

function listBusytimes(stream, day) {
  // TODO
  console.log('busytimes/list', stream, day);
}

function getSetting(stream, key) {
  // TODO
  console.log('settings/set', stream, key);
}

method('echo', echo);
method('accounts/create', saveAccount);
method('accounts/update', saveAccount);
method('accounts/remove', removeAccount);
method('accounts/sync', syncAccount);
method('events/create', saveEvent.bind(null, true));
method('events/update', saveEvent.bind(null, true));
method('events/remove', removeEvent);
method('settings/set', setSetting);
stream('accounts/list', listAccounts);
stream('accounts/get', getAccount);
stream('calendars/list', listCalendars);
stream('events/get', getEvent);
stream('busytimes/list', listBusytimes);
stream('settings/get', getSetting);

exports.start = start;

});
