/* global Promise */
/**
 * @fileoverview Periodic sync controller manages
 *
 * 1. Seeding first sync alarm when app starts.
 * 2. Syncing when a sync alarm fires and adding a new alarm.
 * 3. Invalidating / reissuing a sync alarm when the sync interval changes.
 */
Calendar.ns('Controllers').periodicSync = (function() {
  'use strict';

  var exports = {};

  var debug = Calendar.debug('periodicSync');

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
   * Most recent set sync interval (every x minutes).
   * @type {Number}
   */
  var currSyncFrequency;

  /**
   * Cached promise representing the next async action we're waiting for.
   * @type {Promise}
   */
  var action;

  exports.app = null;

  exports.observe = () => {
    var settings = exports.app.store('Setting');
    return Promise.all([
      settings.getValue('syncAlarm'),
      settings.getValue('syncFrequency')
    ])
    .then((values) => {
      [syncAlarm, currSyncFrequency] = values;
      debug('syncAlarm:', syncAlarm);
      debug('syncFrequency:', currSyncFrequency);
      settings.on('syncFrequencyChange', exports);
      return (action = scheduleSync());
    });
  };

  exports.unobserve = () => {
    var settings = exports.app.store('Setting');
    settings.off('syncFrequencyChange', exports);
  };

  exports.handleEvent = (event) => {
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
   * 3. Schedule another periodic sync.
   */
  function onSync() {
    if (action instanceof Promise) {
      action.then(sync);
    } else {
      action = sync();
    }

    return action.then(scheduleSync);
  }

  /**
   * 1. Wait until we're done with any previous work.
   * 2. Schedule a periodic sync at the new interval.
   */
  function onSyncFrequencyChange(value) {
    return cacheSyncFrequency(value)
    .then(() => {
      if (action instanceof Promise) {
        action.then(scheduleSync);
      } else {
        action = scheduleSync();
      }

      return action;
    });
  }

  function scheduleSync() {
    debug('Will schedule periodic sync in', currSyncFrequency);
    // Cache the sync interval which we're sending to the alarms api.
    prevSyncFrequency = currSyncFrequency;
    return revokePreviousAlarm()
    .then(issueSyncAlarm)
    .then(cacheSyncAlarm)
    .then(maybeScheduleSync)
    .catch((error) => {
      debug('Error scheduling sync:', error);
      console.error(error.toString());
    });
  }

  /**
   * TODO: One day the platform will provide us with a DOMRequest response
   *     from navigator.mozAlarms#remove and we should resolve or reject
   *     appropriately.
   */
  function revokePreviousAlarm() {
    var alarms = navigator.mozAlarms;
    return new Promise((resolve) => {
      if (typeof syncAlarm !== 'object' || !('alarmId' in syncAlarm)) {
        return resolve();
      }

      debug('Will invalidate previous periodic sync alarm.');
      // Agh! Platform! How do I know that this worked?!
      alarms.remove(syncAlarm.alarmId);
      resolve();
    });
  }

  function issueSyncAlarm() {
    return new Promise((resolve, reject) => {
      if (typeof prevSyncFrequency !== 'number') {
        debug('Periodic sync disabled!');
        return resolve({ alarmId: null, start: null, end: null });
      }

      var start = new Date();
      var end = new Date(start.getTime() + prevSyncFrequency * 60 * 1000);

      var alarms = navigator.mozAlarms;
      var request = alarms.add(end, 'ignoreTimezone', { type: 'sync' });

      request.onsuccess = function(event) {
        resolve({ alarmId: this.result, start: start, end: end });
      };

      request.onerror = function() {
        reject(this.error);
      };
    });
  }

  function cacheSyncAlarm(alarm) {
    debug('Will save alarm:', JSON.stringify(alarm));
    syncAlarm = alarm;
    var settings = exports.app.store('Setting');
    return settings.set('syncAlarm', syncAlarm);
  }

  function cacheSyncFrequency(frequency) {
    debug('Will save sync interval:', frequency);
    currSyncFrequency = frequency;
    var settings = exports.app.store('Setting');
    return settings.set('syncFrequency', frequency);
  }

  function maybeScheduleSync() {
    if (currSyncFrequency !== prevSyncFrequency) {
      // Oh noes! That means that the sync interval was changed while
      // we were scheduling. We need to take a mulligan.
      action = action.then(scheduleSync);
    }

    return action;
  }

  function sync() {
    return new Promise((resolve) => {
      debug('Will request cpu and wifi wake locks.');
      var cpuLock = navigator.requestWakeLock('cpu'),
          wifiLock = navigator.requestWakeLock('wifi');
      debug('Will sync.');
      exports.app.syncController.all(() => {
        debug('Sync complete! Will release cpu and wifi locks.');
        cpuLock.unlock();
        wifiLock.unlock();
        resolve();
      });
    });
  }

  return exports;
})();
