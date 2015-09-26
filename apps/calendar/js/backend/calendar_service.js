define(function(require, exports) {
'use strict';

// initialize core dependencies
require('core_setup')();

var RecurringEvents = require('recurring_events');
var accounts = require('services/accounts');
var busytimes = require('services/busytimes');
var calendars = require('services/calendars');
var co = require('ext/co');
var core = require('core');
var events = require('services/events');
var notifications = require('services/notifications');
var settings = require('services/settings');

var loadDb;
var recurringEvents;

function start() {
  if (loadDb != null) {
    return loadDb;
  }

  broadcastEvents(core.syncService, [
    'syncStart',
    'syncComplete',
    'syncOffline'
  ]);

  recurringEvents = new RecurringEvents();
  broadcastEvents(recurringEvents, [
    'expandStart',
    'expandComplete'
  ]);
  recurringEvents.observe();

  // turn on the auto queue this means that when
  // alarms are added to the database we manage them
  // transparently. Defaults to off for tests.
  var alarms = core.storeFactory.get('Alarm');
  alarms.autoQueue = true;

  loadDb = core.db.load();
  core.caldavManager.start(false);
  return loadDb;
}

// notify frontend about events
function broadcastEvents(target, events) {
  events.forEach(type => target.on(type, data => {
    core.service.broadcast(type, data);
  }));
}

function method(endpoint, handler) {
  core.service.method(endpoint, function(...args) {
    return start().then(() => {
      return handler.apply(null, args);
    }).then(data => {
      // make sure models are converted to plain objects when possible
      return data && typeof data === 'object' && 'toJSON' in data ?
        data.toJSON() :
        data;
    }).catch(err => {
      // hack to make sure custom errors are handled properly
      // (otherwise they would be coerced into plain strings)
      return Promise.reject(err && JSON.stringify(err));
    });
  });
}

function stream(endpoint, handler) {
  core.service.stream(endpoint, () => {
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

method('echo', echo);

method('accounts', accounts.all);
method('accounts/get', accounts.get);
method('accounts/create', accounts.persist);
method('accounts/remove', accounts.remove);
method('accounts/presets', accounts.availablePresets);
stream('accounts/observe', accounts.observe);

method('events/create', events.create);
method('events/update', events.update);
method('events/remove', events.remove);

method('records/get', busytimes.fetchRecord);
method('days/init', busytimes.init);
stream('days/observe', busytimes.observeDay);

method('settings/get', settings.get);
method('settings/set', settings.set);
stream('settings/observe', settings.observe);

method('calendars/update', calendars.update);
stream('calendars/observe', calendars.observe);

method('time/update', core.timeModel.update);

method('notifications/get', notifications.get);

method('sync/all', core.syncService.all);

exports.start = start;

});
