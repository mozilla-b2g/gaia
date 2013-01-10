require('/apps/calendar/test/integration/calendar_integration.js');

suite('calendar - navigation', function() {

  var device;
  var helper = IntegrationHelper;
  var app;
  var subject;

  function checkDates(all, input) {
    if (Array.isArray(input)) {
      var inputIdx = 0;
      var len = input.length;

      for (; inputIdx < len; inputIdx++) {
        if (checkDates(all, input[inputIdx])) {
          return true;
        }
      }
      return false;
    }

    var actualIdx = 0;
    var actualLen = all.length;

    for (; actualIdx < actualLen; actualIdx++) {
      if (all[actualIdx].valueOf() === input.valueOf()) {
        return true;
      }
    }

    return false;
  }

  function assertExcludeDate(actual, expected, msg) {
    assert.ok(
      !checkDates(actual, expected),
      ((msg) ? msg + ':' : '') +
        'expected ' + actual + ' not to contain: ' + expected
    );
  }

  function assertIncludeDate(actual, expected, msg) {
    assert.ok(
      checkDates(actual, expected),
      ((msg) ? msg + ':' : '') +
        'expected ' + actual + ' to contain: ' + expected
    );
  }

  suiteTeardown(function() {
    yield app.close();
  });

  MarionetteHelper.start(function(driver) {
    app = new CalendarIntegration(driver);
    subject = app.modifyEventView;
    device = app.device;
  });

  suiteSetup(function() {
    yield app.launch();
    var month = yield app.element('monthView');
    yield app.waitUntilElement(month, 'displayed');
  });

  teardown(function() {
    // reset to month view between tests
    yield app.monthView.navigate();
    var today = yield app.element('todayBtn');
    yield today.click();
  });

  test('day view', function() {
    var now = yield app.remoteDate();
    now = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    var dayView = yield app.element('dayView');
    var dayViewBtn = yield app.element('dayViewBtn');

    yield dayViewBtn.click();
    yield app.waitUntilElement(dayView, 'displayed');

    // today's date should be default
    var date = yield app.dayView.activeDates();
    date = Calendar.Calc.createDay(date[0]);
    assert.deepEqual(now, date);

    // swipe ahead then go back
    var currentTry = 0;
    var tries = 3;
    var shownDates = [];

    for (; currentTry < tries; currentTry++) {
      yield app.dayView.forward();
      var date = Calendar.Calc.createDay(
        (yield app.dayView.activeDates())[0]
      );
      shownDates.push(date);
    }

    // go backwards the same number of times to verify results.
    while (currentTry--) {
      var date = Calendar.Calc.createDay(
        (yield app.dayView.activeDates())[0]
      );

      assert.deepEqual(
        shownDates.pop(),
        date
      );

      yield app.dayView.back();
    }
  });

  test('display week', function() {
    var now = Calendar.Calc.createDay((yield app.remoteDate()));

    // manually verify week view can show up
    var week = yield app.element('weekView');
    var element = yield app.element('weekViewBtn');
    yield element.click();
    yield app.waitUntilElement(week, 'displayed');

    // verify it contains today's date
    var dates = yield app.weekView.activeDates();
    assertIncludeDate(dates, now);

    // next set of dates
    yield app.weekView.forward();

    var expected = [];
    var lastDate = now;
    // should have at least 3 more days when we swipe.
    for (var i = 1; i <= 3; i++) {
      lastDate = new Date(lastDate.valueOf());
      lastDate.setDate(lastDate.getDate() + 1);
      expected.push(lastDate);
    }

    var newDates = yield app.weekView.activeDates();

    assertExcludeDate(newDates, dates, 'should not contain old dates');
    assertIncludeDate(newDates, expected, 'should have three new dates');

    yield app.weekView.back();

    assert.deepEqual(
      (yield app.weekView.activeDates()),
      dates,
      'back works'
    );
  });

  test('moving forward between day -> week view', function() {
    yield app.weekView.navigate();
    var dates = yield app.weekView.activeDates();
    var firstWeekDate = Calendar.Calc.createDay(
      dates[0]
    );

    yield app.dayView.navigate();
    var steps = dates.length;
    for (var current = 0; current <= steps; current++) {
      yield app.dayView.forward();
    }

    yield app.weekView.navigate();
    var newDates = yield app.weekView.activeDates();

    // verify old dates are not present.
    assertExcludeDate(newDates, dates, 'only displays new dates');

    // verify a date after the last previous set of dates is present.
    var nextDate = new Date((dates[dates.length - 1]).valueOf());
    nextDate.setDate(nextDate.getDate() + 1);
    assertIncludeDate(newDates, nextDate, 'has a date in the future');
  });

});
