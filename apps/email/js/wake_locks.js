/*jshint browser: true */
/*globals define, console */

define(function(require) {
  'use strict';
  var lockTimeouts = {},
      evt = require('evt'),
      allLocks = {},

      // Using an object instead of an array since dataIDs are unique
      // strings.
      dataOps = {},
      dataOpsTimeoutId = 0,

      // Only allow keeping the locks for a maximum of 45 seconds.
      // This is to prevent a long, problematic sync from consuming
      // all of the battery power in the phone. A more sophisticated
      // method may be to adjust the size of the timeout based on
      // past performance, but that would mean keeping a persistent
      // log of attempts. This naive approach just tries to catch the
      // most likely set of failures: just a temporary really bad
      // cell network situation that once the next sync happens, the
      // issue is resolved.
      maxLockInterval = 45000,

      // Allow UI-triggered data operations to complete in a wake lock timeout
      // case, but only for a certain amount of time, because they could be the
      // cause of the wake lock timeout.
      dataOpsTimeout = 5000;

  // START failsafe close support, bug 1025727.
  // If the wake locks are timed out, it means sync went on too long, and there
  // is likely a problem. Reset state via app shutdown. Allow for UI-triggered
  // data operations to complete though before finally releasing the wake locks
  // and shutting down.
  function close() {
    // Reset state in case a close does not actually happen.
    dataOps = {};
    dataOpsTimeoutId = 0;

    // Only really close if the app is hidden.
    if (document.hidden) {
      console.log('email: cronsync wake locks expired, force closing app');
      window.close();
    } else {
      console.log('email: cronsync wake locks expired, but app visible, ' +
                  'not force closing');
      // User is using the app. Just clear all locks so we do not burn battery.
      // This means the app could still be in a bad data sync state, so just
      // need to rely on the next sync attempt or OOM from other app usage.
      Object.keys(allLocks).forEach(function(accountKey) {
        clearLocks(accountKey);
      });
    }
  }

  function closeIfNoDataOps() {
    var dataOpsKeys = Object.keys(dataOps);

    if (!dataOpsKeys.length) {
      // All clear, no waiting data operations, shut it down.
      return close();
    }

    console.log('email: cronsync wake lock force shutdown waiting on email ' +
                'data operations: ' + dataOpsKeys.join(', '));
    // Allow data operations to complete, but also set a cap on that since
    // they could be the ones causing the sync to fail. Give it 5 seconds.
    dataOpsTimeoutId = setTimeout(close, dataOpsTimeout);
  }

  // Listen for data operation events that might want to delay the failsafe
  // close switch.
  evt.on('uiDataOperationStart', function(dataId) {
    dataOps[dataId] = true;
  });

  evt.on('uiDataOperationStop', function(dataId) {
    delete dataOps[dataId];

    if (dataOpsTimeoutId && !Object.keys(dataOps).length) {
      clearTimeout(dataOpsTimeoutId);
      close();
    }
  });
  // END failsafe close

  function clearLocks(accountKey) {
    console.log('email: clearing wake locks for "' + accountKey + '"');

    // Clear timer
    var lockTimeoutId = lockTimeouts[accountKey];
    if (lockTimeoutId) {
      clearTimeout(lockTimeoutId);
    }
    lockTimeouts[accountKey] = 0;

    // Clear the locks
    var locks = allLocks[accountKey];
    allLocks[accountKey] = null;
    if (locks) {
      locks.forEach(function(lock) {
        lock.unlock();
      });
    }
  }

  // Creates a string key from an array of string IDs. Uses a space
  // separator since that cannot show up in an ID.
  function makeAccountKey(accountIds) {
    return 'id' + accountIds.join(' ');
  }

  function onCronStop(accountIds) {
    clearLocks(makeAccountKey(accountIds));
  }

  evt.on('cronSyncWakeLocks', function(accountKey, locks) {
    if (lockTimeouts[accountKey]) {
      // Only support one set of locks. Better to err on the side of
      // saving the battery and not continue syncing vs supporting a
      // pathologic error that leads to a compound set of locks but
      // end up with more syncs completing.
      clearLocks(accountKey);
    }

    allLocks[accountKey] = locks;

    // If timeout is reached, means app is stuck in a bad state, and just
    // shut it down via the failsafe close.
    lockTimeouts[accountKey] = setTimeout(closeIfNoDataOps, maxLockInterval);
  });

  evt.on('cronSyncStop', onCronStop);
});
