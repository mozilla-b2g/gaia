/**
 * @fileoverview Period sync controller manages
 *
 *     1. Seeding first sync alarm when app starts.
 *     2. Syncing when a sync alarm fires and issuing a new sync alarm.
 *     3. Invalidating any existing sync alarms and issuing a new one
 *        when the sync interval changes.
 */
define(function(require, exports) {
'use strict';

var Responder = require('responder');
var debug = require('debug')('controllers/periodic_sync');
var messageHandler = require('message_handler');

/**
 * Cached alarm previously sent to alarms db.
 * @type {Object}
 */
var syncAlarm;

/**
 * Cached sync value (every x minutes) from scheduling.
 * @type {Number}
 */
var prevSyncFrequency;

/**
 * Most recently set sync interval (every x minutes).
 * @type {Number}
 */
var syncFrequency;

/**
 * Cached promise representing pending sync operation.
 * @type {Promise}
 */
var syncing;

/**
 * Cached promise representing pending schedule operation.
 * @type {Promise}
 */
var scheduling;

var events = new Responder();
exports.events = events;

var accounts;
var settings;

// Will be injected...
exports.app = null;

exports.observe = function() {
  debug('Will start periodic sync controller...');
  var app = exports.app;
  accounts = app.store('Account');
  settings = app.store('Setting');
  return Promise.all([
    settings.getValue('syncAlarm'),
    settings.getValue('syncFrequency')
  ])
  .then(values => {
    [syncAlarm, syncFrequency] = values;
    // Trigger whenever there is a change to the accounts collection
    // since we need to re-evaluate whether periodic sync is still necessary.
    accounts.on('persist', onAccountsChange);
    accounts.on('remove', onAccountsChange);
    // Listen to the settings collection for a change to sync frequency so that
    // we can update any alarms we've sent to the alarms api accordingly.
    debug('Will listen for syncFrequencyChange...');
    settings.on('syncFrequencyChange', exports);
    // Listen for sync event from alarms api.
    messageHandler.responder.on('sync', exports);
    return scheduleSync();
  });
};

exports.unobserve = function() {
  syncAlarm = null;
  prevSyncFrequency = null;
  syncFrequency = null;
  syncing = null;
  scheduling = null;
  accounts.off('persist', onAccountsChange);
  accounts.off('remove', onAccountsChange);
  settings.off('syncFrequencyChange', exports);
  messageHandler.responder.off('sync', exports);
};

exports.handleEvent = function(event) {
  switch (event.type) {
    case 'sync':
      // Gets triggered by mozSetMessageHandler alarm event.
      return onSync();
    case 'syncFrequencyChange':
      // Gets triggered by settings db change to sync frequency.
      debug('Received syncFrequencyChange!');
      return onSyncFrequencyChange(event.data[0]);
  }
};

/**
 * 1. Wait until we're done with any previous work.
 * 2. Sync.
 * 3. Schedule the next periodic sync.
 */
function onSync() {
  return sync().then(scheduleSync);
}

/**
 * 1. Wait until we're done with any previous work.
 * 2. Schedule a periodic sync at the new interval.
 */
function onSyncFrequencyChange(value) {
  debug('Sync frequency changed to', value);
  syncFrequency = value;
  return maybeScheduleSync();
}

/**
 * No syncable accounts => revoke any previously scheduled sync alarms.
 * Syncable accounts and no previously scheduled sync => schedule new sync.
 */
function onAccountsChange() {
  debug('Looking up syncable accounts...');
  return accounts.syncableAccounts().then(syncable => {
    if (!syncable || !syncable.length) {
      debug('There are no syncable accounts!');
      revokePreviousAlarm();
      events.emit('pause');
      return;
    }

    debug('There are', syncable.length, 'syncable accounts');

    if (!syncAlarmIssued()) {
      debug('The first syncable account was just added.');
      return scheduleSync();
    }
  });
}

function sync() {
  if (!syncing) {
    syncing = new Promise((resolve, reject) => {
      debug('Will request cpu and wifi wake locks...');
      var cpuLock = navigator.requestWakeLock('cpu');
      var wifiLock = navigator.requestWakeLock('wifi');
      debug('Will start periodic sync...');
      var app = exports.app;
      app.syncController.all(() => {
        debug('Sync complete! Will release cpu and wifi wake locks...');
        cpuLock.unlock();
        wifiLock.unlock();
        events.emit('sync');
        syncing = null;
        resolve();
      });
    });
  }

  return syncing;
}

function scheduleSync() {
  if (scheduling) {
    return scheduling;
  }

  scheduling = accounts.syncableAccounts()
  .then(syncable => {
    if (!syncable || !syncable.length) {
      debug('There seem to be no syncable accounts, will defer scheduling...');
      return Promise.resolve();
    }

    debug('Will schedule periodic sync in:', syncFrequency);
    // Cache the sync interval which we're sending to the alarms api.
    prevSyncFrequency = syncFrequency;
    revokePreviousAlarm();

    return issueSyncAlarm().then(cacheSyncAlarm).then(maybeScheduleSync);
  })
  .then(() => {
    events.emit('schedule');
    scheduling = null;
  })
  .catch(error => {
    debug('Error scheduling sync:', error);
    console.error(error.toString());
    scheduling = null;
  });

  return scheduling;
}

// TODO: When navigator.mozAlarms.remove (one day) returns a DOMRequest,
//     we should make this async...
function revokePreviousAlarm() {
  if (!syncAlarmIssued()) {
    debug('No sync alarms issued, nothing to revoke...');
    return;
  }

  debug('Will revoke alarm', syncAlarm.alarmId);
  var alarms = navigator.mozAlarms;
  alarms.remove(syncAlarm.alarmId);
}

function issueSyncAlarm() {
  if (!prevSyncFrequency) {
    debug('Periodic sync disabled!');
    return Promise.resolve({ alarmId: null, start: null, end: null });
  }

  var start = new Date();
  var end = new Date(
    start.getTime() +
    prevSyncFrequency * 60 * 1000 // minutes to ms
  );

  var alarms = navigator.mozAlarms;
  var request = alarms.add(end, 'ignoreTimezone', { type: 'sync' });

  return new Promise((resolve, reject) => {
    request.onsuccess = function() {
      resolve({ alarmId: this.result, start: start, end: end });
    };

    request.onerror = function() {
      reject(this.error);
    };
  });
}

function cacheSyncAlarm(alarm) {
  debug('Will save alarm:', alarm);
  syncAlarm = alarm;
  return settings.set('syncAlarm', syncAlarm);
}

function maybeScheduleSync() {
  if (syncFrequency === prevSyncFrequency) {
    // Nothing to do!
    return Promise.resolve();
  }

  if (scheduling) {
    return scheduling.then(scheduleSync);
  }

  return scheduleSync();
}

function syncAlarmIssued() {
  return syncAlarm && !!syncAlarm.alarmId;
}

});
