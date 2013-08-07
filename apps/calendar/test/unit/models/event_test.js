suiteGroup('Models.Event', function() {

  var subject;
  var provider;
  var rawEvent;
  var remote;

  var start = new Date(2012, 0, 1);
  var end = new Date(2012, 0, 1, 12);

  var originalDates = {
    start: start,
    end: end
  };

  setup(function() {

    rawEvent = Factory.create('event', {
      remote: {
        syncToken: '7ee',
        startDate: start,
        endDate: end,
        start: Calendar.Calc.dateToTransport(start),
        end: Calendar.Calc.dateToTransport(end)
      }
    });

    remote = rawEvent.remote;
    subject = new Calendar.Models.Event(rawEvent);
  });


  suite('initialization', function() {
    test('from existing model', function() {
      assert.equal(subject.data, rawEvent);
    });

    test('from existing "allday" model', function() {
      var data = Factory.build('event', {
        remote: {
          startDate: new Date(2012, 1, 1),
          endDate: new Date(2012, 1, 2)
        }
      });

      var subject = new Calendar.Models.Event(
        data
      );

      assert.isTrue(subject.isAllDay, 'is all day');
    });

    test('from existing model without .startDate/.endDate', function() {
      var event = new Calendar.Models.Event();
      var start = new Date(2012, 0, 1);
      var end = new Date(2012, 0, 5);

      event.startDate = start;
      event.endDate = end;

      var data = event.data;
      delete data.remote.startDate;
      delete data.remote.endDate;

      var newEvent = new Calendar.Models.Event(data);
      assert.deepEqual(newEvent.startDate, start);
      assert.deepEqual(newEvent.endDate, end);
    });

    test('from new model', function() {
      subject = new Calendar.Models.Event();
      assert.ok(subject.data, 'has data');
      assert.ok(subject.data.remote, 'has remote');

      assert.instanceOf(
        subject.startDate,
        Date,
        'pre-populates start date'
      );

      assert.instanceOf(
        subject.endDate,
        Date,
        'pre-populates end date'
      );
    });
  });

  function remoteSetter(type) {
    test('#' + type + ' setter/getter', function() {
      var value = 'foo';
      subject[type] = value;
      assert.equal(rawEvent.remote[type], value, 'raw data ' + type);
      assert.equal(subject[type], value, 'get ' + type);
    });
  }

  // need a var for gjslint parse error?
  var dateFields = ['start', 'end'];
  dateFields.forEach(function(field) {
    var remoteDateField = field + 'Date';

    suite('#' + remoteDateField, function() {
      test('initial value', function() {
        assert.deepEqual(
          originalDates[field],
          subject[remoteDateField]
        );
      });

      test('set value', function() {
        var date = new Date(2012, 0, 1, 2);
        var transport =
          Calendar.Calc.dateToTransport(date);

        subject[remoteDateField] = date;
        assert.deepEqual(
          remote[remoteDateField],
          date,
          remoteDateField
        );

        assert.deepEqual(
          remote[field],
          transport,
          field
        );
      });

      test('prevents non-date values when isAllDay', function() {
        subject.isAllDay = true;

        var date = new Date(2012, 1, 1, 1, 5);
        var expected = new Date(2012, 1, 1);
        var transport = Calendar.Calc.dateToTransport(
          expected, null, true
        );

        subject[remoteDateField] = date;

        assert.deepEqual(
          subject[remoteDateField],
          expected,
          'date'
        );

        assert.deepEqual(
          subject.remote[field],
          transport,
          'trasport'
        );
      });

      test('clears when is .allDay', function() {
        subject.isAllDay = true;
        assert.isTrue(
          Calendar.Calc.isOnlyDate(subject[remoteDateField]),
          'is only date'
        );

        assert.isTrue(
          subject.remote[field].isDate,
          'is date'
        );
      });
    });
  });

  test('#isAllDay', function() {
    subject.isAllDay = true;

    assert.isTrue(
      Calendar.Calc.isOnlyDate(subject.startDate),
      'removes time from start'
    );

    assert.isTrue(
      Calendar.Calc.isOnlyDate(subject.endDate),
      'removes time from end'
    );

    assert.isTrue(
      subject.remote.start.isDate,
      'sets start to date'
    );

    assert.isTrue(
      subject.remote.end.isDate,
      'sets end to date'
    );
  });

  test('#calendarId', function() {
    subject.calendarId = 7;
    assert.equal(rawEvent.calendarId, 7);
    assert.equal(subject.calendarId, 7);
  });

  test('#calendarId with string input', function() {
    subject.calendarId = '7';
    assert.strictEqual(rawEvent.calendarId, 7);
    assert.strictEqual(subject.calendarId, 7);
  });

  test('#_id', function() {
    rawEvent._id = 'foo';

    assert.equal(subject._id, 'foo');
  });

  suite('#validationErrors', function() {
    test('no errors', function() {
      var event = new Calendar.Models.Event();
      event.startDate = new Date(2012, 0, 1);
      event.endDate = new Date(2012, 0, 2);

      assert.ok(!event.validationErrors(), 'has no errors');
    });

    function hasError(event, type) {
      var errors = event.validationErrors();
      assert.length(errors, 1);
      assert.deepEqual(
        errors[0], {
          name: type
        },
        'has error: "' + type + '"'
      );
    }

    test('start date >(=) end date', function() {
      var event = new Calendar.Models.Event();
      event.startDate = new Date(2020, 0, 2);
      event.endDate = new Date(2012, 0, 1);

      // start date > end date
      hasError(event, 'start-after-end');
      // start date == end date
      event.startDate = new Date(event.endDate.valueOf());
      hasError(event, 'start-after-end');
    });
  });

  suite('update attributes', function() {
    var eventWithoutErrors;
    var eventWithErrors;
    var event;
    var model;
    setup(function() {
      event = Factory.create('event', {
        remote: {
          syncToken: '7ee',
          startDate: new Date(2019, 1, 2),
          endDate: new Date(2020, 0, 2),
          start: Calendar.Calc.dateToTransport(start),
          end: Calendar.Calc.dateToTransport(end)
        }
      });
      model = new Calendar.Models.Event(event);
      eventWithoutErrors = {
        startDate: new Date(2019, 1, 2),
        endDate: new Date(2020, 1, 2)
      };
      eventWithErrors = {
        startDate: new Date(2019, 1, 2),
        endDate: new Date(2019, 0, 2)
      };
    });

    test('does not update attributes', function() {
      var errors = model.updateAttributes(eventWithErrors);
      assert.ok(errors);
      assert.deepEqual(errors[0].name, 'start-after-end');
    });

    test('will update attributes', function() {
      var errors = model.updateAttributes(eventWithoutErrors);
      assert.strictEqual(errors, true);
      assert.deepEqual(model.endDate, eventWithoutErrors.endDate);
    });
  });

  remoteSetter('syncToken');
  remoteSetter('location');
  remoteSetter('description');
  remoteSetter('title');
  remoteSetter('alarms');
 });
