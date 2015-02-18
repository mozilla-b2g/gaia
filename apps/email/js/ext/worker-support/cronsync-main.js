/*jshint browser: true */
/*global define, console */
define(function(require) {
  'use strict';

  var evt = require('evt');

  function debug(str) {
    console.log('cronsync-main: ' + str);
  }

  function makeData(accountIds, interval, date) {
    return {
      type: 'sync',
      accountIds: accountIds,
      interval: interval,
      timestamp: date.getTime()
    };
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
    if (ary1.length !== ary2.length)
      return false;

    var hasMismatch = ary1.some(function(item, i) {
      return item !== ary2[i];
    });

    return !hasMismatch;
  }

  if (navigator.mozSetMessageHandler) {
    navigator.mozSetMessageHandler('alarm', function onAlarm(alarm) {
      // Do not bother with alarms that are not sync alarms.
      var data = alarm.data;
      if (!data || data.type !== 'sync')
        return;

      // Need to acquire the wake locks during this alarm notification
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

      dispatcher._sendMessage('alarm', [data.accountIds, data.interval]);
    });
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
     * Clears all sync-based alarms. Normally not called, except perhaps for
     * tests or debugging.
     */
    clearAll: function() {
      var mozAlarms = navigator.mozAlarms;
      if (!mozAlarms)
        return;

      var r = mozAlarms.getAll();

      r.onsuccess = function(event) {
        var alarms = event.target.result;
        if (!alarms)
          return;

        alarms.forEach(function(alarm) {
          if (alarm.data && alarm.data.type === 'sync')
            mozAlarms.remove(alarm.id);
        });
      }.bind(this);
      r.onerror = function(err) {
        console.error('cronsync-main clearAll mozAlarms.getAll: error: ' +
                      err);
      }.bind(this);
    },

    /**
     * Makes sure there is an alarm set for every account in
     * the list.
     * @param  {Object} syncData. An object with keys that are
     * 'interval' + intervalInMilliseconds, and values are arrays
     * of account IDs that should be synced at that interval.
     */
    ensureSync: function (syncData) {
      var mozAlarms = navigator.mozAlarms;
      if (!mozAlarms) {
        console.warn('no mozAlarms support!');
        return;
      }

      debug('ensureSync called');

      var request = mozAlarms.getAll();

      request.onsuccess = function(event) {
        debug('success!');

        var alarms = event.target.result;
        // If there are no alarms a falsey value may be returned.  We want
        // to not die and also make sure to signal we completed, so just make
        // an empty list.
        if (!alarms) {
          alarms = [];
        }

        // Find all IDs being tracked by alarms
        var expiredAlarmIds = [],
            okAlarmIntervals = {},
            uniqueAlarms = {};

        alarms.forEach(function(alarm) {
          // Only care about sync alarms.
          if (!alarm.data || !alarm.data.type || alarm.data.type !== 'sync')
            return;

          var intervalKey = 'interval' + alarm.data.interval,
              wantedAccountIds = syncData[intervalKey];

          if (!wantedAccountIds || !hasSameValues(wantedAccountIds,
                                                  alarm.data.accountIds)) {
            debug('account array mismatch, canceling existing alarm');
            expiredAlarmIds.push(alarm.id);
          } else {
            // Confirm the existing alarm is still good.
            var interval = toInterval(intervalKey),
                now = Date.now(),
                alarmTime = alarm.data.timestamp,
                accountKey = makeAccountKey(wantedAccountIds);

            // If the interval is nonzero, and there is no other alarm found
            // for that account combo, and if it is not in the past and if it
            // is not too far in the future, it is OK to keep.
            if (interval && !uniqueAlarms.hasOwnProperty(accountKey) &&
                alarmTime > now && alarmTime < now + interval) {
              debug('existing alarm is OK');
              uniqueAlarms[accountKey] = true;
              okAlarmIntervals[intervalKey] = true;
            } else {
              debug('existing alarm is out of interval range, canceling');
              expiredAlarmIds.push(alarm.id);
            }
          }
        });

        expiredAlarmIds.forEach(function(alarmId) {
          mozAlarms.remove(alarmId);
        });

        var alarmMax = 0,
            alarmCount = 0,
            self = this;

        // Called when alarms are confirmed to be set.
        function done() {
          alarmCount += 1;
          if (alarmCount < alarmMax)
            return;

          debug('ensureSync completed');
          // Indicate ensureSync has completed because the
          // back end is waiting to hear alarm was set before
          // triggering sync complete.
          self._sendMessage('syncEnsured');
        }

        Object.keys(syncData).forEach(function(intervalKey) {
          // Skip if the existing alarm is already good.
          if (okAlarmIntervals.hasOwnProperty(intervalKey))
            return;

          var interval = toInterval(intervalKey),
              accountIds = syncData[intervalKey],
              date = new Date(Date.now() + interval);

          // Do not set an timer for a 0 interval, bad things happen.
          if (!interval)
            return;

          alarmMax += 1;

          var alarmRequest = mozAlarms.add(date, 'ignoreTimezone',
                                       makeData(accountIds, interval, date));

          alarmRequest.onsuccess = function() {
            debug('success: mozAlarms.add for ' + 'IDs: ' + accountIds +
                  ' at ' + interval + 'ms');
            done();
          };

          alarmRequest.onerror = function(err) {
            console.error('cronsync-main mozAlarms.add for IDs: ' +
                          accountIds +
                          ' failed: ' + err);
          };
        });

        // If no alarms were added, indicate ensureSync is done.
        if (!alarmMax)
          done();
      }.bind(this);

      request.onerror = function(err) {
        console.error('cronsync-main ensureSync mozAlarms.getAll: error: ' +
                      err);
      };
    }
  };

  var routeRegistration = {
    name: 'cronsync',
    sendMessage: null,
    dispatch: dispatcher
  };

  return routeRegistration;
});
