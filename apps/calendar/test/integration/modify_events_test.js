requireCommon('/test/marionette.js');
require('apps/calendar/test/integration/integration_helper.js');
require('apps/calendar/test/integration/app.js');

/** require calc stuff to make things easier */
require('apps/calendar/js/calendar.js');
require('apps/calendar/js/calc.js');
require('apps/calendar/js/input_parser.js');

suite('calendar - modify events', function() {

  var InputParser = Calendar.InputParser;
  var device;
  var helper = IntegrationHelper;
  var app;

  /**
   * Converts a js date object into a HTML input[type="time"] format.
   * By default it will omit minutes and seconds
   *
   * @param {Date} date js date.
   * @return {String} hh:mm::ss (02:23:59).
   */
  function htmlTime(date, minutes=false, seconds=false) {
    // clone so we don't modify the original
    date = new Date(date.valueOf());

    if (!minutes)
      date.setMinutes(0);

    if (!seconds)
      date.setSeconds(0);

    // convert to string
    return InputParser.exportTime(date);
  }

  function parseDate(object) {
    if (typeof(object) === 'string') {
      object = InputParser.importDate(object);
    }

    return new Date(
      object.year,
      object.month,
      object.date
    );
  }

  function assertFormDate(values, start, end) {
    assert.deepEqual(
      Calendar.Calc.createDay(start),
      parseDate(values.startDate),
      'start date'
    );

    assert.deepEqual(
      Calendar.Calc.createDay(end),
      parseDate(values.endDate),
      'end date'
    );

    assert.deepEqual(
      htmlTime(start),
      values.startTime,
      'start time'
    );

    assert.deepEqual(
      htmlTime(end),
      values.endTime,
      'end time'
    );
  }

  suiteTeardown(function() {
    yield app.close();
  });

  testSupport.startMarionette(function(driver) {
    device = driver;
    app = new CalendarIntegration(device);
  });

  suiteSetup(function() {
    yield device.setScriptTimeout(5000);
    yield helper.importScript(
      device,
      '/tests/marionette/gaiatest/gaia_apps.js',
      MochaTask.nodeNext
    );

    yield app.launch();
  });

  teardown(function() {
    // doing something somewhat sneaky here
    // we use calendar js methods to force display
    // of month view. This may be a bad idea later...
    yield device.executeScript(function() {
      window.wrappedJSObject.Calendar.App.go('/month/');
    });

    // don't continue until we know month is displayed...
    var month = yield app.element('monthView');
    yield app.waitUntilElement(month, 'displayed');
  });

  function showView(app, next, callback) {
    var add = yield app.element('addEventBtn');

    yield helper.waitFor(add.displayed.bind(add), next);

    yield add.click(next);
    // show view
    var view = yield app.element('modifyEventView');
    var viewVisible = yield view.displayed();

    // verify visible
    assert.isTrue(viewVisible, 'shows modify event');

    callback(null, view);
  };

  test('add event - without pre-selected date', function() {
    var now = yield app.remoteDate();

    var view = yield app.task(showView);
    var values = yield app.formValues('eventFormFields');

    var start = new Date(now.valueOf());
    start.setHours(start.getHours() + 1);

    var end = new Date(now.valueOf());
    end.setHours(end.getHours() + 2);

    assertFormDate(values, start, end);
  });

  test('add event - different day selected', function() {
    var now = yield app.remoteDate();

    // remove the time information
    now = Calendar.Calc.createDay(now);

    // increment to tomorrow
    now.setDate(now.getDate() + 1);

    // tap the next day in the month view
    var id = Calendar.Calc.getDayId(now);
    var month = yield app.element('monthView');
    var dayEl = yield month.findElement('[data-date="' + id + '"]');
    yield dayEl.click();

    // click create event
    yield app.task(showView);

    var values = yield app.formValues('eventFormFields');
    var end = new Date(now.valueOf());
    end.setHours(end.getHours() + 1);

    // should start the times at the selected date
    assertFormDate(values, now, end);
  });

});
