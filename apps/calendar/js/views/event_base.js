define(function(require, exports, module) {
'use strict';

var Event = require('models/event');
var View = require('view');
var co = require('ext/co');
var core = require('core');
var isToday = require('common/calc').isToday;
var nextTick = require('common/next_tick');
var router = require('router');

function EventBase(options) {
  View.apply(this, arguments);

  this._els = Object.create(null);
  this._changeToken = 0;

  this.cancel = this.cancel.bind(this);
  this.primary = this.primary.bind(this);
  this._initEvents();
}
module.exports = EventBase;

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
    this.header.addEventListener('action', this.cancel);
    this.primaryButton.addEventListener('click', this.primary);
  },

  uiSelector: '.%',

  get header() {
    return this._findElement('header');
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
    var path = this._returnTo || this.DEFAULT_VIEW;
    return path;
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
   * @param {{event, busytime, capabilities, account, calendar}} record
   */
  _useModel: function(record) {
    this.record = record;
    this.event = record.event;
    this.busytime = record.busytime;
    this.originalCalendar = record.calendar;

    if (!record.capabilities.canUpdate) {
      this._markReadonly(true);
      this.element.classList.add(this.READONLY);
    }

    // inheritance hook...
    this._updateUI();
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
  _loadModel: co.wrap(function *(id) {
    var token = ++this._changeToken;
    var classList = this.element.classList;
    var result = Promise.resolve();

    classList.add(this.LOADING);

    try {
      var record = yield core.bridge.fetchRecord(id);
      if (token === this._changeToken) {
        this._useModel(record);
      }
    } catch(err) {
      console.error(`Error looking up records for id: ${id}`);
      console.error(`${err.message}\n${err.stack}`);
      result = Promise.reject(err);
    }

    classList.remove(this.LOADING);

    return result;
  }),

  /**
   * Builds and sets defaults for a new model.
   *
   * @return {Calendar.Models.Model} new model.
   */
  _createModel: function(time) {
    // time can be null in some cases, default to today (eg. unit tests)
    time = time || new Date();

    this._setDefaultHour(time);

    var model = new Event();
    model.startDate = time;

    var end = new Date(time.valueOf());
    end.setHours(end.getHours() + 1);

    model.endDate = end;

    return model;
  },

  _setDefaultHour: function(date) {
    if (isToday(date)) {
      var now = new Date();
      // events created today default to begining of the next hour
      date.setHours(now.getHours() + 1, 0, 0, 0);
    } else {
      // events created on other days default to 8AM
      date.setHours(8, 0, 0, 0);
    }
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

  oninactive: function() {
    View.prototype.oninactive.apply(this, arguments);
  },

  /**
   * Handles the url parameters for when this view
   * comes into focus.
   *
   * When the (busytime) id parameter is given the event will
   * be found via the time controller.
   */
  dispatch: function(data) {
    // always remove loading initially (to prevent worst case)
    this.element.classList.remove(this.LOADING);

    // Re-run the header font fit when it comes into view.
    // Since the header is already in the markup on load and the view is hidden
    // the font fit calculations will be wrong initially.
    this.header.runFontFitSoon();

    var id = data.params.id;
    var classList = this.element.classList;
    var last = router.last;

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

    var completeDispatch = () => this.ondispatch && this.ondispatch();

    if (id) {
      classList.add(this.UPDATE);

      this._loadModel(id).then(completeDispatch);
    } else {
      classList.add(this.CREATE);

      var controller = core.timeController;
      this.event = this._createModel(controller.mostRecentDay);
      this._updateUI();

      nextTick(completeDispatch);
    }

    this.primaryButton.removeAttribute('aria-disabled');
  },

  onfirstseen: function() {}

};

});
