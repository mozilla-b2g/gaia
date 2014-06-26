/*jshint browser: true */
/*globals define, console */

define(function(require) {
  var lockTimeouts = {},
      evt = require('evt'),
      allLocks = {},

      // Only allow keeping the locks for a maximum of 45 seconds.
      // This is to prevent a long, problematic sync from consuming
      // all of the battery power in the phone. A more sophisticated
      // method may be to adjust the size of the timeout based on
      // past performance, but that would mean keeping a persistent
      // log of attempts. This naive approach just tries to catch the
      // most likely set of failures: just a temporary really bad
      // cell network situation that once the next sync happens, the
      // issue is resolved.
      maxLockInterval = 45000;

  function clearLocks(accountKey) {
    console.log('email: clearing wake locks for "' + accountKey + '"');

    // Clear timer
    var lockTimeoutId = lockTimeouts[accountKey];
    if (lockTimeoutId)
      clearTimeout(lockTimeoutId);
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

    lockTimeouts[accountKey] = setTimeout(clearLocks.bind(null, accountKey),
                                          maxLockInterval);
  });

  evt.on('cronSyncStop', onCronStop);
});
