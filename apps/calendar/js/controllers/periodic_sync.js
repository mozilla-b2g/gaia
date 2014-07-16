/* global Promise */
/**
 * @fileoverview Periodic sync controller manages
 *
 * 1. Seeding first sync alarm when app starts.
 * 2. Syncing when a sync alarm fires and adding a new alarm.
 * 3. Invalidating / reissuing a sync alarm when the sync interval changes.
 */
Calendar.ns('Controllers').periodicSync = function(app) {
  'use strict';

  var exports = {};

  var debug = Calendar.debug('periodicSync');

  var syncAlarm,
      syncFrequency,
      pendingSyncFrequency,
      scheduling = false;

  exports.observe = () => {
    var settings = app.store('Setting');
    return Promise.all([
      settings.getValue('syncAlarm'),
      settings.getValue('syncFrequency')
    ])
    .then((values) => {
      syncAlarm = values[0];
      syncFrequency = values[1];
      debug('syncAlarm:', syncAlarm);
      debug('syncFrequency:', syncFrequency);
      settings.on('syncFrequencyChange', this);
      return scheduleSync();
    });
  };

  exports.unobserve = () => {
    var settings = app.store('Setting');
    settings.off('syncFrequencyChange', this);
  };

  exports.handleEvent = (event) => {
    switch (event.type) {
      case 'sync':
        return onSync();
      case 'syncFrequencyChange':
        return onSyncFrequencyChange(...event.data);
    }
  };

  function onSync() {
    if (scheduling) {
      // This means that we were told to periodic sync _just_ as the user
      // changed the sync interval. Don't do anything.
      return;
    }

    scheduling = true;
    return sync().then(() => {
      return scheduleSync();
    });
  }

  function onSyncFrequencyChange(value) {
    if (scheduling) {
      // This means that the user changed the sync interval while we
      // were performing periodic sync. Set a flag to remind ourselves
      // to invalidate the existing sync alarm and issue a new one with
      // at the correct time in the future once periodic sync completes.
      pendingSyncFrequency = value;
      return;
    }

    syncFrequency = value;
    scheduling = true;
    return scheduleSync();
  }

  function scheduleSync() {
    var alarms = navigator.mozAlarms;
    debug('Will schedule periodic sync in', syncFrequency);

    if (typeof syncAlarm === 'object' && !!syncAlarm.alarmId) {
      debug('Will invalidate previous periodic sync alarm.');
      alarms.remove(syncAlarm.alarmId);
    }

    return new Promise((resolve, reject) => {
      if (typeof syncFrequency !== 'number') {
        debug('Periodic sync disabled!');
        return resolve({ alarmId: null, start: null, end: null });
      }

      var start = new Date(),
          end = new Date(start.getTime() + syncFrequency * 60 * 1000);

      var request = alarms.add(end, 'ignoreTimezone', { type: 'sync' });

      request.onsuccess = function(event) {
        resolve({ alarmId: this.result, start: start, end: end });
      };

      request.onerror = function(event) {
        reject(this.error);
      };
    })
    .then((alarm) => {
      debug('Created alarm:', JSON.stringify(alarm));
      var settings = app.store('Setting');
      return settings.set('syncAlarm', alarm);
    })
    .then(() => {
      if (typeof pendingSyncFrequency === 'number') {
        syncFrequency = pendingSyncFrequency;
        pendingSyncFrequency = null;
        return scheduleSync();
      }

      scheduling = false;
    })
    .catch((error) => {
      debug('Error setting alarm:', error);
      console.error(error.toString());
    });
  }

  function sync() {
    return new Promise((resolve) => {
      debug('Will request cpu and wifi wake locks.');
      var cpuLock = navigator.requestWakeLock('cpu'),
          wifiLock = navigator.requestWakeLock('wifi');
      debug('Will sync.');
      app.syncController.all(() => {
        debug('Sync complete! Will release cpu and wifi locks.');
        cpuLock.unlock();
        wifiLock.unlock();
        resolve();
      });
    });
  }

  return exports;
};
