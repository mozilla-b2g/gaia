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
// It's way simpler to use a day-based logic for the whole calendar front-end,
// instead of knowing how to handle months/weeks.

var Calc = require('calc');
var EventEmitter2 = require('ext/eventemitter2');
var binsearch = require('binsearch');
var compare = require('compare');
var daysBetween = Calc.daysBetween;
var debounce = require('utils/mout').debounce;
var getDayId = Calc.getDayId;
var isAllDay = Calc.isAllDay;
var spanOfMonth = Calc.spanOfMonth;

// make sure we only trigger a single emit for multiple consecutive changes
var DISPATCH_DELAY = 25;

// maximum amount of months to keep in the cache
var MAX_CACHED_MONTHS = 5;

// stores busytimes by Id
// {key:id, value:Busytime}
var busytimes = new Map();

// stores events by Id
// {key:id, value:Event}
var events = new Map();

// relationships between event Ids and busytimes Ids
// {key:eventId, value:Array<busytimeId>}
var eventsToBusytimes = new Map();

// cache a reference to all busytime+event data for the days based on the dayId
// {key:dayId, value:DayRecords}
var cache = new Map();

// stores the days IDs that changed since last dispatch
var dayQueue = new Set();

// stores the timespans for all the cached months
var cachedSpans = [];

// we lock the cache pruning during sync
var cacheLocked = false;

// emitter exposed because of unit tests
var emitter = exports.emitter = new EventEmitter2();

// TODO: convert these dependencies into static modules to avoid ugly injection
// injected later to avoid circular dependencies
exports.busytimeStore = null;
exports.calendarStore = null;
exports.eventStore = null;
exports.syncController = null;
exports.timeController = null;

exports.init = function() {
  // both "change" and "add" operations triggers a "persist" event
  this.eventStore.on('persist', (id, event) => cacheEvent(event));
  this.eventStore.on('remove', removeEventById);

  this.busytimeStore.on('persist', (id, busy) => cacheBusytime(busy));
  this.busytimeStore.on('remove', removeBusytimeById);

  this.syncController.on('syncStart', () => {
    cacheLocked = true;
  });
  this.syncController.on('syncComplete', () => {
    cacheLocked = false;
    pruneCache();
    dispatch();
  });

  this.calendarStore.on('calendarVisibilityChange', (id, calendar) => {
    var type = calendar.localDisplayed ? 'add' : 'remove';
    busytimes.forEach((busy, busyId) => {
      if (busy.calendarId === id) {
        registerBusytimeChange(busyId, type);
      }
    });
  });

  this.timeController.on('monthChange', loadMonth);

  // make sure loadMonth is called during setup if 'monthChange' was dispatched
  // before we added the listener
  var month = this.timeController.month;
  if (month) {
    loadMonth(month);
  }
};

exports.on = function(date, callback) {
  var dayId = getDayId(date);
  // important to trigger the callback to avoid getting into weird states when
  // busytimes are loaded while views are not listening for changes
  callback(getDay(dayId, date));
  emitter.on(dayId, callback);
};

function getDay(dayId, date) {
  if (cache.has(dayId)) {
    return cache.get(dayId);
  }

  var day = {
    dayId: dayId,
    date: date,
    amount: 0,
    basic: [],
    allday: []
  };
  cache.set(dayId, day);

  return day;
}

exports.off = function(date, callback) {
  emitter.off(getDayId(date), callback);
};

exports.removeAllListeners = function() {
  emitter.removeAllListeners();
};

// findAssociated is not on the Event/Busytime store so that it can get the
// cache data and show the event details faster on the most common cases
exports.findAssociated = function(busytimeId) {
  return queryBusytime(busytimeId).then(busytime => {
    return queryEvent(busytime.eventId).then(event => {
      return {
        busytime: busytime,
        event: event
      };
    });
  });
};

function queryBusytime(busytimeId) {
  if (busytimes.has(busytimeId)) {
    return Promise.resolve(busytimes.get(busytimeId));
  }
  return exports.busytimeStore.get(busytimeId);
}

function queryEvent(eventId) {
  if (events.has(eventId)) {
    return Promise.resolve(events.get(eventId));
  }
  return exports.eventStore.get(eventId);
}

function cacheBusytime(busy) {
  var {_id, startDate, endDate, eventId} = busy;

  if (outsideSpans(startDate) && outsideSpans(endDate)) {
    // ignore busytimes outside the cached spans
    return;
  }

  busytimes.set(_id, busy);
  eventsToBusytimes.get(eventId).push(_id);
  registerBusytimeChange(_id);
}

function removeBusytimeById(id) {
  var busy = busytimes.get(id);
  if (!busy) {
    // when removing all the data from the calendar the busytime might not be
    // on the cache but still emit a "remove" event
    return;
  }

  var eventId = busy.eventId;
  var ids = eventsToBusytimes.get(eventId).filter(i => i !== id);
  eventsToBusytimes.set(eventId, ids);
  removeEventIfNoBusytimes(ids, eventId);

  registerBusytimeChange(id, 'remove');
  busytimes.delete(id);
}

function cacheEvent(event) {
  var id = event._id;
  events.set(id, event);
  if (!eventsToBusytimes.has(id)) {
    eventsToBusytimes.set(id, []);
  }
}

