Calendar.ns('Store').Alarm = (function() {

  var Calc = Calendar.Calc;

  var _super = Calendar.Store.Abstract.prototype;

  var debug = Calendar.debug('alarm store');

  /**
   * The alarm store can be thought of as a big queue.
   * Over time we add and remove alarm times related to
   * a specific busytime/event instance.
   * (and there could be multiple alarms per busytime/event).
   *
   * When `workQueue` is called records will be removed
   * from the queue (this object store) and added (via mozAlarms).
   */
  function Alarm() {
    Calendar.Store.Abstract.apply(this, arguments);
    this._processQueue = this._processQueue.bind(this);
  }

  Alarm.prototype = {
    __proto__: _super,

    _store: 'alarms',

    _dependentStores: ['alarms'],

    /**
     * Number of hours ahead of current time to add new alarms.
     *
     * @type Numeric
     */
    _alarmAddThresholdHours: 48,

    /** disable caching */
    _addToCache: function() {},
    _removeFromCache: function() {},

    /**
     * When false will not process queue automatically
     * (that is after each alarm transaction is complete).
     *
     * @type {Boolean}
     */
    autoQueue: false,

    _processQueue: function() {
      this.workQueue();
    },

    _objectData: function(object) {
      var data = _super._objectData.call(this, object);
      if (data.startDate) {
        // ensure the pending trigger is always in sync
        // with the current trigger whenever we update
        // the model.
        data.trigger = data.startDate;
      }

      return data;
    },

    /**
     * Manage the queue when alarms are added.
     */
    _addDependents: function(obj, trans) {
      if (!this.autoQueue)
        return;

      // by using processQueue even if we added
      // 6000 alarms during a single transaction we only
      // receive the event once as addEventListener discards
      // duplicates.
      trans.addEventListener('complete', this._processQueue);
    },

    /**
     * Move alarms over to the alarm api's database.
     *
     *
     * @param {Date} now date to use as current time.
     *
     * @param {Boolean} requiresAlarm attempts to ensure at
     *                                lest one alarm is added.
     *
     * @param {Function} callback node style callback.
     */
    _moveAlarms: function(now, requiresAlarm, callback) {
      // use transport dates so we can handle timezones & floating time.
      var time = Calc.dateToTransport(now);
      var utc = time.utc;

      // keep adding events until we are beyond this time.
      var minimum = utc + (this._alarmAddThresholdHours * Calc.HOUR);

      // queue logic
      var pending = 0;
      var isComplete = false;

      // TODO: right now we plan to ignore the alarms
      // of removed busytimes or events in the future
      // we may want to store this id and use it to remove
      // the actual alarm.
      function handleAlarmSuccess(id) {
        debug('successfully added alarm', id);
        // decrement pending and check if isComplete
        if (!(--pending) && isComplete) {
          callback();
        }
      }

      function handleAlarmError(e) {
        debug('error adding alarm', e.target.error.name, e.target.error);
        // decrement pending and check if isComplete
        if (!(--pending) && isComplete) {
          callback();
        }
      }

      // XXX: sad we need to use Calendar.App here...
      var controller = Calendar.App.alarmController;

      function addAlarm(data) {
        var date = Calc.dateFromTransport(data.trigger);

        // if trigger is in the past we need to send
        // the data directly to the controller not to mozAlarms.
        if (date < new Date()) {
          return controller.handleAlarm(data);
        }

        pending++;

        // see: https://wiki.mozilla.org/WebAPI/AlarmAPI
        // by default we use absolute time
        var type = 'honorTimezone';

        if (data.trigger.tzid === Calc.FLOATING) {
          type = 'ignoreTimezone';
        }


        debug('mozAlarm:', date, type, data);

        var req = navigator.mozAlarms.add(date, type, data);

        if (callback) {
          req.onsuccess = handleAlarmSuccess;
          req.onerror = handleAlarmError;
        }
      }

      // 2. open cursor
      var trans = this.db.transaction('alarms', 'readwrite');
      var store = trans.objectStore('alarms');
      var index = store.index('trigger');
      var req = index.openCursor();

      req.onerror = function() {
        var msg = 'Alarm cursor failed to open';
        callback(new Error(msg));
      };

      var addedFutureAlarm = false;

      req.onsuccess = function(event) {
        var cursor = event.target.result;

        // keep going until cursor is done or minimum is met
        if (cursor && ((cursor.key < minimum) ||
            (requiresAlarm && !addedFutureAlarm))) {

          if (cursor.key > utc) {
            addedFutureAlarm = true;
          }

          var record = cursor.value;
          addAlarm(record);
          delete record.trigger;

          cursor.update(record);
          cursor.continue();
        } else {
          isComplete = true;
          if (!pending) {
            callback();
          }
        }
      };
    },

    /**
     * Finds single alarm by busytime id.
     *
     * @param {Object} related busytime object.
     * @param {IDBTransaction} [trans] optional transaction.
     * @param {Function} callback node style [err, records].
     */
    findAllByBusytimeId: function(busytimeId, trans, callback) {
      if (typeof(trans) === 'function') {
        callback = trans;
        trans = null;
      }

      if (!trans) {
        trans = this.db.transaction(this._dependentStores);
      }

      var store = trans.objectStore(this._store);
      var index = store.index('busytimeId');
      var key = IDBKeyRange.only(busytimeId);

      index.mozGetAll(key).onsuccess = function(e) {
        callback(null, e.target.result);
      };
    },

    /**
     * Works queue putting alarms into the alarm api database where needed.
     *
     */
    workQueue: function(now, callback) {
      if (typeof(now) === 'function') {
        callback = now;
        now = null;
      }

      now = now || new Date();
      var alarms = navigator.mozAlarms;

      if (!alarms) {
        if (callback) {
          callback(null);
        }

        return;
      }

      var self = this;
      var requiresAlarm = false;

      /**
       * Why are we getting all alarms here?
       *
       * The alarms are designed to keep the total number
       * of entires (in mozAlarms) down but we should keep at
       * minimum one active at all times. For example if the user
       * has sync turned off and wants notifications we need
       * to have an alarm go off to trigger adding more alarms.
       */
      var req = alarms.getAll();

      //XXX: even with the good reasons above we need
      //     to justify the perf cost here later.
      req.onsuccess = function(e) {
        var data = e.target.result;
        var len = data.length;
        var mozAlarm;

        requiresAlarm = true;

        for (var i = 0; i < len; i++) {
          mozAlarm = data[i].data;
          if (
            mozAlarm &&
            'eventId' in mozAlarm &&
            'trigger' in mozAlarm
          ) {
            requiresAlarm = false;
            break;
          }
        }

        callback = callback || function() {};
        self._moveAlarms(
          now,
          requiresAlarm,
          callback
        );
      };

      req.onerror = function() {
        var msg = 'failed to get alarms';
        console.error('CALENDAR:', msg);

        if (callback) {
          callback(new Error(msg));
        }
      };

    }

  };

  return Alarm;

}());
