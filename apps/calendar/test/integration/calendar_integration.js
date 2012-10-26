/* tools from calendar */
require('/apps/calendar/js/calendar.js');
require('/apps/calendar/js/calc.js');
require('/apps/calendar/js/input_parser.js');
/** views */
require('/apps/calendar/test/integration/calendar_view.js');
require('/apps/calendar/test/integration/views/modify_event_view.js');
require('/apps/calendar/test/integration/views/month_view.js');
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

  /** selector tables */
  selectors: {
    /** views */
    settingsView: '#settings',
    monthView: '#month-view',
    monthsDayView: '#months-day-view',
    weekView: '#week-view',
    dayView: '#day-view',
    modifyEventView: '#modify-event-view',

    /** buttons */
    showSettingsBtn: '#time-header button.settings',
    addEventBtn: '#time-header a[href="/add/"]',
    eventSaveBtn: '#modify-event-view > header .save',
    eventDeleteBtn: '#modify-event-view .delete-record',

    /** lists */
    calendarList: '#settings .calendars',

    /** forms */
    eventForm: '#modify-event-view > form',
    eventFormFields: '#modify-event-view form [name]',
    eventFormStatus: '#modify-event-view [role="status"]',
    eventFormError: '#modify-event-view .errors',

    /** generic */
    present: '.present'
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
