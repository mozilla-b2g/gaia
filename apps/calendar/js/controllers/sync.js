Calendar.ns('Controllers').Sync = (function() {

  /**
   * Private helper for choosing how to dispatch errors.
   * When given a callback the callback will be called otherwise the error
   * controller will be invoked.
   */
  function handleError(err, callback) {
    if (callback)
      return callback(err);

    Calendar.App.errorController.dispatch(err);
  }

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

      if (this.pending < 0) {
        dump('\n\n Error calendar sync .pending is < 0 \n\n');
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
    all: function(callback) {
      // this is for backwards compatibility... in reality we should remove
      // callbacks from .all.
      if (callback) {
        this.once('syncComplete', callback);
      }

      if (this.app.offline()) {
        this.emit('offline');
        this.emit('syncComplete');
        return;
      }

      var account = this.app.store('Account');

      account.all(function(err, list) {

        for (var key in list) {
          this.account(list[key]);
        }

        // If we have nothing to sync
        if (!this.pending) {
          this.emit('syncComplete');
        }

      }.bind(this));
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
        handleError(err, callback);
      });
    },

    /**
     * Initiates a sync of a single account and all
     * associated calendars (calendars that exist after
     * the full sync of the account itself).
     *
     * The contract is if an callback is given the callback MUST handle the
     * error given. The default behaviour is to bubble up the error up to the
     * error controller.
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
        if (err) {
          self._resolvePending();
          return handleError(err, callback);
        }

        var pending = 0;
        function next() {
          if (!(--pending)) {
            self._resolvePending();

            if (callback)
              callback();
          }
        }

        function fetchCalendars(err, calendars) {
          if (err) {
            self._resolvePending();
            return handleError(err, callback);
          }

          for (var key in calendars) {
            pending++;
            self.calendar(account, calendars[key], next);
          }
        }

        // find all calendars
        var calendars = calendarStore.remotesByAccount(
          account._id,
          fetchCalendars
        );
      });
    }
  };

  return Sync;
}());
