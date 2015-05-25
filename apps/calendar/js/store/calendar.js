define(function(require, exports, module) {
'use strict';

var Abstract = require('./abstract');
var CalendarModel = require('models/calendar');
var Local = require('provider/local');
var core = require('core');
var denodeifyAll = require('common/promise').denodeifyAll;
var probablyParseInt = require('common/probably_parse_int');

function Store() {
  Abstract.apply(this, arguments);
  this._usedColors = [];

  denodeifyAll(this, [
    'markWithError',
    'remotesByAccount',
    'sync',
    'providerFor',
    'ownersOf'
  ]);
}
module.exports = Store;

/**
 * Remote calendar colors
 */
Store.REMOTE_COLORS = [
  '#00aacc', // light blue
  '#bad600', // light green
  '#df4784', // pink
  '#f9bc17', // yellow
  '#0766b7', // dark blue
  '#76a408', // dark green
  '#33a185'  // teal
];

/**
 * Local calendar color (orange)
 */
Store.LOCAL_COLOR = '#f97c17',

/**
 * List of possible calendar capabilities.
 */
Store.capabilities = {
  createEvent: 'canCreateEvent',
  updateEvent: 'canUpdateEvent',
  deleteEvent: 'canDeleteEvent'
};

Store.prototype = {
  __proto__: Abstract.prototype,

  _store: 'calendars',

  _dependentStores: [
    'calendars', 'events', 'busytimes',
    'alarms', 'icalComponents'
  ],

  _parseId: probablyParseInt,

  _createModel: function(obj, id) {
    if (!(obj instanceof CalendarModel)) {
      obj = new CalendarModel(obj);
    }

    if (typeof(id) !== 'undefined') {
      obj._id = id;
    }

    return obj;
  },

  _removeDependents: function(id, trans) {
    var store = core.storeFactory.get('Event');
    store.removeByIndex('calendarId', id, trans);
  },

  /**
   * Marks a given calendar with an error.
   *
   * Emits a 'error' event immediately.. This method is typically
   * triggered by an account wide error.
   *
   *
   * @param {Object} calendar model.
   * @param {Calendar.Error} error for given calendar.
   * @param {IDBTransaction} transaction optional.
   * @param {Function} callback fired when model is saved [err, id, model].
   */
  markWithError: function(calendar, error, trans, callback) {
    if (typeof(trans) === 'function') {
      callback = trans;
      trans = null;
    }

    if (!calendar._id) {
      throw new Error('given calendar must be persisted.');
    }

    calendar.error = {
      name: error.name,
      date: new Date()
    };

    this.persist(calendar, trans, callback);
  },

  persist: function(calendar, trans, callback) {
    if (typeof(trans) === 'function') {
      callback = trans;
      trans = undefined;
    }

    this._updateCalendarColor(calendar);

    var cb = callback;
    var cached = this._cached[calendar._id];

    if (cached && cached.localDisplayed !== calendar.localDisplayed) {
      cb = function(err, id, model) {
        this.emit('calendarVisibilityChange', id, model);
        callback(err, id, model);
      }.bind(this);
    }

    Abstract.prototype.persist.call(this, calendar, trans, cb);
  },

  remove: function(id, trans, callback) {
    this._removeCalendarColorFromCache(id);
    Abstract.prototype.remove.apply(this, arguments);
  },

  _clearCache: function() {
    Abstract.prototype._clearCache.call(this);
    this._usedColors = [];
  },

  _updateCalendarColor: function(calendar) {
    // we avoid storing multiple colors for same calendar in case of an
    // "update" operation
    this._removeCalendarColorFromCache(calendar._id);
    this._setCalendarColor(calendar);
    // cache is built asynchronously, we need to store the color as soon as
    // possible to avoid adding same color multiple times in a row (eg.
    // account with multiple calendars will call persist multiple times)
    this._usedColors.push(calendar.color);
  },

  _removeCalendarColorFromCache: function(id) {
    // we need to remove the color from index as soon as possible to avoid
    // race conditions (remove is async)
    var color = this.getColorByCalendarId(id);
    var index = this._usedColors.indexOf(color);
    if (index !== -1) {
      this._usedColors.splice(index, 1);
    }
  },

  getColorByCalendarId: function(id) {
    return this._cached[id] && this._cached[id].color;
  },

  _setCalendarColor: function(calendar) {
    // local calendar should always use the same color
    if (calendar._id === Local.calendarId) {
      calendar.color = Store.LOCAL_COLOR;
      return;
    }

    // restore previous color only if it is part of the palette, otherwise we
    // get the next available color (or least used)
    var prevColor = this.getColorByCalendarId(calendar._id);
    if (prevColor && Store.REMOTE_COLORS.indexOf(prevColor) !== -1) {
      calendar.color = prevColor;
    } else {
      calendar.color = this._getNextColor();
    }
  },

  _getNextColor: function() {
    var available = Store.REMOTE_COLORS.filter(function(color) {
      return this._usedColors.indexOf(color) === -1;
    }, this);

    return available.length ? available[0] : this._getLeastUsedColor();
  },

  _getLeastUsedColor: function() {
    var counter = {};
    this._usedColors.forEach(function(color) {
      counter[color] = (counter[color] || 0) + 1;
    });

    var leastUsedColor;
    var leastUsedCount = Infinity;
    for (var color in counter) {
      if (counter[color] < leastUsedCount) {
        leastUsedCount = counter[color];
        leastUsedColor = color;
      }
    }

    return leastUsedColor;
  },

  shouldDisplayCalendar: function(calendarId) {
    var calendar = this._cached[calendarId];
    return calendar && calendar.localDisplayed;
  },

  /**
   * Find calendars in a specific account.
   * Results will be returned in an object where
   * the key is the remote.id and the value is the calendar.
   *
   * @param {String|Numeric} accountId id of account.
   * @param {Function} callback [err, object] see above.
   */
  remotesByAccount: function(accountId, trans, callback) {
    if (typeof(trans) === 'function') {
      callback = trans;
      trans = null;
    }

    if (!trans) {
      trans = core.db.transaction(this._store);
    }

    var store = trans.objectStore(this._store);

    var reqKey = IDBKeyRange.only(accountId);
    var req = store.index('accountId').mozGetAll(reqKey);

    req.onerror = function remotesError(e) {
      callback(e.target.error);
    };

    var self = this;
    req.onsuccess = function remotesSuccess(e) {
      var result = Object.create(null);
      e.target.result.forEach(function(calendar) {
        result[calendar.remote.id] = self._createModel(
          calendar,
          calendar._id
        );
      });

      callback(null, result);
    };
  },

  /**
   * Sync remote and local events for a calendar.
   *
   * TODO: Deprecate use of this function in favor of a sync methods
   *       inside of providers.
   */
  sync: function(account, calendar, callback) {
    var provider = core.providerFactory.get(account.providerType);
    provider.syncEvents(account, calendar, callback);
  },

  /**
   * Shortcut to find provider for calendar.
   *
   * @param {Calendar.Models.Calendar} calendar input calendar.
   * @param {Function} callback [err, provider].
   */
  providerFor: function(calendar, callback) {
    this.ownersOf(calendar, function(err, owners) {
      if (err) {
        return callback(err);
      }

      callback(null, core.providerFactory.get(owners.account.providerType));
    });
  },

  /**
   * Finds calendar/account for a given event.
   *
   * TODO: think about moving this function into its
   * own file as a mixin.
   *
   * @param {Object|String|Numeric} objectOrId must contain .calendarId.
   * @param {Function} callback [err, { ... }].
   */
  ownersOf: function(objectOrId, callback) {
    var result = {};

    var accountStore = core.storeFactory.get('Account');

    // case 1. given a calendar
    if (objectOrId instanceof CalendarModel) {
      result.calendar = objectOrId;
      accountStore.get(objectOrId.accountId, fetchAccount);
      return;
    }

    // case 2 given a calendar id or object

    if (typeof(objectOrId) === 'object') {
      objectOrId = objectOrId.calendarId;
    }

    // why??? because we use this method in event store too..
    var calendarStore = core.storeFactory.get('Calendar');
    calendarStore.get(objectOrId, fetchCalendar);

    function fetchCalendar(err, calendar) {
      if (err) {
        return callback(err);
      }

      result.calendar = calendar;
      accountStore.get(calendar.accountId, fetchAccount);
    }

    function fetchAccount(err, account) {
      if (err) {
        return callback(err);
      }

      result.account = account;
      callback(null, result);
    }
  }
};

});
