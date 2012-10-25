require('/apps/calendar/test/integration/calendar_integration.js');
/** require calc stuff to make things easier */
require('apps/calendar/js/calendar.js');
require('apps/calendar/js/calc.js');
require('apps/calendar/js/input_parser.js');

suite('calendar - modify events', function() {

  var InputParser = Calendar.InputParser;
  var device;
  var helper = IntegrationHelper;
  var app;
  var subject;

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

  MarionetteHelper.start(function(driver) {
    app = new CalendarIntegration(driver);
    subject = app.modifyEventView;
    device = app.device;
  });

  suiteSetup(function() {
    yield app.launch();
  });

  teardown(function() {
    // reset to month view between tests
    yield app.monthView.navigate();
  });

  test('add event - without pre-selected date', function() {
    var now = yield app.remoteDate();

    var element = yield subject.add();
    var values = yield subject.values();

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
    var dayEl = yield app.monthView.dateElement(now);
    yield dayEl.click();

    yield subject.add();

    var values = yield subject.values();
    var end = new Date(now.valueOf());
    end.setHours(end.getHours() + 1);

    // should start the times at the selected date
    assertFormDate(values, now, end);
  });

  test('add/delete event', function() {

    // setup and show event
    var now = yield app.remoteDate();
    var start = new Date(now.valueOf());
    var end = new Date(now.valueOf());
    end.setMinutes(start.getMinutes() + 30);

    yield subject.add();

    var newValues = Factory('form.modifyEvent', {
      title: 'my title',
      location: 'place',
      description: 'lengthy thing',
      start: start,
      end: end
    });

    // create the event

    yield subject.update(newValues);
    yield subject.save();

    var monthView = yield app.element('monthView');
    yield app.waitUntilElement(monthView, 'displayed');

    assert.isFalse((yield subject.displayed()), 'view is hidden after save');

    // find the event in the months day view
    var event = yield app.monthsDayView.eventByTitle(
      newValues.title
    );
    yield event.click();

    assert.hasProperties(
      (yield subject.values()),
      newValues,
      'view correctly persists values'
    );

    // delete the event
    yield subject.remove();

    // verify its gone
    yield app.waitUntilElement(monthView, 'displayed');
    var error;

    //TODO: this is fairly ugly we can improve this
    try {
      yield app.monthsDayView.eventByTitle(newValues.title);
    } catch (e) {
      error = e;
    } finally {
      assert.ok(error);
      assert.instanceOf(error, Marionette.Error.NoSuchElement);
    }
  });

});
