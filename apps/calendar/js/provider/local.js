define(function(require, exports, module) {
'use strict';

var Abstract = require('./abstract');
var core = require('core');
var localCalendarId = require('common/constants').localCalendarId;
var mutations = require('event_mutations');
var uuid = require('ext/uuid');

function Local() {
  Abstract.apply(this, arguments);

  var storeFactory = core.storeFactory;
  this.events = storeFactory.get('Event');
  this.busytimes = storeFactory.get('Busytime');
  this.alarms = storeFactory.get('Alarm');
}
module.exports = Local;

/**
 * Returns the details for the default calendars.
 */
Local.defaultCalendar = function() {
  // XXX: Make async
  var l10nId = 'calendar-local';
  var name;

  if ('mozL10n' in window.navigator) {
    name = window.navigator.mozL10n.get(l10nId);
    if (name === l10nId) {
      name = null;
    }
  }

  if (!name) {
    name = 'Offline calendar';
  }

  return {
    // XXX localize this name somewhere
    name: name,
    id: localCalendarId,
    color: Local.prototype.defaultColor
  };

};

Local.prototype = {
  __proto__: Abstract.prototype,

  canExpandRecurringEvents: false,

  getAccount: function(account, callback) {
    callback(null, {});
  },

  findCalendars: function(account, callback) {
    var list = {};
    list[localCalendarId] = Local.defaultCalendar();
    callback(null, list);
  },

  syncEvents: function(account, calendar, cb) {
    cb(null);
  },

  /**
   * @return {Calendar.EventMutations.Create} mutation object.
   */
  createEvent: function(event, callback) {
    // most providers come with their own built in
    // id system when creating a local event we need to generate
    // our own UUID.
    if (!event.remote.id) {
      // TOOD: uuid is provided by ext/uuid.js
      //       if/when platform supports a safe
      //       random number generator (values never conflict)
      //       we can use that instead of uuid.js
      event.remote.id = uuid();
    }

    var create = mutations.create({ event: event });
    create.commit(function(err) {
      if (err) {
        return callback(err);
      }

      callback(null, create.busytime, create.event);
    });

    return create;
  },

  deleteEvent: function(event, busytime, callback) {
    if (typeof(busytime) === 'function') {
      callback = busytime;
      busytime = null;
    }

    var storeFactory = core.storeFactory;
    storeFactory.get('Event').remove(event._id, callback);
  },

  /**
   * @return {Calendar.EventMutations.Update} mutation object.
   */
  updateEvent: function(event, busytime, callback) {
    if (typeof(busytime) === 'function') {
      callback = busytime;
      busytime = null;
    }

    var update = mutations.update({ event: event });
    update.commit(function(err) {
      if (err) {
        return callback(err);
      }

      callback(null, update.busytime, update.event);
    });

    return update;
  }
};

});
