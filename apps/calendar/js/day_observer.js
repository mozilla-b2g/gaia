/*global EventEmitter2*/
(function(exports){
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

/**
 * Constants
 */
exports.DISPATCH_DELAY = 50;

/**
 * Module dependencies
 */
var Calc = Calendar.Calc;
var debounce = Calendar.Utils.mout.debounce;
// injected later to avoid circular dependencies
exports.timeController = null;

/**
 * Module state
 */
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

    // if there is some busytime cached on the time controller we dispatch
    // an update to all the listeners
    var busytimes = getBusytimes(date);
    if (busytimes.length) {
      dispatch();
    }
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
  var date = Calc.dateFromId(dayId);
  exports.timeController.removeTimeObserver(
    Calc.spanOfDay(date),
    debouncedEmit[dayId]
  );
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
    emitter.emit(dayId, records);
    cachedRecords[dayId] = records;
  });
}

function getBusytimes(date) {
  var timespan = Calc.spanOfDay(date);
  return exports.timeController.queryCache(timespan);
}

}(Calendar.dayObserver = {}));
