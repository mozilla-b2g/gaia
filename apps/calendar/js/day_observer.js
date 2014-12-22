define(function(require, exports) {
'use strict';

// Listen for changes on all busytimes inside a given day
// ---
// This module will listen for changes on any busytime inside a day and
// group/batch multiple add/remove events into a single emit call; making it
// easier to rerender all the busytimes at once and allowing us to use the
// same method to add/remove busytimes from the DOM, drastically simplifying
// the logic required.
// ---
// On the most common scenario there should not be that many busytimes inside
// the same day, and every time we add a new busytime to the DOM we need to
// check for "overlaps", so doing the full rerender will make a lot of sense
// and should not affect performance that much.
// ---
// Our goal is to deprecate most of the time controller logic and move to
// a simpler day-based logic for the whole calendar front-end, breaking the
// views into smaller sub-views and listening for changes on a single day
// instead of knowing how to handle months/weeks. This should increase the
// flexibility and simplify the development process A LOT.


var Calc = require('calc');
var EventEmitter2 = require('ext/eventemitter2');
var isAllDay = require('calc').isAllDay;
var debounce = require('utils/mout').debounce;

exports.DISPATCH_DELAY = 50;

// injected later to avoid circular dependencies
exports.timeController = null;

var cachedRecords = {};
var debouncedEmit = {};
// emitter is exposed to make testing/mocking easier
var emitter = exports.emitter = new EventEmitter2();

exports.on = function(date, callback) {
  var dayId = Calc.getDayId(date);
  var hasListeners = !!emitter.listeners(dayId).length;
  emitter.on(dayId, callback);

  if (!hasListeners) {
    // make sure the dispatch doesn't happen too often during sync, we also
    // only add a single listener for each day to the time controller since
    // we need to group/batch the event dispatches and the time controller
    // will dispatch "add/remove" events for each busy time.
    var dispatch = debouncedEmit[dayId] = debounce(
      emit.bind(null, dayId),
      exports.DISPATCH_DELAY
    );
    exports.timeController.observeTime(Calc.spanOfDay(date), dispatch);
    // we need to trigger callbacks to re-render the views if needed,
    // cachedRecords is only built after first dispatch
    // FIXME: we need to somehow know if first expansion already happened on
    // app startup (otherwise we might get into a race condition where it
    // queries the cache before it's built) for now I just increased the delay
    dispatch();
  } else if (dayId in cachedRecords) {
    // if it is not the first listener and we have some records in memory we
    // should also call the callback
    callback(cachedRecords[dayId]);
  }
};

exports.off = function(date, callback) {
  var dayId = Calc.getDayId(date);
  emitter.off(dayId, callback);

  var listeners = emitter.listeners(dayId);
  if (!listeners || !listeners.length) {
    stopListening(dayId);
  }
};

function stopListening(dayId) {
  if (!debouncedEmit[dayId]) {
    return;
  }
  var date = Calc.dateFromId(dayId);
  exports.timeController.removeTimeObserver(
    Calc.spanOfDay(date),
    debouncedEmit[dayId]
  );
  // we need to cancel the dispatch otherwise we might trigger a db query
  // without need (causes error on unit tests)
  debouncedEmit[dayId].cancel();
  delete debouncedEmit[dayId];
  delete cachedRecords[dayId];
}

exports.removeAllListeners = function() {
  emitter.removeAllListeners();
  Object.keys(debouncedEmit).forEach(stopListening);
};

function emit(dayId) {
  // date objects are mutable, so it's safer to convert it back based
  // on the day id that was initially generated
  var date = Calc.dateFromId(dayId);
  var busytimes = getBusytimes(date);
  exports.timeController.findAssociated(busytimes, (err, records) => {
    var allday = [];
    var events = [];

    records.forEach(record => {
      var {startDate, endDate} = record.busytime;
      var group = isAllDay(date, startDate, endDate) ? allday : events;
      group.push(record);
    });

    events.sort((a, b) => {
      return a.busytime.startDate - b.busytime.startDate;
    });

    var result = {
      amount: records.length,
      events: events,
      allday: allday
    };
    emitter.emit(dayId, result);
    cachedRecords[dayId] = result;
  });
}

function getBusytimes(date) {
  var timespan = Calc.spanOfDay(date);
  return exports.timeController.queryCache(timespan);
}

});
