Calendar.ns('Controllers').Alarm = (function() {

  var debug = Calendar.debug('alarm controller');

  function Alarm(app) {
    this.app = app;
    this.store = app.store('Alarm');
    this.settings = app.store('Setting');
  }

  Alarm.prototype = {

    displayURL: '/alarm-display/',

    observe: function() {
      var self = this;

      this._wifiLock = null;
      this.app.syncController.on('syncComplete', function() {
        if (self._wifiLock !== null) {
          self._wifiLock.unlock();
          self._wifiLock = null;
        }
      });

      this._nextPeriodicSync = this.settings.syncAlarm;

      if (this._nextPeriodicSync.alarmId === null)
        this._resetSyncAlarm(false);

      if (navigator.mozSetMessageHandler) {
        debug('set message handler');
        navigator.mozSetMessageHandler('alarm', function(msg) {
          self.handleAlarmMessage(msg);
        });
      } else {
        debug('mozSetMessageHandler is mising!');
      }

      this.settings.on('syncFrequencyChange', function() {
        self._resetSyncAlarm(false);
      });
    },

    handleAlarmMessage: function(message) {
      debug('got message', message);
      switch (message.data.type) {
        case 'sync':
          this._handleSyncMessage();
          break;
        default:
          this.handleAlarm(message.data);
      }
    },

    _sendAlarmNotification: function(alarm, event, busytime) {
      var now = new Date();

      event = new Calendar.Models.Event(event);

      var begins = Calendar.Calc.dateFromTransport(busytime.start);
      var distance = Calendar.App.dateFormat.fromNow(begins);

      // TODO: verify this is all we need to handle.
      var type = (begins > now) ? 'alarm-starting-notice' : 'alarm-started-notice';

      var title = navigator.mozL10n.get(type, {
        title: event.title,
        distance: distance
      });

      // XXX: may want to truncate this ?
      var description = event.description;
      var show = this.app.go.bind(this.app, this.displayURL + busytime._id);

      debug('send notification', title, description);

      navigator.mozApps.getSelf().onsuccess = function sendNotification(e) {
        var app = e.target.result;
        var icon = (app) ? NotificationHelper.getIconURI(app) : '';
        var notification = NotificationHelper.send(
          title,
          description,
          icon,
          function() {
            show();
            if (app)
              app.launch();
          }
        );
      };
    },

    /**
     * Given an alarm will send a notification.
     *
     * @param {Object} alarm alarm object (usually from system message).
     * @param {IDBTransaction} [trans] optional transaction.
     */
    handleAlarm: function(alarm, trans) {
      debug('got alarm', alarm);
      // a valid busytimeId will never be zero so ! is safe.
      if (!alarm._id || !alarm.busytimeId || !alarm.eventId) {
        return;
      }

      var now = new Date();
      var busytimeStore = this.app.store('Busytime');
      var eventStore = this.app.store('Event');
      var alarmStore = this.app.store('Alarm');

      var self = this;

      if (!trans) {
        trans = eventStore.db.transaction(
          ['events', 'busytimes', 'alarms']
        );
      }

      var event;
      var busytime;
      var dbAlarm;

      trans.oncomplete = function() {
        // its possible that there are no results
        // to the get operations (because events where removed)
        // we gracefully handle that by ignoring the alarm
        // when no associated records can be found.
        if (!dbAlarm || !event || !busytime) {
          debug('failed to load records', dbAlarm, event, busytime);
          return;
        }

        var endDate = Calendar.Calc.dateFromTransport(busytime.end);
        debug('trigger?', endDate, now);

        // if event has not ended yet we can send an alarm
        if (endDate > now) {
          self._sendAlarmNotification(alarm, event, busytime);
        }
      };

      alarmStore.get(alarm._id, trans, function(err, record) {
        dbAlarm = record;
      });

      eventStore.get(alarm.eventId, trans, function(err, record) {
        event = record;
      });

      busytimeStore.get(alarm.busytimeId, trans, function(err, record) {
        busytime = record;
      });
    },

    /**
     * Resets or sets the periodic sync alarm
     *
     * @param {Boolean} triggered indicates that the alarm fired.
     */
    _resetSyncAlarm: function(triggered) {
      if (this._nextPeriodicSync.alarmId) {
        navigator.mozAlarms.remove(this._nextPeriodicSync.alarmId);
        this._nextPeriodicSync.alarmId = null;
      }

      var duration = this.settings.syncFrequency;
      if (duration === null) {
        this.settings.set('syncAlarm', this._nextPeriodicSync);
        return;
      }
      duration *= 60 * 1000; // Convert minutes to milliseconds

      var start = new Date();
      var end = new Date(start.getTime() + duration);

      // We're resetting the sync alarm after a settings
      // change and times are still in range
      if (!triggered &&
          this._nextPeriodicSync.end > start &&
          this._nextPeriodicSync.start.getTime() + duration > start) {
        start = this._nextPeriodicSync.start;
        end = new Date(start.getTime() + duration);
      }

      var request = navigator.mozAlarms.add(
        end, 'ignoreTimezone', {type: 'sync'}
      );

      var self = this;
      request.onsuccess = function(e) {
        self._nextPeriodicSync.alarmId = e.target.result;
        self._nextPeriodicSync.start = start;
        self._nextPeriodicSync.end = end;
        self.settings.set('syncAlarm', self._nextPeriodicSync);
      };
      request.onerror = function(e) {
        debug('Error setting alarm:', e.target.error.name);
      };
    },

    /**
     * Handles an sync alarm firing
     */
    _handleSyncMessage: function() {
      this._wifiLock = navigator.requestWakeLock('wifi');
      this.app.syncController.all();
      this._resetSyncAlarm(true);
    }

  };

  return Alarm;

}());
