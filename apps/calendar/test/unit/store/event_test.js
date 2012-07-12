requireApp('calendar/js/responder.js');
requireApp('calendar/js/calc.js');
requireApp('calendar/js/store/event.js');

suite('store/event', function() {
  var subject,
      obj = {
        name: '1'
      };

  setup(function() {
    subject = new Calendar.Store.Event();
  });

  test('initialize', function() {
    assert.instanceOf(subject, Calendar.Responder);
    assert.isObject(subject.times);
    assert.isObject(subject.ids);
  });

  suite('#add', function() {
    var date, dateId, eventCalled = [];

    setup(function(done) {
      eventCalled.length = 0;
      date = new Date(2012, 0, 1);
      dateId = Calendar.Calc.getDayId(date);

      subject.on('add', function() {
        eventCalled.push(Array.prototype.slice.call(arguments));
        done();
      });

      subject.add(date, 'uniq1', obj);
    });

    test('storage', function() {
      assert.deepEqual(subject.ids['uniq1'], { event: obj, date: date });
      assert.deepEqual(subject.times[dateId], {'uniq1': true});
    });

    test('event', function() {
      assert.deepEqual(eventCalled, [
        ['uniq1', subject.get('uniq1')]
      ]);
    });

  });

  test('#get', function() {
    var date = new Date();
    subject.add(date, '1', obj);

    assert.deepEqual(subject.get('1'), { event: obj, date: date });
  });

  suite('#remove', function() {
    var date, dateId, expectedTimes, result,
        eventCalled = [], getObj;

    setup(function(done) {
      eventCalled.length = 0;
      date = new Date();
      dateId = Calendar.Calc.getDayId(date);
      expectedTimes = {};
      expectedTimes[dateId] = {};

      subject.on('remove', function() {
        eventCalled.push(Array.prototype.slice.call(arguments));
        done();
      });

      subject.add(date, '2', obj);
      getObj = subject.get('2');
      result = subject.remove('2');
    });

    test('event', function() {
      assert.deepEqual(eventCalled, [
        ['2', getObj]
      ]);
    });

    test('removal', function() {
      assert.ok(!subject.get('2'),
                'should not have object for removed element');

      assert.deepEqual(subject.times, expectedTimes);
      assert.deepEqual(subject.ids, {});
      assert.isTrue(result);
    });

  });

  suite('#eventsForDay', function() {
    var day = new Date(2012, 1, 1),
        obj1 = {foo: true},
        obj2 = {bar: true},
        expected = [];

    setup(function() {
      expected.push({
        event: obj2,
        date: day
      });

      expected.push({
        event: obj1,
        date: day
      });

      subject.add(day, '1', obj2);
      subject.add(day, '2', obj1);
    });

    test('when day has events', function() {
      var result = subject.eventsForDay(day);

      assert.deepEqual(result, expected);
    });

  });

});

