define(function(require, exports) {
'use strict';

var Db = require('db');
var Factory = require('test/support/factory');
var MockProvider = require('test/support/mock_provider');
var app = require('app');
var core = require('core');

require('test/support/factories/all');

exports._lastEnvId = 0;

exports.core = function() {
  var pendingManager = app.pendingManager;
  if (pendingManager) {
    // hack to ensure clean tests
    pendingManager.objects.forEach(item => pendingManager.unregister(item));
  }

  if (core.db && core.db.isOpen) {
    core.db.close();
  }

  app.setupCore('b2g-test-calendar');
  core.providerFactory.providers.Mock = new MockProvider();
  return core;
};

exports.accountEnvironment = function(accOverrides, calOverrides) {
  accOverrides = accOverrides || {};
  accOverrides.providerType = accOverrides.providerType || 'Mock';
  calOverrides = calOverrides || {};

  setup(function(done) {
    var id = ++exports._lastEnvId;
    accOverrides._id = id;
    calOverrides.accountId = id;

    var trans = core.db.transaction(['accounts', 'calendars'], 'readwrite');
    trans.oncomplete = () => done();
    trans.onerror = event => done(event.target.error);

    var account = this.account = Factory('account', accOverrides);
    var calendar = this.calendar = Factory('calendar', calOverrides);
    var storeFactory = core.storeFactory;
    var accountStore = storeFactory.get('Account');
    var calendarStore = storeFactory.get('Calendar');
    accountStore.persist(account, trans);
    calendarStore.persist(calendar, trans);
  });
};

exports.eventEnvironment = function(busytimeOverrides, eventOverrides) {
  eventOverrides = eventOverrides || {};
  eventOverrides._id = eventOverrides._id || 'one';
  busytimeOverrides = busytimeOverrides || {};

  setup(function(done) {
    var storeFactory = core.storeFactory;
    var busytimeStore = storeFactory.get('Busytime');
    var eventStore = storeFactory.get('Event');
    var trans = core.db.transaction(eventStore._dependentStores, 'readwrite');
    trans.oncomplete = () => done();
    trans.onerror = event => done(event.target.error);

    eventOverrides.calendarId = this.calendar._id;
    var event = this.event = Factory('event', eventOverrides);
    busytimeOverrides.calendarId = this.calendar._id;
    busytimeOverrides.eventId = this.event._id || eventOverrides._id;
    var busytime = this.busytime = Factory('busytime', busytimeOverrides);
    eventStore.persist(event, trans);
    busytimeStore.persist(busytime, trans);
  });
};

exports.dbFixtures = function(factory, storeName, list) {
  var object = Object.create(null);

  setup(function(done) {
    var db = core.db;
    var store = core.storeFactory.get(storeName);
    var trans = db.transaction(store._dependentStores, 'readwrite');
    trans.oncomplete = () => done();
    trans.onerror = event => done(event.target.error);

    for (var key in list) {
      store.persist(
        (object[key] = Factory(factory, list[key])),
        trans
      );
    }
  });

  return object;
};

exports.clearStore = function(db, name, callback) {
  if (typeof(name) === 'function') {
    callback = name;
    name = Object.keys(Db.prototype.store);
  }

  var trans = db.transaction(name, 'readwrite');
  trans.oncomplete = () => callback();
  trans.onerror = () => callback(new Error('Could not wipe accounts db'));

  name = [].concat(name);
  name.forEach(storeName => {
    var store = trans.objectStore(storeName);
    store.clear();
  });
};

exports.bench = function(iter, cb) {
  var start = window.performance.now();
  for (var i = 0; i < iter; i++) {
    cb();
  }

  return window.performance.now() - start;
};

exports.vs = function(iter, cmds) {
  var results = {};
  for (var key in cmds) {
    results[key] = exports.bench(iter, cmds[key]);
  }

  return results;
};

exports.triggerEvent = function(element, eventType) {
  var event = document.createEvent('HTMLEvents');
  event.initEvent(eventType, true, true);
  element.dispatchEvent(event);
};

});
