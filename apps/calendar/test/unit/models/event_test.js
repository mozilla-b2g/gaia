requireApp('calendar/test/unit/helper.js', function() {
  requireLib('models/event.js');
});

suite('models/event', function() {
  var subject;
  var provider;
  var rawEvent;
  var remote;

  var start = new Date(2012, 0, 1);
  var end = new Date(2012, 0, 1, 12);

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

  suite('#endDate', function() {
    test('initial value', function() {
      assert.deepEqual(
        end,
        subject.endDate
      );
    });

    test('set value', function() {
      var newEnd = new Date(2012, 0, 1, 2);
      var end = Calendar.Calc.dateToTransport(newEnd);

      subject.endDate = newEnd;
      assert.deepEqual(
        remote.endDate,
        newEnd,
        '.endDate'
      );

      assert.deepEqual(
        remote.end,
        end,
        '.end'
      );
    });
  });

  suite('#startDate', function() {
    test('initial value', function() {
      assert.deepEqual(
        start,
        subject.startDate
      );
    });

    test('set value', function() {
      var newStart = new Date(2012, 0, 1, 2);
      var start = Calendar.Calc.dateToTransport(newStart);

      subject.startDate = newStart;
      assert.deepEqual(
        remote.startDate,
        newStart,
        '.startDate'
      );

      assert.deepEqual(
        remote.start,
        start,
        '.start'
      );
    });
  });

  suite('#isAllDay', function() {
    setup(function() {
      subject.startDate = new Date(
        2012, 0, 1, 1, 1
      );

      subject.endDate = new Date(
        2012, 0, 1, 2, 2
      );
    });

    test('start 00:00:00', function() {
      subject.startDate.setMinutes(0);
      subject.startDate.setHours(0);
      assert.isFalse(subject.isAllDay);
    });

    test('end 00:00:00', function() {
      subject.endDate.setMinutes(0);
      subject.endDate.setHours(0);
      assert.isFalse(subject.isAllDay);
    });

    test('both at 00:00:00', function() {
      // reset end
      subject.endDate.setHours(0);
      subject.endDate.setMinutes(0);
      // reset start
      subject.startDate.setHours(0);
      subject.startDate.setMinutes(0);

      assert.isTrue(subject.isAllDay);
    });
  });

  test('#calendarId', function() {
    subject.calendarId = 7;
    assert.equal(rawEvent.calendarId, 7);
    assert.equal(subject.calendarId, 7);
  });

  test('#_id', function() {
    rawEvent._id = 'foo';

    assert.equal(subject._id, 'foo');
  });

  remoteSetter('syncToken');
  remoteSetter('location');
  remoteSetter('description');
  remoteSetter('title');
 });
