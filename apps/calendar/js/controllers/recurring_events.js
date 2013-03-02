Calendar.ns('Controllers').RecurringEvents = (function() {

  var debug = Calendar.debug('expand events');

  function RecurringEvents(app) {
    this.app = app;
    this.accounts = app.store('Account');
    Calendar.Responder.call(this);
  }

  RecurringEvents.prototype = {
    __proto__: Calendar.Responder.prototype,

    startEvent: 'expandStart',
    completeEvent: 'expandComplete',

    /**
     * Adds N number of days to the window to expand
     * events until. Its very important for this number
     * to be greater then the maximum number of days displayed
     * in the month view (or a view with more days) otherwise
     * the view may be loaded without actually expanding all
     * the visible days.
     *
     * @type Number
     */
    paddingInDays: 85,

    /**
     * Amount of time (in MS) to wait between triggering
     * the recurring event expansions.
     */
    waitBeforeMove: 750,

    /**
     * We need to limit the number of tries on expansions
     * otherwise its possible we never complete during error
     * or long recurring event.
     */
    maximumExpansions: 25,

    /**
     * private timeout (as in setTimeout id) use with waitBeforeMove.
     */
    _moveTimeout: null,

    /**
     * True when queue is running...
     */
    pending: false,

    unobserve: function() {
      this.app.timeController.removeEventListener(
        'monthChange',
        this
      );

      this.app.syncController.removeEventListener(
        'syncComplete',
        this
      );
    },

    observe: function() {
      var time = this.app.timeController;

      // expand initial time this is necessary
      // for cases where user has device off for long periods of time.
      if (time.position) {
        this.queueExpand(time.position);
      }

      // register observers
      time.on('monthChange', this);

      // we must re-expand after sync so events at least
      // expand to the current position....
      this.app.syncController.on('syncComplete', this);
    },

    handleEvent: function(event) {
      switch (event.type) {
        case 'syncComplete':
          this.queueExpand(
            this.app.timeController.position
          );
          break;

        case 'monthChange':
          if (this._moveTimeout !== null) {
            clearTimeout(this._moveTimeout);
            this._moveTimeout = null;
          }

          // trigger the event queue when we move
          this._moveTimeout = setTimeout(
            // data[0] is the new date.
            this.queueExpand.bind(this, event.data[0]),
            this.waitBeforeMove
          );
          break;
      }
    },

    /**
     * Attempts to expand provider until no events require expansion.
     *
     * @param {Date} expandDate expands up to this date.
     * @param {Calendar.Provider.Abstract} provider instance.
     * @param {Function} callback
     *  fired when maximumExpansions is hit or
     *  no more events require expansion.
     *
     */
    _expandProvider: function(expandDate, provider, callback) {
      var tries = 0;
      var max = this.maximumExpansions;

      function attemptCompleteExpand() {
        if (tries >= max) {
          return callback(new Error(
            'could not complete expansion after "' + tries + '"'
          ));
        }

        provider.ensureRecurrencesExpanded(expandDate,
                                           function(err, didExpand) {
          if (err) {
            return callback(err);
          }

          if (!didExpand) {
            // successfully expanded and no events need expansion
            // for this date anymore...
            callback();
          } else {
            tries++;
            // attempt another expand without stack.
            Calendar.nextTick(attemptCompleteExpand);
          }
        });
      }

      attemptCompleteExpand();
    },

    /**
     * Queues an expansion. If the given date is before
     * any dates in the stack it will be discarded.
     */
    queueExpand: function(expandTo) {
      if (this.pending) {
        if (!this._next) {
          this._next = expandTo;
        } else if (expandTo > this._next) {
          this._next = expandTo;
        }
        // don't start the queue if pending...
        return;
      }

      // either way we need to process an event
      // so increment pending for running and non-running cases.
      this.pending = true;
      this.emit('expandStart');

      var self = this;
      function expandNext(date) {
        self.expand(date, function() {
          if (date === self._next) {
            self._next = null;
          }

          var next = self._next;

          // when the queue is empty emit expandComplete
          if (!next) {
            self.pending = false;
            self.emit('expandComplete');
            return;
          }

          expandNext(next);
        });
      }

      expandNext(expandTo);
    },

    /**
     * Ensures we have time converage until the given date.
     * Additional time will be added to the date see .paddingInDays.
     *
     * @param {Date} expandTo date to expand to.
     */
    expand: function(expandTo, callback) {
      debug('expand', expandTo);
      // we need to look through all available accounts
      var pending = 0;

      function next() {
        if (!(--pending)) {
          callback();
        }
      }

      this.accounts.all(function(err, list) {
        if (err) {
          return callback(err);
        }

        // add minimum padding...
        var expandDate = new Date(expandTo.valueOf());
        expandDate.setDate(expandDate.getDate() + this.paddingInDays);

        for (var key in list) {
          pending++;
          var provider = this.app.provider(list[key].providerType);
          if (provider && provider.canExpandRecurringEvents) {
            this._expandProvider(expandDate, provider, next);
          } else {
            Calendar.nextTick(next);
          }
        }

        // if there are no accounts we need to fire the callback.
        if (!pending)
          Calendar.nextTick(callback);

      }.bind(this));
    }
  };

  return RecurringEvents;

}());

