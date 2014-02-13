'use strict';

var Calendar = require('./calendar'),
    Radicale = require('./lib/radicale'),
    assert = require('assert'),
    dateFormat = require('dateformat');

var ACCOUNT_USERNAME = 'firefox-os',
    ACCOUNT_PASSWORD = '',
    TITLE = 'Go for a dream',
    DATE_PATTERN = 'yyyymmdd"T"HHMMssZ';

marionette('configure CalDAV accounts', function() {
  var client = marionette.client(),
      serverHelper = new Radicale(),
      app = null;

  setup(function(done) {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });
    // The #time-views pannel has a transitionend event after app is launched.
    // It is happened on b2g-desktop client, not on the device.
    app.registerTransitionEndEvent('#time-views');
    app.waitForTransitionEnd('#time-views');

    serverHelper.start(null, function(port) {
      var accountUrl = 'http://localhost:' + port + '/' + ACCOUNT_USERNAME,
          startDate = new Date(),
          endDate = new Date(),
          event = {};

      app.createCalDavAccount(
        ACCOUNT_USERNAME,
        ACCOUNT_PASSWORD,
        accountUrl
      );

      // Make sure we have a event item
      // in the top of event-list view in month view.
      startDate.setMinutes(0);
      endDate.setMinutes(59);
      event = {
        startDate: dateFormat(startDate, DATE_PATTERN),
        endDate: dateFormat(endDate, DATE_PATTERN),
        title: TITLE
      };
      serverHelper.addEvent(ACCOUNT_USERNAME, event);
      app.syncCalendar();
      // Make sure we start the server before the setup is ended.
      done();
    });
  });

  teardown(function(done) {
    // No matter how, we close the server in the end.
    try {
      serverHelper.removeAllEvents();
    } catch (error) {
      console.error(error.message);
    } finally {
      serverHelper.close(done);
    }
  });

  test('should show a event', function() {
    app.getMonthEventByTitle(TITLE).click();
    assertEvent(ACCOUNT_USERNAME, TITLE);
  });

  function assertEvent(username, title) {
    assert.deepEqual(
      app.waitForElement('viewEventViewTitleContent').text(),
      title,
      'event should have correct title'
    );
    // Make sure the event is created in the CalDAV username.
    assert.deepEqual(
      app.waitForElement('viewEventViewCalendar').text(),
      username,
      'event should be created by the correct user'
    );
  }
});
