define(function(require, exports, module) {
'use strict';

var Abstract = require('./abstract');
var Calc = require('common/calc');
var CaldavPullEvents = require('./caldav_pull_events');
var calendarError = require('common/error');
var Local = require('./local');
var core = require('core');
var errors = require('common/error');
var isOffline = require('common/is_offline');
var mutations = require('event_mutations');
var nextTick = require('common/next_tick');

var CALDAV_ERROR_MAP = {
  'caldav-authentication': 'authentication',
  'caldav-invalid-entrypoint': 'invalid-server',
  'caldav-server-failure': 'server-failure'
};

function mapError(error, detail) {
  console.error('Caldav Error with name:', error.name);
  if (error.name in CALDAV_ERROR_MAP) {
    error = Object.create(error);
    error.name = CALDAV_ERROR_MAP[error.name];
  }
  return calendarError.create({ error: error, detail: detail });
}

function CaldavProvider() {
  Abstract.apply(this, arguments);

  var storeFactory = core.storeFactory;
  this.service = core.caldavManager;
  this.accounts = storeFactory.get('Account');
  this.busytimes = storeFactory.get('Busytime');
  this.events = storeFactory.get('Event');
  this.icalComponents = storeFactory.get('IcalComponent');
}
module.exports = CaldavProvider;

CaldavProvider.prototype = {
  __proto__: Abstract.prototype,
  role: 'caldav',
  useUrl: true,
  useCredentials: true,
  canSync: true,
  canExpandRecurringEvents: true,

  // allow us to test the offline behavior
  isOffline: isOffline,

  /**
   * Number of dates in the past to sync.
   * This is usually from the first sync date.
   */
  daysToSyncInPast: 30,

  canCreateEvent: true,
  canUpdateEvent: true,
  canDeleteEvent: true,

  hasAccountSettings: true,

  /**
   * Error handling can be complex- this is the centralized location where
   * methods can send their error state and some context (an account).
   *
   *    this._handleServiceError(
   *      err,
   *      { account: account, calendar: calendar }
   *    );
   *
   * @param {Object} rawErr from service.
   * @param {Object} detail for the error.
   */
  _handleServiceError: function(rawErr, detail) {
    var calendarErr = mapError(rawErr, detail);

    // when we receive a permanent error we should mark the account with an
    // error.
    if (
      calendarError.isAuthentication(calendarErr) ||
      calendarError.isInvalidServer(calendarErr)
    ) {
      // there must always be an account
      if (detail.account) {
        // but we only mark it with a permanent error if its persisted.
        if (detail.account._id) {
          this.accounts.markWithError(detail.account, calendarErr);
        }
      } else {
        console.error('Permanent server error without an account!');
      }
    }

    return calendarErr;
  },

  /**
   * Determines the capabilities of a specific calendar.
   *
   * The .remote property should contain a .privilegeSet array
   * with the caldav specific names of privileges.
   * In the case where .privilegeSet is missing all privileges are granted.
   *
   * (see http://tools.ietf.org/html/rfc3744#section-5.4).
   *
   *   - write-content: (PUT) can edit/add events
   *   - unbind: (DELETE) remove events
   *
   *
   * There are aggregate values (write for example) but
   * the spec states the specific permissions must also be expanded
   * so even if they have full write permissions we only check
   * for write-content.
   *
   * @param {Object} calendar object with caldav remote details.
   * @return {Object} object with three properties
   *  (canUpdate, canDelete, canCreate).
   */
  calendarCapabilities: function(calendar) {
    var remote = calendar.remote;

    if (!remote.privilegeSet) {
      return {
        canUpdateEvent: true,
        canDeleteEvent: true,
        canCreateEvent: true
      };
    }

    var privilegeSet = remote.privilegeSet;
    var canWriteConent = privilegeSet.indexOf('write-content') !== -1;

    return {
      canUpdateEvent: canWriteConent,
      canCreateEvent: canWriteConent,
      canDeleteEvent: privilegeSet.indexOf('unbind') !== -1
    };
  },

  /**
   * Returns the capabilities of a single event.
   *
   * @param {Object} event local object.
   * @param {Function} callback [err, caps].
   */
  eventCapabilities: function(event, callback) {
    if (event.remote.isRecurring) {
      // XXX: for now recurring events cannot be edited
      nextTick(function() {
        callback(null, {
          canUpdate: false,
          canDelete: false,
          canCreate: false
        });
      });

    } else {
      var calendarStore = core.storeFactory.get('Calendar');

      calendarStore.get(event.calendarId, function(err, calendar) {
        if (err) {
          return callback(err);
        }

        var caps = this.calendarCapabilities(
          calendar
        );

        callback(null, {
          canCreate: caps.canCreateEvent,
          canUpdate: caps.canUpdateEvent,
          canDelete: caps.canDeleteEvent
        });
      }.bind(this));
    }
  },

  getAccount: function(account, callback) {
    if (this.isOffline()) {
      return this.handleOfflineError(callback);
    }

    var self = this;
    this.service.request(
      'caldav',
      'getAccount',
      account,
      function(err, data) {
        if (err) {
          return callback(
            self._handleServiceError(err, { account: account })
          );
        }
        callback(null, data);
      }
    );
  },

  /**
   * Hook to format remote data if needed.
   */
  formatRemoteCalendar: function(calendar) {
    if (!calendar.color) {
      calendar.color = this.defaultColor;
    }

    return calendar;
  },

  findCalendars: function(account, callback) {
    if (this.isOffline()) {
      return this.handleOfflineError(callback);
    }

    var self = this;
    function formatCalendars(err, data) {
      if (err) {
        return callback(self._handleServiceError(err, {
          account: account
        }));
      }

      // format calendars if needed
      if (data) {
        for (var key in data) {
          data[key] = self.formatRemoteCalendar(data[key]);
        }
      }

      callback(err, data);
    }

    this.service.request(
      'caldav',
      'findCalendars',
      account.toJSON(),
      formatCalendars
    );
  },

  _syncEvents: function(account, calendar, cached, callback) {

    var startDate;
    // calculate the first date we want to sync
    if (!calendar.firstEventSyncDate) {
      startDate = Calc.createDay(new Date());

      // will be persisted if sync is successful (clone is required)
      calendar.firstEventSyncDate = new Date(
        startDate.valueOf()
      );
    } else {
      startDate = new Date(calendar.firstEventSyncDate.valueOf());
    }

    // start date - the amount of days is the sync range
    startDate.setDate(startDate.getDate() - this.daysToSyncInPast);

    var options = {
      startDate: startDate,
      cached: cached
    };

    var stream = this.service.stream(
      'caldav',
      'streamEvents',
      account.toJSON(),
      calendar.remote,
      options
    );

    var pull = new CaldavPullEvents(stream, {
      account: account,
      calendar: calendar
    });

    var calendarStore = core.storeFactory.get('Calendar');
    var syncStart = new Date();

    var self = this;
    stream.request(function(err) {
      if (err) {
        return callback(
          self._handleServiceError(err, {
            account: account,
            calendar: calendar
          })
        );
      }

      var trans = pull.commit(function(commitErr) {
        if (commitErr) {
          callback(err);
          return;
        }
        callback(null);
      });

      /**
       * Successfully synchronizing a calendar indicates we can remove this
       * error.
       */
      calendar.error = undefined;

      calendar.lastEventSyncToken = calendar.remote.syncToken;
      calendar.lastEventSyncDate = syncStart;

      calendarStore.persist(calendar, trans);

    });

    return pull;
  },

  /**
   * Builds list of event urls & sync tokens.
   *
   * @param {Calendar.Model.Calendar} calender model instance.
   * @param {Function} callback node style [err, results].
   */
  _cachedEventsFor: function(calendar, callback) {
    var store = core.storeFactory.get('Event');

    store.eventsForCalendar(calendar._id, function(err, results) {
      if (err) {
        callback(err);
        return;
      }

      var list = Object.create(null);

      var i = 0;
      var len = results.length;
      var item;

      for (; i < len; i++) {
        item = results[i];
        list[item.remote.url] = {
          syncToken: item.remote.syncToken,
          id: item._id
        };
      }

      callback(null, list);
    });
  },

  /**
   * Sync remote and local events for a calendar.
   */
  syncEvents: function(account, calendar, callback) {
    var self = this;

    if (this.isOffline()) {
      return this.handleOfflineError(callback);
    }

    if (!calendar._id) {
      throw new Error('calendar must be assigned an _id');
    }

    // Don't attempt to sync when provider cannot
    // or we have matching tokens
    if ((calendar.lastEventSyncToken &&
         calendar.lastEventSyncToken === calendar.remote.syncToken)) {
      return nextTick(callback);
    }

    this._cachedEventsFor(calendar, function(err, results) {
      if (err) {
        callback(err);
        return;
      }

      self._syncEvents(
        account,
        calendar,
        results,
        callback
      );
    });
  },

  /**
   * See abstract for contract details...
   *
   * Finds all ical components that have not been expanded
   * beyond the given point and expands / persists them.
   *
   * @param {Date} maxDate maximum date to expand to.
   * @param {Function} callback [err, didExpand].
   */
  ensureRecurrencesExpanded: function(maxDate, callback) {
    var self = this;
    this.icalComponents.findRecurrencesBefore(maxDate,
                                              function(err, results) {
      if (err) {
        callback(err);
        return;
      }

      if (!results.length) {
        callback(null, false);
        return;
      }

      // CaldavPullRequest is based on a calendar/account combination
      // so we must group all of the outstanding components into
      // their calendars before we can begin expanding them.
      var groups = Object.create(null);
      results.forEach(function(comp) {
        var calendarId = comp.calendarId;
        if (!(calendarId in groups)) {
          groups[calendarId] = [];
        }

        groups[calendarId].push(comp);
      });

      var pullGroups = [];
      var pending = 0;
      var options = {
        maxDate: Calc.dateToTransport(maxDate)
      };

      function next(err, pull) {
        pullGroups.push(pull);
        if (!(--pending)) {
          var trans = core.db.transaction(
            ['icalComponents', 'alarms', 'busytimes'],
            'readwrite'
          );

          trans.oncomplete = function() {
            callback(null, true);
          };

          trans.onerror = function(event) {
            callback(event.result.error.name);
          };

          pullGroups.forEach(function(pull) {
            pull.commit(trans);
          });
        }
      }

      for (var calendarId in groups) {
        pending++;
        self._expandComponents(
          calendarId,
          groups[calendarId],
          options,
          next
        );
      }

    });
  },

  _expandComponents: function(calendarId, comps, options, callback) {
    var calStore = core.storeFactory.get('Calendar');

    calStore.ownersOf(calendarId, function(err, owners) {
      if (err) {
        return callback(err);
      }

      var calendar = owners.calendar;
      var account = owners.account;

      var stream = this.service.stream(
        'caldav',
        'expandComponents',
        comps,
        options
      );

      var pull = new CaldavPullEvents(
        stream,
        {
          account: account,
          calendar: calendar,
          stores: [
            'busytimes', 'alarms', 'icalComponents'
          ]
        }
      );

      stream.request(function(err) {
        if (err) {
          callback(err);
          return;
        }
        callback(null, pull);
      });

    }.bind(this));
  },

  createEvent: function(event, busytime, callback) {
    if (typeof(busytime) === 'function') {
      callback = busytime;
      busytime = null;
    }

    if (this.isOffline()) {
      return this.handleOfflineError(callback);
    }

    this.events.ownersOf(event, fetchOwners);

    var self = this;
    var calendar;
    var account;
    function fetchOwners(err, owners) {
      calendar = owners.calendar;
      account = owners.account;

      self.service.request(
        'caldav',
        'createEvent',
        account,
        calendar.remote,
        event.remote,
        handleRequest
      );
    }

    function handleRequest(err, remote) {
      if (err) {
        return callback(self._handleServiceError(err, {
          account: account,
          calendar: calendar
        }));
      }

      var event = {
        _id: calendar._id + '-' + remote.id,
        calendarId: calendar._id
      };

      var component = {
        eventId: event._id,
        ical: remote.icalComponent
      };

      delete remote.icalComponent;
      event.remote = remote;

      var create = mutations.create({
        event: event,
        icalComponent: component
      });

      create.commit(function(err) {
        if (err) {
          callback(err);
          return;
        }

        callback(null, create.busytime, create.event);
      });
    }
  },

  updateEvent: function(event, busytime, callback) {
    if (typeof(busytime) === 'function') {
      callback = busytime;
      busytime = null;
    }

    if (this.isOffline()) {
      return this.handleOfflineError(callback);
    }

    this.events.ownersOf(event, fetchOwners);

    var self = this;
    var calendar;
    var account;

    function fetchOwners(err, owners) {
      calendar = owners.calendar;
      account = owners.account;

      self.icalComponents.get(
        event._id, fetchComponent
      );
    }

    function fetchComponent(err, ical) {
      if (err) {
        callback(err);
        return;
      }

      var details = {
        event: event.remote,
        icalComponent: ical.ical
      };

      self.service.request(
        'caldav',
        'updateEvent',
        account,
        calendar.remote,
        details,
        handleUpdate
      );
    }

    function handleUpdate(err, remote) {
      if (err) {
        callback(self._handleServiceError(err, {
          account: account,
          calendar: calendar
        }));
        return;
      }

      var component = {
        eventId: event._id,
        ical: remote.icalComponent
      };

      delete remote.icalComponent;
      event.remote = remote;

      var update = mutations.update({
        event: event,
        icalComponent: component
      });

      update.commit(function(err) {
        if (err) {
          callback(err);
          return;
        }
        callback(null, update.busytime, update.event);
      });
    }
  },

  deleteEvent: function(event, busytime, callback) {
    if (typeof(busytime) === 'function') {
      callback = busytime;
      busytime = null;
    }

    if (this.isOffline()) {
      return this.handleOfflineError(callback);
    }

    this.events.ownersOf(event, fetchOwners);

    var calendar;
    var account;
    var self = this;
    function fetchOwners(err, owners) {
      calendar = owners.calendar;
      account = owners.account;

      self.service.request(
        'caldav',
        'deleteEvent',
        account,
        calendar.remote,
        event.remote,
        handleRequest
      );

    }

    function handleRequest(err) {
      if (err) {
        callback(self._handleServiceError(err, {
          account: account,
          calendar: calendar
        }));
        return;
      }
      Local.prototype.deleteEvent.call(self, event, busytime, callback);
    }
  },

  handleOfflineError: function(callback) {
    var err = errors.create('offline');
    if (typeof callback === 'function') {
      return callback(err);
    }
    return Promise.reject(err);
  }
};

});
