if (window && !window.addEventListener)
  window.addEventListener = function() {};

/* tools from calendar */
require('/apps/calendar/js/calendar.js');
require('/apps/calendar/js/calc.js');
require('/apps/calendar/js/ext/uuid.js');
require('/apps/calendar/js/utils/input_parser.js');
/** views */
require('/apps/calendar/test/integration/calendar_view.js');
require('/apps/calendar/test/integration/views/modify_event_view.js');
require('/apps/calendar/test/integration/views/month_view.js');
require('/apps/calendar/test/integration/views/day_view.js');
require('/apps/calendar/test/integration/views/week_view.js');
require('/apps/calendar/test/integration/views/months_day_view.js');

/* factories */
require('/apps/calendar/test/unit/support/factory.js');
require('/apps/calendar/test/integration/factory/forms.js');

/* common */
require('/tests/js/app_integration.js');

/* extra assertions */
require('/apps/calendar/test/assertions.js');

function CalendarIntegration(device) {
  AppIntegration.apply(this, arguments);
}

CalendarIntegration.prototype = {
  __proto__: AppIntegration.prototype,

  appName: 'Calendar',

  searchTimeouts: {
    long: 25000,
    short: 2000
  },

  /** selector tables */
  selectors: {
    /** views */
    settingsView: '#settings',
    advancedSettingsView: '#advanced-settings-view',
    monthView: '#month-view',
    monthsDayView: '#months-day-view',
    weekView: '#week-view',
    dayView: '#day-view',
    modifyEventView: '#modify-event-view',


    /** view buttons */
    addEventBtn: '#time-header a[href="/add/"]',
    weekViewBtn: '#view-selector a[href="/week/"]',
    dayViewBtn: '#view-selector a[href="/day/"]',

    /** buttons */
    showSettingsBtn: '#time-header button.settings',
    showAdvancedSettingsBtn: '#settings a[href="/advanced-settings/"]',
    eventSaveBtn: '#modify-event-view > header .save',
    eventDeleteBtn: '#modify-event-view .delete-record',
    todayBtn: '#view-selector a[href="#today"]',

    /** lists */
    calendarList: '#settings .calendars',
    accountList: '#advanced-settings-view .account-list',

    /** forms */
    eventForm: '#modify-event-view > form',
    eventFormFields: '#modify-event-view form [name]',
    eventFormAllDay: '#modify-event-view form .allday label',
    eventFormStatus: '#modify-event-view [role="status"]',
    eventFormError: '#modify-event-view .errors',

    /** generic */
    present: '.present'
  },

  launch: function(waitForBody, callback) {
    var self = this;
    AppIntegration.prototype.launch.call(this, true, function() {
      self.task(function(app, next, done) {
        yield IntegrationHelper.importScript(
          app.device,
          //TODO: this should likely be in atoms
          '/test_apps/test-agent/common/test/synthetic_gestures.js'
        );

        yield app.resetSearchTimeout('long');

        done();
      });
    });
  },

  /**
   * Resets the element search timeout based on the .searchTimeouts property.
   * Useful in cases where you want to reduce the timeout for known failures.
   *
   * @param {String} type (long or short).
   */
  resetSearchTimeout: function(type, callback) {
    this.task(function(app, next, done) {
      var timeout = this.searchTimeouts[type] || 3000;
      yield app.device.setSearchTimeout(timeout);

      done();
    }, callback, this);
  },

  get dayView() {
    if (!this._dayView) {
      this._dayView = new DayView(this);
    }

    return this._dayView;
  },

  get weekView() {
    if (!this._weekView) {
      this._weekView = new WeekView(this);
    }

    return this._weekView;
  },

  get monthView() {
    if (!this._monthView) {
      this._monthView = new MonthView(this);
    }

    return this._monthView;
  },

  get monthsDayView() {
    if (!this._monthsDayView) {
      this._monthsDayView = new MonthsDayView(this);
    }

    return this._monthsDayView;
  },

  get modifyEventView() {
    if (!this._modifyEventView) {
      this._modifyEventView = new ModifyEventView(this);
    }
    return this._modifyEventView;
  },

  /**
   * Swipes an element to the left or right.
   *
   * @param {Marionette.Element} element from marionette.
   * @param {String} direction "left" or "right".
   * @param {Number} duration period of time over which the swipe occurs.
   */
  swipe: function(element, direction, duration, callback) {
    this.task(function(app, next, done) {
      yield IntegrationHelper.sendAtom(
        app.device,
        '/apps/calendar/test/integration/atoms/view_swipe',
        true,
        // element, length of hold
        [element, direction, (duration || 1200)]
      );

      done();
    }, callback, this);
  },

  /**
   * @param {Marionette.Element} element to find top/left of.
   */
  getPosition: function(element, callback) {
    this.task(function(app, next, done) {
      var pos = yield IntegrationHelper.sendAtom(
        app.device,
        '/apps/calendar/test/integration/atoms/get_pos',
        false,
        [element]
      );
      done(null, pos);
    }, callback);
  },

  /**
   * Deletes the calendar database and closes the app.
   */
  close: function(callback) {
    var self = this;

    this.task(function(app, next, done) {
      var device = app.device;

      yield device.executeScript(
        // yuck! but Function.toString is broken in sub-files
        // in xpcshell right now. (Bug 804404)
        'window.wrappedJSObject.Calendar.App' +
        '.db.deleteDatabase(function() {}); '
      );

      yield AppIntegration.prototype.close.call(self, next);
      done();
    }, callback);
  }
};
