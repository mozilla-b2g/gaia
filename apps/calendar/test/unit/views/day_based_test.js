requireApp('calendar/test/unit/helper.js', function() {
  requireLib('timespan.js');
  requireLib('ordered_map.js');
  requireLib('views/day_based.js');
});

suite('views/hour_based', function() {

  var OrderedMap;

  suiteSetup(function() {
    OrderedMap = Calendar.OrderedMap;
  });

  var subject;
  var app;
  var date = new Date(2012, 1, 5);
  var id = 0;
  var hours;

  function eventHolder() {
    return { remote: {}, _id: id++ };
  }

  setup(function() {
    id = 0;
    app = testSupport.calendar.app();

    subject = new Calendar.Views.DayBased({
      date: date,
      app: app
    });

    // bare bones this class is abstract
    // so needs some additional methods to
    // meaningful things...
    subject._insertHour = function(hour) {
      return { records: new OrderedMap() };
    }

    subject._insertRecord = function(hour, busytime) {
      return { busytime: busytime };
    }

    hours = subject.hours;

  });

  test('initialization', function() {
    assert.instanceOf(subject, Calendar.View);
    assert.equal(subject.app, app);
    assert.instanceOf(subject.timespan, Calendar.Timespan);

    var expectedSpan = Calendar.Calc.spanOfDay(date);
    assert.deepEqual(subject.timespan, expectedSpan);

    assert.instanceOf(subject.hours, OrderedMap);
  });

  test('#createRecord', function() {
    var obj = {};
    var calledWith;
    var busytime = Factory.create('busytime', {
      startDate: new Date(2012, 1, 1)
    });

    subject._insertRecord = function(hour, busy) {
      calledWith = arguments;
      return {
        busytime: busy
      };
    }

    var hours = subject.hours;

    subject.createRecord(1, busytime, obj);

    var expected = {};

    expected[busytime._id] = [1];
    assert.deepEqual(subject._idsToHours, expected);

    assert.deepEqual(
      calledWith,
      [1, busytime, obj]
    );

    assert.ok(hours.has(1));

    var hour = hours.get(1);
    var record = hour.records.get(busytime._id);
    assert.deepEqual(record, { busytime: busytime });
  });

  test('#createHour', function() {
    subject.createHour(1);

    var record = subject.hours.get(1);
    assert.instanceOf(record.records, OrderedMap);
  });

  suite('#add', function() {
    var hours;

    setup(function() {
      hours = subject.hours;
    });

    test('add single missing hour', function() {
      var event = {
        isEvent: true
      };

      var busytime = Factory('busytime', {
        startDate: new Date(2012, 1, 5, 5),
        endDate: new Date(2012, 1, 5, 6)
      });

      subject.add(busytime, event);

      var hour = hours.get(5);
      assert.ok(hour);

      var records = hour.records;
      assert.ok(records.has(busytime._id));
    });

  });

  suite('#remove', function() {
    var busytime;

    setup(function() {
      busytime = Factory('busytime', {
        startDate: new Date(2012, 1, 5, 1),
        startEnd: new Date(2012, 1, 5, 3)
      });

      subject.add(busytime);

      var hour = hours.get(1);
      assert.ok(hour);
      assert.ok(hour.records.get(busytime._id));
    });

    test('remove busytime', function() {
      var calledWith;
      var id = busytime._id;

      subject._removeRecord = function() {
        Calendar.Views.DayBased.prototype._removeRecord.apply(
          this, arguments
        );
        calledWith = arguments;
      }

      subject.remove(busytime);

      assert.ok(!subject._idsToHours[id]);

      assert.ok(!hours.get(1).records.has(id));
      assert.ok(!hours.get(2).records.has(id));

      assert.deepEqual(calledWith, [busytime]);
    });

  });

  test('#removeHour', function() {
    var calledWith;
    var busytime = Factory.create('busytime', {
      startDate: date
    });

    subject._removeHour = function() {
      calledWith = arguments;
    }

    subject.add(busytime);
    subject.removeHour(0);

    assert.ok(!hours.get(0));
    assert.deepEqual(calledWith, [0]);
  });

});
