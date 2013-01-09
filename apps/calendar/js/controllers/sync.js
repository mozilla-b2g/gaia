Calendar.ns('Controllers').Sync = (function() {

  /**
   * Handles all synchronization related
   * tasks. The intent is that this will
   * be the focal point for any view
   * to observe sync events and this
   * controller will decide when to actually
   * tell the stores when to sync.
   */
  function Sync(app) {
    this.app = app;
    this.pending = 0;

    Calendar.Responder.call(this);
  }

  Sync.prototype = {
    __proto__: Calendar.Responder.prototype,

    startEvent: 'syncStart',
    completeEvent: 'syncComplete',

    _incrementPending: function() {
      if (!this.pending) {
        this.emit('syncStart');
      }

      this.pending++;
    },

    _resolvePending: function() {
      if (!(--this.pending)) {
        this.emit('syncComplete');
      }
    },

    /**
     * Sync all accounts, calendars, events.
     * There is no callback for all intentionally.
     *
     * Use:
     *
     *    controller.once('syncComplete', cb);
     *
     */
    all: function() {
      if (this.app.offline()) {
        this.emit('offline');
        return;
      }

      var account = this.app.store('Account');

      for (var key in account.cached) {
        this.account(account.cached[key]);
      }

      // If we have nothing to sync
      if (!this.pending)
        this.emit('syncComplete');
    },

    /**
     * Initiates a sync for a single calendar.
     *
     * @param {Object} account parent of calendar.
     * @param {Object} calendar specific calendar to sync.
     * @param {Function} [callback] optional callback.
     */
    calendar: function(account, calendar, callback) {
      var store = this.app.store('Calendar');
      var self = this;

      this._incrementPending();
      store.sync(account, calendar, function(err) {
        self._resolvePending();
        if (callback)
          callback(err);
      });
    },

    /**
     * Initiates a sync of a single account and all
     * associated calendars (calendars that exist after
     * the full sync of the account itself).
     *
     * @param {Object} account sync target.
     * @param {Function} [callback] optional callback.
    */
    account: function(account, callback) {
      var accountStore = this.app.store('Account');
      var calendarStore = this.app.store('Calendar');

      var self = this;

      this._incrementPending();
      accountStore.sync(account, function(err) {
        // find all calendars
        var calendars = calendarStore.remotesByAccount(
          account._id
        );

        var pending = 0;

        function next() {
          if (!(--pending)) {
            self._resolvePending();

            if (callback)
              callback();
          }
        }

        for (var key in calendars) {
          pending++;
          self.calendar(account, calendars[key], next);
        }
      });
    }
  };

  return Sync;
}());
