define(function(require, exports, module) {
  'use strict';

  /**
   * Alarm represents one alarm instance. It tracks any mozAlarms it
   * has registered, its IndexedDB ID, and any other properties
   * relating to the alarm's schedule and firing options.
   */
  function Alarm(opts) {
    opts = opts || {};
    var now = new Date();
    var defaults = {
      id: null,
      registeredAlarms: {}, // keys: ('normal' or 'snooze') => mozAlarmID
      // Map of weekdays { "0": true, "1": false, ... }
      // "0" is for Sunday in Gregorian calendar
      repeat: {},
      hour: now.getHours(),
      minute: now.getMinutes(),
      label: '',
      sound: 'ac_awake.opus',
      vibrate: true,
      snooze: 10 // Number of minutes to snooze
    };

    for (var key in defaults) {
      this[key] = (key in opts ? opts[key] : defaults[key]);
    }
  }

  Alarm.prototype = {
    toJSON: function() {
      return {
        id: this.id,
        registeredAlarms: this.registeredAlarms,
        repeat: this.repeat,
        hour: this.hour,
        minute: this.minute,
        label: this.label,
        sound: this.sound,
        vibrate: this.vibrate,
        snooze: this.snooze
      };
    },

    /**
     * An alarm is enabled if and only if it has a registeredAlarm set
     * with a type of 'normal'. To disable an alarm, any
     * registeredAlarms are unregistered with mozAlarms and removed
     * from this.registeredAlarms.
     */
    isEnabled: function() {
      for (var i in this.registeredAlarms) {
        // Both 'normal' and 'snooze' registered alarms should be
        // treated as enabled, because the alarm will imminently fire.
        if (i === 'normal' || i === 'snooze') {
          return true;
        }
      }
      return false;
    },

    isRepeating: function() {
      for (var key in this.repeat) {
        if (this.repeat[key]) {
          return true;
        }
      }
      return false;
    },

    getNextAlarmFireTime: function(relativeTo) {
      var now = relativeTo || new Date();
      var nextFire = new Date(now.getTime());
      nextFire.setHours(this.hour, this.minute, 0, 0);

      while (nextFire <= now ||
             (this.isRepeating() &&
              !this.repeat[nextFire.getDay().toString()])) {
        nextFire.setDate(nextFire.getDate() + 1);
      }
      return nextFire;
    },

    getNextSnoozeFireTime: function(relativeTo) {
      var now = relativeTo || new Date();
      return new Date(now.getTime() + this.snooze * 60 * 1000);
    },

    /**
     * Schedule an alarm to ring in the future.
     *
     * @return {Promise}
     * @param {'normal'|'snooze'} type
     */
    schedule: function(type) {
      var alarmDatabase = require('alarm_database'); // circular dependency

      var firedate, promise;
      if (type === 'normal') {
        promise = this.cancel(); // Cancel both snooze and regular mozAlarms.
        firedate = this.getNextAlarmFireTime();
      } else if (type === 'snooze') {
        promise = this.cancel('snooze'); // Cancel any snooze mozAlarms.
        firedate = this.getNextSnoozeFireTime();
      } else {
        return Promise.reject('Invalid type for Alarm.schedule().');
      }

      // Save the alarm to the database first. This ensures we have a
      // valid ID, and that we've saved any modified properties before
      // attempting to schedule the alarm.
      return promise.then(() => alarmDatabase.put(this)).then(() => {
        return new Promise((resolve, reject) => {
          // Then, schedule the alarm.
          var req = navigator.mozAlarms.add(firedate, 'ignoreTimezone',
                                            { id: this.id, type: type });
          req.onerror = reject;
          req.onsuccess = (evt) => {
            this.registeredAlarms[type] = evt.target.result;
            resolve();
          };
        });
        // After scheduling the alarm, this.registeredAlarms has
        // changed, so we must save that too.
      }).then(() => alarmDatabase.put(this))
        .then(() => {
          this._notifyChanged();
        }).catch((e) => {
          console.log('Alarm scheduling error: ' + e.toString());
          throw e;
        });
    },

    /**
     * Cancel an alarm. If `type` is provided, cancel only that type
     * ('normal' or 'snooze'). Returns a Promise.
     */
    cancel: function(/* optional */ type) {
      var types = (type ? [type] : Object.keys(this.registeredAlarms));
      var alarmDatabase = require('alarm_database'); // circular dependency
      types.forEach((type) => {
        var id = this.registeredAlarms[type];
        navigator.mozAlarms.remove(id);
        delete this.registeredAlarms[type];
      });
      return alarmDatabase.put(this).then(() => {
        this._notifyChanged();
      }).catch((e) => {
        console.log('Alarm cancel error: ' + e.toString());
        throw e;
      });
    },

    _notifyChanged: function(removed) {
      // Only update the application if this alarm was actually saved
      // (i.e. it has an ID).
      if (this.id) {
        var self = this,
            alarmDatabase = require('alarm_database');
        // Updating Alarm info in the DataStore
        var storeAlarms = [];
        alarmDatabase.getAll().then((alarms) => {
          // Logging in a loop to ensure we don't overrun the line buffer:
          var now = new Date();
          function addZero(i) {
            if(typeof i == "String") {
              i = parseInt(i);
            }
            if (i < 10) {
              i = "0" + i;
            }
            return i + "";
          }
          alarms.forEach(function(a) {
            // Grabbing alarms that are 'normal'
            if(a.registeredAlarms.normal) {
              //Check for Repeated Alarms
              if(Object.keys(a.repeat).length != 0) {
                var hasToBePushed = false;
                for (var n in a.repeat) {
                  var day = n;
                  if(now.getDay() == 6 && n < 6) {
                    day = 7 + parseInt(n);
                  }
                  if(day == now.getDay() || day == now.getDay() + 1) {
                    if(day == now.getDay()) {
                      if(now.getHours() + ":" + now.getMinutes() <
                         addZero(a.hour) + ":" + addZero(a.minute)) {
                        hasToBePushed = true;
                      }
                    } else {
                      hasToBePushed = true;
                    }
                  }
                }
                if(hasToBePushed) {
                  storeAlarms.push(a);
                }
              }
              else {
                storeAlarms.push(a);
              }
            }
          });
          storeAlarms = self.sortAlarms(storeAlarms);

          // append info to datastore
          navigator.getDataStores('alarms')
          .then( function(stores) {
            stores[0].getLength()
            .then(function(len) {
              if(len == 0) {
                stores[0].add({
                  'data': storeAlarms
                }).then(function(id){
                  // Successfull Adding of alarms to data store
                  console.log("[Clock] ======= Added Alarm on LockScreen ======");
                })
              }
              else {
                stores[0].put({
                  'data': storeAlarms
                }, 1)
                .then(function(id){
                  // Successfull Updating of alarms to data store
                  console.log("[Clock] ======= Updated Alarm on LockScreen ======");
                })
              }
            });
          });
        });

        window.dispatchEvent(
          new CustomEvent(removed ? 'alarm-removed' : 'alarm-changed', {
            detail: { alarm: this }
          })
        );
      }
    },

    /**
     * Delete an alarm completely from the database, canceling any
     * pending scheduled mozAlarms.
     */
    delete: function() {
      var alarmDatabase = require('alarm_database'); // circular dependency
      return this.cancel().then(() => {
        return alarmDatabase.delete(this.id).then(() => {
          this._notifyChanged(/* removed = */ true);
        });
      });
    },

    /** Sort all the alarms and return the next upcoming
     *  alarm from the list
     */
    sortAlarms: function(storeAlarms) {
      storeAlarms.sort(function(a,b) {
        return new Date('1970/01/01 '+a.hour+':'+a.minute)
          - new Date('1970/01/01 ' + b.hour+':'+b.minute);
      });
      var before = [],
          after = [],
          now = new Date();
      function addZero(i) {
        if(typeof i == "String") {
          i = parseInt(i);
        }
        if (i < 10) {
          i = "0" + i;
        }
        return i + "";
      }

      storeAlarms.forEach(function(alarmInfo,b){
        if( addZero(now.getHours()) + ':' + addZero(now.getMinutes())
           <= addZero(alarmInfo.hour) + ':' + addZero(alarmInfo.minute)) {
          after.push({
            hour: alarmInfo.hour,
            minute: alarmInfo.minute
          });
        }
        else {
          before.push({
            hour: alarmInfo.hour,
            minute: alarmInfo.minute
          });
        }
      });

      storeAlarms = after;
      before.forEach(function(alarmInfo,b) {
        storeAlarms.push(alarmInfo);
      });

      if(storeAlarms.length > 0) {
        return storeAlarms[0];
      }
      else {
        return {};
      }
    }

  };


  module.exports = Alarm;

});
