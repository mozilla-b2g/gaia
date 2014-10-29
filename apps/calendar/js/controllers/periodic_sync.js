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

var debug = require('debug')('controllers/periodic_sync');

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

// Will be injected...
exports.app = null;

exports.observe = function() {
  debug('Will start periodic sync controller...');
  var app = exports.app;
  var settings = app.store('Setting');
  return Promise.all([
    settings.getValue('syncAlarm'),
    settings.getValue('syncFrequency')
  ])
  .then(values => {
    [syncAlarm, syncFrequency] = values;
    settings.on('syncFrequencyChange', exports);
    return scheduleSync();
  });
};

exports.unobserve = function() {
  var app = exports.app;
  var settings = app.store('Setting');
  settings.off('syncFrequencyChange', exports);
};

exports.handleEvent = function(event) {
  switch (event.type) {
    case 'sync':
      return onSync();
    case 'syncFrequencyChange':
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
  return cacheSyncFrequency(value).then(maybeScheduleSync);
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
        syncing = null;
        resolve();
      });
    });
  }

  return syncing;
}

function cacheSyncFrequency(value) {
  debug('Will save sync interval:', value);
  syncFrequency = value;
  var app = exports.app;
  var settings = app.store('Setting');
  return settings.set('syncFrequency', value);
}

function scheduleSync() {
  if (!scheduling) {
    debug('Will schedule periodic sync in:', syncFrequency);
    // Cache the sync interval which we're sending to the alarms api.
    prevSyncFrequency = syncFrequency;
    revokePreviousAlarm();
    scheduling = issueSyncAlarm()
    .then(cacheSyncAlarm)
    .then(maybeScheduleSync)
    .then(() => {
      scheduling = null;
    })
    .catch(error => {
      debug('Error scheduling sync:', error);
      console.error(error.toString());
      scheduling = null;
    });
  }

  return scheduling;
}

// TODO: When navigator.mozAlarms.remove (one day) returns a DOMRequest,
//     we should make this async...
function revokePreviousAlarm() {
  if (typeof syncAlarm !== 'object' || !('alarmId' in syncAlarm)) {
    // No sync alarms previously issued...
    return;
  }

  var alarms = navigator.mozAlarms;
  alarms.remove(syncAlarm.alarmid);
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
    request.onsuccess = () => {
      resolve({ alarmId: this.result, start: start, end: end });
    };

    request.onerror = () => {
      reject(this.error);
    };
  });
}

function cacheSyncAlarm(alarm) {
  debug('Will save alarm:', alarm);
  syncAlarm = alarm;
  var app = exports.app;
  var settings = app.store('Setting');
  return settings.set('syncAlarm', syncAlarm);
}

function maybeScheduleSync() {
  if (syncFrequency === prevSyncFrequency) {
    // Nothing to do!
    return scheduling;
  }

  if (scheduling) {
    return scheduling.then(scheduleSync);
  }

  return scheduleSync();
}

});
