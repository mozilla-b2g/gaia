(function(exports) {
'use strict';

/**
 * Module dependencies
 */
var Responder = Calendar.Responder,
    debug = Calendar.debug('expand events'),
    provider = Calendar.Provider.provider,
    retry = Calendar.retry;

function RecurringEvents(app) {
  Responder.call(this);
  this.app = app;
  this.accounts = app.store('Account');
}
exports.RecurringEvents = RecurringEvents;

RecurringEvents.prototype = {
  __proto__: Responder.prototype,

  startEvent: 'expandStart',
  completeEvent: 'expandComplete',

  /**
   * Adds N number of days to the window to expand
   * events until. Its very important for this number
   * to be greater then the maximum number of days displayed
   * in the month view (or a view with more days) otherwise
   * the view may be loaded without actually expanding all
   * the visible days.
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

  unobserve: function() {
    var app = this.app;
    app.timeController.removeEventListener('monthChange', this);
    app.syncController.removeEventListener('syncComplete', this);
  },

  handleEvent: function(event) {
    switch (event.type) {
      case 'syncComplete':
        this.queueExpand(this.app.timeController.position);
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
   * Queues an expansion. If the given date is before
   * any dates in the stack it will be discarded.
   */
  queueExpand: function(expandTo) {
    if (this.pending) {
      if (!this._next || expandTo > this._next) {
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
    debug('expand to date: ', expandTo);

    // add minimum padding...
    var expandDate = new Date(expandTo.valueOf());
    expandDate.setDate(expandDate.getDate() + this.paddingInDays);

    retry(
      () => provider.ensureRecurrencesExpanded(expandDate),
      this.maximumExpansions
    )
    .then(callback)
    .catch((error) => {
      if (error.name === 'RetryError') {
        error = new Error('Failed to expand recurrences after ' +
                          this.maximumExpansions + ' attempts.');
      }

      callback(error);
    });
  }
};
}(Calendar.ns('Controllers')));
