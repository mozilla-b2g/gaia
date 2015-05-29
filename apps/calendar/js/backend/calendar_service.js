define(function(require, exports) {
'use strict';

var Db = require('db');
var co = require('ext/co');
var core = require('core');
var object = require('common/object');
var threads = require('ext/threads');

var service = threads.service('calendar');
var loadDb;

var db = core.db = new Db('b2g-calendar');
var providerFactory = core.providerFactory = require('provider/factory');
var storeFactory = core.storeFactory = require('store/factory');

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
  service.stream(endpoint, () => {
    var args = Array.slice(arguments);
    return co(function *() {
      yield start();
      handler.apply(null, args);
    });
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
var saveAccount = co.wrap(function *saveAccount(details) {
  var store = storeFactory.get('Account');
  var account;
  try {
    account = yield store.verifyAndPersist(details);
  } catch (error) {
    return Promise.reject(error);
  }

  yield syncAccount(account);
  return account;
});

function removeAccount(id) {
  var store = core.storeFactory.get('Account');
  return store.remove(id);
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
    var store = storeFactory.get('Calendar');
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

var saveEvent = co.wrap(function *saveEvent(exists, event) {
  var store = storeFactory.get('Event');
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

var removeEvent = co.wrap(function *removeEvent(event) {
  var store = storeFactory.get('Event');
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

function setSetting(key, value) {
  var store = storeFactory.get('Setting');
  return store.set(key, value);
}

function listAccounts(stream) {
  var accounts = storeFactory.get('Account');
  var write = createAccountsWriter(stream);
  write();

  accounts.on('add', write);
  accounts.on('remove', write);
  accounts.on('update', write);

  stream.cancel = () => {
    accounts.off('add', write);
    accounts.off('remove', write);
    accounts.off('update', write);
  };
}

function createAccountsWriter(stream) {
  return co.wrap(function *() {
    try {
      var accounts = yield storeFactory.get('Account').all();
      var data = object.map(accounts, (id, account) => {
        var provider = providerFactory.get(account.providerType);
        return { account: account, provider: provider };
      });
      stream.write(data);
    } catch (error) {
      console.error(`Error fetching accounts: ${error.message}`);
      return Promise.reject(error);
    }
  });
}

function getAccount(stream, id) {
  // TODO
  console.log('accounts/get', stream, id);
}

function listCalendars(stream) {

}

function getEvent(stream, id) {
  // TODO
  console.log('events/get', stream, id);
}

function listBusytimes(stream, day) {
  // TODO
  console.log('busytimes/list', stream, day);
}

var getSetting = co.wrap(function *(stream, key) {
  var settings = storeFactory.get('Setting');
  var value = yield settings.getValue(key);
  var write = stream.write.bind(stream);
  write(value);
  settings.on(`${key}Change`, write);
  stream.cancel = () => settings.off(`${key}Change`, write);
});

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
