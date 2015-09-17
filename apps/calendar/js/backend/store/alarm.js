define(function(require, exports, module) {
'use strict';

var Abstract = require('./abstract');
var Calc = require('common/calc');
var createDOMPromise = require('common/create_dom_promise');
var core = require('core');
var debug = require('common/debug')('store/alarm');
var denodeifyAll = require('common/promise').denodeifyAll;
var object = require('common/object');

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
  Abstract.apply(this, arguments);
  this._processQueue = this._processQueue.bind(this);

  denodeifyAll(this, [
    'findAllByBusytimeId',
    'workQueue'
  ]);
}
module.exports = Alarm;

Alarm.prototype = {
  __proto__: Abstract.prototype,

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
    var data = Abstract.prototype._objectData.call(this, object);
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
    if (!this.autoQueue) {
      return;
    }

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

    var request = core.db
      .transaction('alarms', 'readwrite')
      .objectStore('alarms')
      .index('trigger')
      .openCursor();

    request.onerror = function() {
      callback(new Error('Alarm cursor failed to open.'));
    };

    var past = [];  // Alarms that should be fired immediately.
    var future = [];  // Alarms that should fire in the future.
    request.onsuccess = function(event) {
      var cursor = event.target.result;
      if (!cursor ||
          (cursor.key >= minimum && (!requiresAlarm || future.length))) {
        // We've pulled all (or at least enough) alarms into memory.
        // Now we can send them to the notifications controller
        // or the alarms api.
        return dispatchAlarms(past, future)
        .then(callback)
        .catch(error => debug('Error dispatching alarms:', error));
      }

      var record = cursor.value;
      var date = Calc.dateFromTransport(record.trigger);
      var bucket = date < Date.now() ? past : future;
      bucket.push(record);
      // We need to save the trigger time so that we can send the
      // appropriate time to the alarms api. However, we want to mark
      // that we've handled this alarm so delete the trigger prop.
      record.triggered = record.trigger;
      delete record.trigger;
      cursor.update(record);
      cursor.continue();
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
      trans = core.db.transaction(this._dependentStores);
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

function dispatchAlarms(past, future) {
  // If the alarm was meant to be triggered in the past,
  // we want to immediately issue a notification.
  // However, in bug 857284 we add the stipulation that
  // we shouldn't issue duplicates, so handle that here also.
  var eventToAlarm = {};
  past.forEach(alarm => {
    var event = alarm.eventId;
    if (!event || event in eventToAlarm) {
      return;
    }

    eventToAlarm[event] = alarm;
  });

  object.forEach(eventToAlarm, (event, alarm) => {
    core.service.broadcast('alarm', alarm);
  });

  // If the alarm should be triggered in the future, then we can create an
  // entry in the alarms api to wake us up to issue a notification for it
  // at the appropriate time.
  var alarms = navigator.mozAlarms;
  return Promise.all(future.map(alarm => {
    var timezone = alarm.triggered.tzid === Calc.FLOATING ?
      'ignoreTimezone' :
      'honorTimezone';
    return createDOMPromise(
      alarms.add(
        Calc.dateFromTransport(alarm.triggered),
        timezone,
        alarm
      )
    );
  }));
}

});
