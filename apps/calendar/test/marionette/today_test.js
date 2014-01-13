var Calendar = require('./calendar'),
    assert = require('assert'),
    moment = require('moment');

const DATE_FORMAT = 'YYYY-MM-DD';

marionette('today item', function() {
  var client = marionette.client({
        settings: { 'keyboard.ftu.enabled': false }
      }),
      app = null;

  setup(function() {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });
  });

  test('should highlight today item in month view', function() {
    var currentMonthYearHeader = app
      .waitForElement('monthYearHeader')
      .getAttribute('data-date');

    var monthView = app.waitForElement('monthViewpresent');
    var day = client.helper.waitForChild(monthView, '.day');
    var currentDate = day.text();
    var expectedDate = new Date();
    assert.deepEqual(currentDate, expectedDate.getDate());
    assert.deepEqual(
      moment(currentMonthYearHeader).format(DATE_FORMAT),
      moment(expectedDate).format(DATE_FORMAT)
    );
  });

  test('should back to today', function() {
    var expectedDate = new Date();

    app.swipe();
    app
      .waitForElement('todayTabItem')
      .click();
    var currentMonthYearHeader = app
      .waitForElement('monthYearHeader')
      .getAttribute('data-date');

    var monthView = app.waitForElement('monthViewselected');
    var day = client.helper.waitForChild(monthView, '.day');
    var selectedDate = day.text();
    assert.deepEqual(selectedDate, expectedDate.getDate());
    assert.deepEqual(
      moment(currentMonthYearHeader).format(DATE_FORMAT),
      moment(expectedDate).format(DATE_FORMAT)
    );
  });
});
