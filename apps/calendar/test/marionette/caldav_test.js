var Calendar = require('./calendar'),
    serverHelper = require('./lib/server_helper');
    assert = require('assert'),
    dateFormat = require('dateformat');

const ACCOUNT_USERNAME = 'firefox-os',
      ACCOUNT_PASSWORD = '',
      TITLE = 'Go for a dream',
      DATE_PATTERN = 'yyyymmdd"T"HHMMssZ';

marionette('configure CalDAV accounts', function() {
  var client = marionette.client(),
      app, accountUrl;

  setup(function() {
    var port = serverHelper.start(),
        accountUrl = 'http://localhost:' + port + '/' + ACCOUNT_USERNAME,
        startDate = new Date(),
        endDate = new Date(),
        event = {};

    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });

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

  function assertEvent(account, title) {
    assert.deepEqual(
      app.waitForElement('viewEventViewTitle').text(),
      title
    );
    // Make sure the event is created in the CalDAV account.
    assert.deepEqual(
      app.waitForElement('viewEventViewCalendar').text(),
      account
    );
  }
});