function removeEventById(id) {
  events.delete(id);
  // busytimeStore will emit a 'remove' event for each busytime, so no need to
  // handle it here; we simply remove the "join table"
  eventsToBusytimes.delete(id);
}

// every time an event/calendar/busytime changes we need to trigger a change
// event and notify all the views that are listening to that specific date
function registerBusytimeChange(id, type) {
  var busy = busytimes.get(id);
  var {startDate, endDate} = busy;

  // subtract 1 millisecond because allday events ends at 00:00:00 of next day,
  // which would include one day more than expected for daysBetween
  var end = new Date(endDate.getTime() - 1);

  // events from hidden calendars should not be displayed
  var isRemove = type === 'remove' ||
    !exports.calendarStore.shouldDisplayCalendar(busy.calendarId);

  daysBetween(startDate, end).forEach(date => {
    if (outsideSpans(date)) {
      // ignore dates outside the cached spans
      return;
    }

    var dayId = getDayId(date);

    if (isRemove && !cache.has(dayId)) {
      return;
    }

    var day = getDay(dayId, date);

    // it should always override the old data
    day.basic = day.basic.filter(r => r.busytime._id !== id);
    day.allday = day.allday.filter(r => r.busytime._id !== id);

    if (!isRemove) {
      var group = isAllDay(date, startDate, endDate) ?
        day.allday :
        day.basic;
      sortedInsert(group, busy);
    }

    day.amount = day.basic.length + day.allday.length;

    dayQueue.add(dayId);
  });

  dispatch();
}

function sortedInsert(group, busy) {
  var index = binsearch.insert(group, busy.startDate, (date, record) => {
    return compare(date, record.busytime.startDate);
  });
  var event = events.get(busy.eventId);
  group.splice(index, 0, {
    event: event,
    busytime: busy,
    color: exports.calendarStore.getColorByCalendarId(event.calendarId)
  });
}

// debounce will make sure that we only trigger one "change" event per day even
// if we have multiple changes happening in a row
var dispatch = debounce(function() {
  dayQueue.forEach(id => {
    // need to remove ID from queue before dispatching event to avoid race
    // conditions (eg. handler triggering a new queue+dispatch)
    dayQueue.delete(id);
    // dispatch is async so there is a small chance data isn't cached anymore
    if (cache.has(id)) {
      emitter.emit(id, cache.get(id));
    }
  });
}, DISPATCH_DELAY);

function loadMonth(newMonth) {
  var span = spanOfMonth(newMonth);

  // ensure we load the minimum amount of busytimes possible
  var toLoad = span;
  cachedSpans.every(cached => toLoad = cached.trimOverlap(toLoad));

  if (!toLoad) {
    // already loaded all the busytimes
    return;
  }

  // cache the whole month instead of `toLoad` because we purge whole months
  cachedSpans.push(span);

  exports.busytimeStore.loadSpan(toLoad, onBusytimeSpanLoad);
}

function onBusytimeSpanLoad(err, busytimes) {
  if (err) {
    console.error('Error loading Busytimes from TimeSpan:', err.toString());
    return;
  }

  // remove duplicates and avoid loading events that are already cached
  var eventIds = Array.from(new Set(
    busytimes.map(b => b.eventId).filter(id => !events.has(id))
  ));

  exports.eventStore.findByIds(eventIds).then(events => {
    // it's very important to cache the events before the busytimes otherwise
    // the records won't contain the event data
    Object.keys(events).forEach(key => cacheEvent(events[key]));
    busytimes.forEach(cacheBusytime);

    pruneCache();
  });
}

function pruneCache() {
  if (cacheLocked) {
    return;
  }

  trimCachedSpans();
  cache.forEach(removeDayFromCacheIfOutsideSpans);
  eventsToBusytimes.forEach(removeEventIfNoBusytimes);
}

function trimCachedSpans() {
  while (cachedSpans.length > MAX_CACHED_MONTHS) {
    // since most changes are sequential, remove the timespans that are further
    // away from the current month
    var baseDate = exports.timeController.month;
    var maxDiff = 0;
    var maxDiffIndex = 0;
    cachedSpans.forEach((span, i) => {
      var diff = Math.abs(span.start - baseDate);
      if (diff > maxDiff) {
        maxDiff = diff;
        maxDiffIndex = i;
      }
    });
    cachedSpans.splice(maxDiffIndex, 1);
  }
}

function removeDayFromCacheIfOutsideSpans(day, id) {
  if (outsideSpans(day.date)) {
    day.basic.forEach(removeRecordIfOutsideSpans);
    day.allday.forEach(removeRecordIfOutsideSpans);
    cache.delete(id);
  }
}

function outsideSpans(date) {
  return !cachedSpans.some(timespan => timespan.contains(date));
}

function removeRecordIfOutsideSpans(record) {
  removeBusytimeIfOutsideSpans(record.busytime);
}

function removeBusytimeIfOutsideSpans(busytime) {
  var {_id, startDate, endDate} = busytime;
  if (outsideSpans(startDate) && outsideSpans(endDate)) {
    removeBusytimeById(_id);
  }
}

function removeEventIfNoBusytimes(ids, eventId) {
  if (!ids.length) {
    removeEventById(eventId);
  }
}

});
