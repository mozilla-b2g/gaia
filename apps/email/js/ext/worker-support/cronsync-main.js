/*jshint browser: true */
/*global define, console */
define(function(require) {
  'use strict';

  var evt = require('evt');

  function debug(str) {
    console.log('cronsync-main: ' + str);
  }

  // Creates a string key from an array of string IDs. Uses a space
  // separator since that cannot show up in an ID.
  function makeAccountKey(accountIds) {
    return 'id' + accountIds.join(' ');
  }

  // Converts 'interval' + intervalInMillis to just a intervalInMillis
  // Number.
  var prefixLength = 'interval'.length;
  function toInterval(intervalKey) {
    return parseInt(intervalKey.substring(prefixLength), 10);
  }

  // Makes sure two arrays have the same values, account IDs.
  function hasSameValues(ary1, ary2) {
    if (ary1.length !== ary2.length) {
      return false;
    }

    var hasMismatch = ary1.some(function(item, i) {
      return item !== ary2[i];
    });

    return !hasMismatch;
  }

  var dispatcher = {
    _routeReady: false,
    _routeQueue: [],
    _sendMessage: function(type, args) {
      if (this._routeReady) {
        // sendMessage is added to routeRegistration by the main-router module.
        routeRegistration.sendMessage(null, type, args);
      } else {
        this._routeQueue.push([type, args]);
      }
    },

    /**
     * Called by worker side to indicate it can now receive messages.
     */
    hello: function() {
      this._routeReady = true;
      if (this._routeQueue.length) {
        var queue = this._routeQueue;
        this._routeQueue = [];
        queue.forEach(function(args) {
          this._sendMessage(args[0], args[1]);
        }.bind(this));
      }
    },

    /**
     * Clears all sync-based tasks. Normally not called, except perhaps for
     * tests or debugging.
     */
    clearAll: function() {
      var navSync = navigator.sync;
      if (!navSync) {
        return;
      }

      navSync.registrations().then(function(registrations) {
        if (!registrations.length) {
          return;
        }

        registrations.forEach(function(registeredTask) {
          navSync.unregister(registeredTask.task);
        });
      }.bind(this),
      function(err) {
        console.error('cronsync-main clearAll navigator.sync.registrations ' +
                      'error: ' + err);
      }.bind(this));
    },

    /**
     * Makes sure there is an sync task set for every account in
     * the list.
     * @param  {Object} syncData. An object with keys that are
     * 'interval' + intervalInMilliseconds, and values are arrays
     * of account IDs that should be synced at that interval.
     */
    ensureSync: function (syncData) {
      var navSync = navigator.sync;
      if (!navSync) {
        console.warn('no navigator.sync support!');
        // Let backend know work has finished, even though it was a no-op.
        this._sendMessage('syncEnsured');
        return;
      }

      debug('ensureSync called');

      navSync.registrations().then(function(registrations) {
        debug('success!');

        // Find all IDs being tracked by sync tasks
        var expiredTasks = [],
            okTaskIntervals = {},
            uniqueTasks = {};

        registrations.forEach(function(task) {
          // minInterval in seconds, but use milliseconds for sync values
          // internally.
          var intervalKey = 'interval' + (task.minInterval * 1000),
              wantedAccountIds = syncData[intervalKey];

          if (!wantedAccountIds || !hasSameValues(wantedAccountIds,
                                                  task.data.accountIds)) {
            debug('account array mismatch, canceling existing sync task');
            expiredTasks.push(task);
          } else {
            // Confirm the existing sync task is still good.
            var interval = toInterval(intervalKey),
                accountKey = makeAccountKey(wantedAccountIds);

            // If the interval is nonzero, and there is no other task found
            // for that account combo, and if it is not in the past and if it
            // is not too far in the future, it is OK to keep.
            if (interval && !uniqueTasks.hasOwnProperty(accountKey)) {
              debug('existing sync task is OK: ' + interval);
              uniqueTasks[accountKey] = true;
              okTaskIntervals[intervalKey] = true;
            } else {
              debug('existing sync task is out of interval range, canceling');
              expiredTasks.push(task);
            }
          }
        });

        expiredTasks.forEach(function(expiredTask) {
          navSync.unregister(expiredTask.task);
        });

        var taskMax = 0,
            taskCount = 0,
            self = this;

        // Called when sync tasks are confirmed to be set.
        function done() {
          taskCount += 1;
          if (taskCount < taskMax) {
            return;
          }

          debug('ensureSync completed');
          // Indicate ensureSync has completed because the
          // back end is waiting to hear sync task was set
          // before triggering sync complete.
          self._sendMessage('syncEnsured');
        }

        Object.keys(syncData).forEach(function(intervalKey) {
          // Skip if the existing sync task is already good.
          if (okTaskIntervals.hasOwnProperty(intervalKey)) {
            return;
          }

          var interval = toInterval(intervalKey),
              accountIds = syncData[intervalKey];

          // Do not set an timer for a 0 interval, bad things happen.
          if (!interval) {
            return;
          }

          taskMax += 1;

          navSync.register('interval' + interval, {
            // minInterval is in seconds.
            minInterval: interval / 1000,
            oneShot: false,
            data: {
              accountIds: accountIds,
              interval: interval
            },
            wifiOnly: false,
            // TODO: allow this to be more generic, getting this passed in
            // from the page using this module. This assumes the current page
            // without query strings or fragment IDs is the desired entry point.
            wakeUpPage: location.href.split('?')[0].split('#')[0] })
          .then(function() {
            debug('success: navigator.sync.register for ' + 'IDs: ' +
                  accountIds +
                  ' at ' + interval + 'ms');
            done();
          }, function(err) {
            console.error('cronsync-main navigator.sync.register for IDs: ' +
                          accountIds +
                          ' failed: ' + err);
          });
        });

        // If no sync tasks were added, indicate ensureSync is done.
        if (!taskMax) {
          done();
        }
      }.bind(this),
      function(err) {
        console.error('cronsync-main ensureSync navigator.sync.register: ' +
                      'error: ' + err);
      });
    }
  };

  if (navigator.mozSetMessageHandler) {
    navigator.mozSetMessageHandler('request-sync', function onRequestSync(e) {
      console.log('mozSetMessageHandler: received a request-sync');

      // Important for gaia email app to know when a mozSetMessageHandler has
      // been dispatched. Could be removed if notification close events did not
      // open the email app, or if we wanted to be less efficient on closing
      // down the email app on those events. Although the email app would not be
      // a good memory citizen in that case.
      if (window.hasOwnProperty('appDispatchedMessage')) {
        window.appDispatchedMessage = true;
      }

      var data = e.data;

      // Need to acquire the wake locks during this notification
      // turn of the event loop -- later turns are not guaranteed to
      // be up and running. However, knowing when to release the locks
      // is only known to the front end, so publish event about it.
      // Need a CPU lock since otherwise the app can be paused
      // mid-function, which could lead to unexpected behavior, and the
      // sync should be completed as quick as possible to then close
      // down the app.
      // TODO: removed wifi wake lock due to network complications, to
      // be addressed in a separate changset.
      if (navigator.requestWakeLock) {
        var locks = [
          navigator.requestWakeLock('cpu')
        ];

        debug('wake locks acquired: ' + locks +
              ' for account IDs: ' + data.accountIds);

        evt.emitWhenListener('cronSyncWakeLocks',
                             makeAccountKey(data.accountIds), locks);
      }

      debug('request-sync started at ' + (new Date()));

      dispatcher._sendMessage('requestSync',
                              [data.accountIds, data.interval]);
    });
  }

  var routeRegistration = {
    name: 'cronsync',
    sendMessage: null,
    dispatch: dispatcher
  };

  return routeRegistration;
});
