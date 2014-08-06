(function(exports) {
'use strict';

/**
 * Module dependencies
 */
var Event = Calendar.Models.Event,
    View = Calendar.View,
    debug = Calendar.debug('EventBase'),
    nextTick = Calendar.nextTick,
    provider = Calendar.Provider.provider;

function EventBase(options) {
  View.apply(this, arguments);

  this.store = this.app.store('Event');
  this._els = Object.create(null);
  this._changeToken = 0;

  this.cancel = this.cancel.bind(this);
  this.primary = this.primary.bind(this);
  this._initEvents();
}
exports.EventBase = EventBase;

EventBase.prototype = {
  __proto__: View.prototype,

  READONLY: 'readonly',
  CREATE: 'create',
  UPDATE: 'update',
  PROGRESS: 'in-progress',
  ALLDAY: 'allday',
  LOADING: 'loading',

  DEFAULT_VIEW: '/month/',

  _initEvents: function() {
    this.cancelButton.addEventListener('click', this.cancel);
    this.primaryButton.addEventListener('click', this.primary);
  },

  uiSelector: '.%',

  get cancelButton() {
    return this._findElement('cancelButton');
  },

  get primaryButton() {
    return this._findElement('primaryButton');
  },

  get fieldRoot() {
    return this.element;
  },

  /**
   * Returns the url the view will "redirect" to
   * after completing the current add/edit/delete operation.
   *
   * @return {String} redirect url.
   */
  returnTo: function() {
    return this._returnTo || this.DEFAULT_VIEW;
  },

  /**
   * Returns the top level URL, or returnTo()
   * Resets the returnTop variable so we can override on next visit
   */
  returnTop: function() {
    var path = this._returnTop || this.returnTo();
    delete this._returnTop;
    return path;
  },

  /**
   * Dismiss modification and go back to previous screen.
   */
  cancel: function() {
    window.history.back();
  },

  /**
   * This method is overridden
   */
  primary: function() {},

  /**
   * This method is overridden
   */
  _markReadonly: function() {},

  /**
   * When the event is something like this:
   * 2012-01-02 and we detect this is an all day event
   * we want to display the end date like this 2012-01-02.
   */
  formatEndDate: function(endDate) {
    if (
      endDate.getHours() === 0 &&
      endDate.getSeconds() === 0 &&
      endDate.getMinutes() === 0
    ) {
      // subtract the date to give the user a better
      // idea of which dates the event spans...
      endDate = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate() - 1
      );
    }

    return endDate;
  },

  /**
   * Assigns and displays event & busytime information.
   * Marks view as "loading"
   *
   * @param {Object} busytime for view.
   * @param {Object} event for view.
   * @param {Function} [callback] optional callback.
   */
  useModel: function(busytime, event, callback) {
    // mark view with loading class
    var classList = this.element.classList;
    classList.add(this.LOADING);

    // ???
    var changeToken = ++this._changeToken;

    this.event = new Event(event);
    this.busytime = busytime;
    return Promise.all([
      this.store.ownersOf(event),
      provider.eventCapabilities(this.event)
    ])
    .then((results) => {
      var [owners, capabilities] = results;
      this.originalCalendar = owners.calendar;

      if (this._changeToken !== changeToken) {
        debug('What happened?!');
        return;
      }

      if (!capabilities.canUpdateEvent) {
        debug('Using readonly event.');
        this._markReadonly(true);
        this.element.classList.add(this.READONLY);
      }

      this.isSaved = true;

      // inheritance hook
      debug('Will update UI.');
      this._updateUI();

      // we only remove the loading class after the UI is rendered just to
      // avoid potential race conditions during marionette tests (trying to
      // read the data before it's on the DOM)
      debug('Will remove loading class...');
      classList.remove(this.LOADING);
      callback && callback();
    })
    .catch((err) => {
      classList.remove(this.LOADING);
      debug('Failed to fetch event capabilities', err);
      return callback && callback(err);
    });
  },

  /** override me! **/
  _updateUI: function() {},

  /**
   * Loads event and triggers form update.
   * Gracefully will handle race conditions
   * if rapidly switching between events.
   * TODO: This token may no longer be needed
   *   as we have an aria-disabled guard now.
   *
   * @param {String} id busytime id.
   */
  _loadModel: function(id, callback) {
    var classList = this.element.classList;
    classList.add(this.LOADING);
    var token = ++this._changeToken;
    var time = this.app.timeController;
    time.findAssociated(id, (err, list) => {
      if (err) {
        classList.remove(this.LOADING);
        console.log('Error looking up records for id: ', id);
      }

      var records = list[0];
      if (token === this._changeToken) {
        this.useModel(records.busytime, records.event, callback);
      } else {
        // ensure loading is removed
        classList.remove(this.LOADING);
      }
    });
  },

  /**
   * Builds and sets defaults for a new model.
   *
   * @return {Calendar.Models.Model} new model.
   */
  _createModel: function(time) {
    var now = new Date();

    if (time < now) {
      time = now;
      now.setHours(now.getHours() + 1);
      now.setMinutes(0);
      now.setSeconds(0);
      now.setMilliseconds(0);
    }

    var end = new Date(time.valueOf());
    end.setHours(end.getHours() + 1);

    var model = new Event();
    model.startDate = time;
    model.endDate = end;
    return model;
  },

  /**
   * Gets and caches an element by selector
   */
  getEl: function(name) {
    if (!(name in this._els)) {
      var el = this.fieldRoot.querySelector(
        this.uiSelector.replace('%', name)
      );
      if (el) {
        this._els[name] = el;
      }
    }
    return this._els[name];
  },

  /**
   * Handles the url parameters for when this view
   * comes into focus.
   *
   * When the (busytime) id parameter is given the event will
   * be found via the time controller.
   */
  dispatch: function(data) {
    var classList = this.element.classList;

    // always remove loading initially (to prevent worst case)
    classList.remove(this.LOADING);

    var id = data.params.id;
    var last = this.app.router.last;

    if (last && last.path) {
      if (!(/^\/(day|event|month|week)/.test(last.path))) {
        // We came from some place suspicious so fall back to default.
        this._returnTo = this.DEFAULT_VIEW;
      } else {
        // Return to the default view if we just added an event.
        // Else go back to where we came from.
        this._returnTo = /^\/event\/add\//.test(last.path) ?
            this.DEFAULT_VIEW : last.path;
      }
    }

    if (!this._returnTop && this._returnTo) {
      this._returnTop = this._returnTo;
    }

    var self = this;
    function completeDispatch() {
      return self.ondispatch && self.ondispatch();
    }

    if (id) {
      classList.add(this.UPDATE);

      this._loadModel(id, completeDispatch);
    } else {
      classList.add(this.CREATE);

      var controller = this.app.timeController;
      this.event = this._createModel(controller.mostRecentDay);
      this._updateUI();

      nextTick(completeDispatch);
    }

    this.primaryButton.removeAttribute('aria-disabled');
  },

  onfirstseen: function() {}
};

}(Calendar.ns('Views')));
