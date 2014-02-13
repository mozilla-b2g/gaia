var Calendar = require('./calendar'),
    assert = require('chai').assert,
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

  test.skip('should highlight today item in month view', function() {
    var currentMonthYearHeader = app
      .waitForElement('monthYearHeader')
      .getAttribute('data-date');

    var monthView = app.waitForElement('monthViewpresent');
    var day = client.helper.waitForChild(monthView, '.day');
    var currentDate = day.text();
    var expectedDate = new Date();
    assert.equal(currentDate, expectedDate.getDate());
    assert.equal(
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
    assert.equal(selectedDate, expectedDate.getDate());
    assert.equal(
      moment(currentMonthYearHeader).format(DATE_FORMAT),
      moment(expectedDate).format(DATE_FORMAT)
    );
  });
});
