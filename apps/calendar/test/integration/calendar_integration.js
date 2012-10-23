require('/tests/js/app_integration.js');
require('/tests/js/integration_helper.js');

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

    /** lists */
    calendarList: '#settings .calendars',

    /** forms */
    eventForm: '#modify-event-view > form',
    eventFormFields: '#modify-event-view form [name]',

    /** generic */
    present: '.present'
  },
  /**
   * Deletes the calendar database and closes the app.
   */
  close: function(callback) {
    var self = this;
    this.task(function(app, next, done) {
      var device = app.device;
      yield device.executeScript(function() {
        window.wrappedJSObject.Calendar.App.db.deleteDatabase(function() {
        });
      });

      yield AppIntegration.prototype.close.call(self, next);

      done();
    }, callback);
  }
};
