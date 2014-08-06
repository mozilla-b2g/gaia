(function(exports) {
'use strict';

/**
 * Module dependencies
 */
var extend = Calendar.extend;

/**
 * Constants
 */
var defaultColor = '#F97C17',
    localCalendarId = 'local-first';

/**
 * Private state
 */
var calendarStore;

exports.calendarId = localCalendarId;

Object.defineProperty(exports, 'app', {
  set: function(value) {
    calendarStore = value.store('Calendar');
  }
});

exports.isLocal = function(account) {
  if ('providerType' in account) {
    return account.providerType === 'Local';
  }
  if ('preset' in account) {
    return account.preset === 'local';
  }
  if ('_id' in account) {
    return account._id === localCalendarId;
  }

  return false;
};

exports.getAccount = function() {
  return calendarStore.ownersOf(localCalendarId).then((owners) => {
    return owners.account;
  });
};

exports.findCalendars = function() {
  return calendarStore.ownersOf(localCalendarId).then((owners) => {
    var result = {};
    var calendar = owners.calendar;
    result[localCalendarId] = extend(calendar, exports.localCalendar());
    return result;
  });
};

exports.syncEvents = function() {
  // Obviously we cannot sync events for local calendars.
  return Promise.resolve();
};

exports.calendarCapabilities = function() {
  return Promise.resolve({
    canCreateEvent: true,
    canUpdateEvent: true,
    canDeleteEvent: true
  });
};

exports.eventCapabilities = function() {
  return exports.calendarCapabilities();
};

/**
 * Create a description for the local calendar.
 */
exports.localCalendar = function() {
  var l10n = window.navigator.mozL10n;
  var name = l10n ? l10n.get('calendar-local') : 'Offline calendar';
  return { id: localCalendarId, name: name, color: defaultColor };
};

}(Calendar.ns('Provider').local = {}));
