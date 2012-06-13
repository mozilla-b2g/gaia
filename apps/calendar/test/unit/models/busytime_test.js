requireApp('calendar/js/responder.js');
requireApp('calendar/js/calc.js');
requireApp('calendar/js/models/busytime.js');

suite('models/busytime', function() {
  var subject, events;

  setup(function() {
    subject = new Calendar.Models.Busytime();
    events = {};
  });

  test('initialize', function() {
    assert.instanceOf(subject, Calendar.Responder);
    assert.isObject(subject.times);
    assert.isObject(subject.ids);
  });

  function watchEvent(type) {
    events[type] = [];

    subject.on(type, function() {
      events[type].push(Array.prototype.slice.call(arguments));
    });
  }

  suite('#add', function() {
    var date, dateId;

    setup(function() {
      date = new Date(2012, 0, 1);
      dateId = Calendar.Calc.getDayId(date);

      watchEvent('add');
      watchEvent('add ' + dateId);

      subject.add(date, 'uniq1');
    });

    test('storage', function() {
      assert.deepEqual(subject.ids['uniq1'], date);
      assert.deepEqual(subject.times[dateId], {'uniq1': true});
    });

    test('events', function() {
      var expected = [['uniq1', subject.get('uniq1')]];

      assert.deepEqual(events['add'], expected, 'should fire add');
      assert.deepEqual(
        events['add ' + dateId],
        expected,
       'should fire add-dateid'
      );
    });
  });

  test('#get', function() {
    var date = new Date();
    subject.add(date, '1');

    assert.deepEqual(subject.get('1'), date);
  });

  suite('#remove', function() {
    var date = new Date(), dateId,
        expectedTimes, result;

    setup(function() {
      dateId = Calendar.Calc.getDayId(date);
      expectedTimes = {};
      expectedTimes[dateId] = {};

      watchEvent('remove');
      watchEvent('remove ' + dateId);

      subject.add(date, '2');
      result = subject.remove('2');
    });

    test('event', function() {
      var expected = [['2', date]];

      assert.deepEqual(
        events['remove'],
        expected,
        'should fire remove event'
      );

      assert.deepEqual(
        events['remove ' + dateId],
        expected,
        'should fire remove dateid event'
      );
    });

    test('removal', function() {
      assert.ok(
        !subject.get('2'),
        'should not have object for removed element'
      );
      assert.deepEqual(subject.times, expectedTimes);
      assert.deepEqual(subject.ids, {});
      assert.isTrue(result);
    });

  });

  test('#getHours', function() {
    subject.add(new Date(10, 1, 1, 1), '1');
    subject.add(new Date(10, 1, 1, 2), '2');

    var result = subject.getHours(new Date(10, 1, 1));

    assert.deepEqual(result, [1, 2]);
  });

});
