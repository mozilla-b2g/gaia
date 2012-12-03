require('/apps/calendar/test/integration/calendar_integration.js');

suite('calendar - modify events', function() {

  var InputParser = Calendar.Utils.InputParser;
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
    var btn = yield app.element('addEventBtn');
    yield app.waitUntilElement(btn, 'displayed');
  });

  teardown(function() {
    // reset to month view between tests
    yield app.resetSearchTimeout('long');
    yield app.monthView.navigate();
    var today = yield app.element('todayBtn');
    yield today.click();
  });

  test('all day events', function() {
    this.timeout(50000);

    var today = Calendar.Calc.createDay(yield app.remoteDate());
    var tomorrow = new Date(today.valueOf());
    tomorrow.setDate(tomorrow.getDate() + 1);

    var events = 3;
    var positions = [];

    function assertNotInPositions(object) {
      positions.forEach(function(other, idx) {
        if (object.top === other.top) {
          throw new Error(
            'position overlap! event starts on another.'
          );
        }
      });
    }

    for (var i = 0; i < events; i++) {
      yield subject.add();

      var values = Factory('form.modifyEvent', {
        title: uuid(),
        location: 'place',
        description: 'lengthy thing',
        start: today,
        end: tomorrow
      });

      yield subject.update(values);
      var allday = yield app.element('eventFormAllDay');
      yield allday.click();
      yield subject.save();

      var monthView = yield app.element('monthView');
      yield app.waitUntilElement(monthView, 'displayed');

      // find the event in the months day view
      var event = yield app.monthsDayView.eventByTitle(
        values.title
      );

      var displayed = yield event.displayed();
      assert.ok(
        displayed,
        'all day event #' + (i + 1) + ' should be displayed'
      );

      var pos = yield app.getPosition(event);

      assertNotInPositions(pos);
      positions.push(pos);
    }
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

    now = Calendar.Calc.createDay(now);

    // we move to the next month to avoid issues
    // where we run out of dates to pick in the current month.
    now.setDate(25);
    now.setMonth(now.getMonth() + 1);

    yield app.monthView.forward();

    // tap the next day in the month view
    var dayEl = yield app.monthView.dateElement(now);

    yield app.waitUntilElement(dayEl, 'displayed');
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
      // set the search timeout to a lower amount
      // (we know there is minimal wait here).
      yield app.resetSearchTimeout('short');
      yield app.monthsDayView.eventByTitle(newValues.title);
    } catch (e) {
      error = e;
    } finally {
      assert.ok(error);
      assert.instanceOf(error, Marionette.Error.NoSuchElement);
    }
  });

  test('edit event (update time)', function() {
    yield subject.add();
    var start = yield app.remoteDate();
    var end = new Date(start.valueOf());
    end.setHours(end.getHours() + 1);

    var values = Factory('form.modifyEvent', {
      title: 'new event',
      start: start,
      end: end
    });

    yield subject.update(values);
    yield subject.save();

    var monthView = yield app.element('monthView');
    yield app.waitUntilElement(monthView, 'displayed');

    var element = yield app.monthsDayView.eventByTitle(
      values.title
    );

    yield element.click();
    yield subject.waitUntilVisible();

    start.setDate(start.getDate() + 1);
    end.setDate(end.getDate() + 1);

    var updateValues = Factory('form.modifyEvent', {
      end: end,
      start: start
    });

    yield subject.update(updateValues);
    yield subject.save();
    yield app.waitUntilElement(monthView, 'displayed');

    // find the element again its going to be different
    // this time around because we moved it.
    element = yield app.monthsDayView.eventByTitle(
      values.title
    );

    yield element.click();
    yield subject.waitUntilVisible();

    var expected = updateValues;
    expected.title = values.title;

    assert.hasProperties(
      (yield subject.values()),
      expected,
      'updates element'
    );

    yield subject.remove();
  });

  test('attempt to add event where start > end', function() {
    yield subject.add();
    var now = yield app.remoteDate();

    var start = new Date(now.valueOf());
    start.setDate(start.getDate() + 1);
    var end = new Date(now.valueOf());

    var status = yield app.element('eventFormStatus');
    var error = yield app.element('eventFormError');

    assert.isFalse((yield status.displayed()), 'status is hidden');

    var values = Factory('form.modifyEvent', {
      title: 'fail plz',
      start: start,
      end: end
    });

    yield subject.update(values);
    yield subject.save();

    assert.isTrue((yield subject.displayed()), 'still shows add event');
    assert.isTrue((yield status.displayed()), 'shows status');

    var text = yield error.text();
    assert.ok(text, 'has error text');
    assert.include(text, 'start date');

    // verify that status is hidden again...
    yield app.waitFor(function(callback) {
      status.displayed(function(err, value) {
        if (err) {
          callback(err);
          return;
        }
        callback(null, !value);
      });
    }, 10000);
  });

});
