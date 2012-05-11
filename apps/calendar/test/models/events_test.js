requireApp('calendar/js/responder.js');
requireApp('calendar/js/calc.js');
requireApp('calendar/js/models/events.js');

suite('models/events', function() {
  var subject,
      obj = {
        name: '1'
      };

  setup(function() {
    subject = new Calendar.Models.Events();
  });

  test('initialize', function() {
    assert.instanceOf(subject, Calendar.Responder);
    assert.isObject(subject.times);
    assert.isObject(subject.ids);
  });

  test('#add', function() {
    var date = new Date(2012, 0, 1),
        dateId = Calendar.Calc.getDayId(date);

    subject.add(date, 'uniq1', obj);

    assert.deepEqual(subject.ids['uniq1'], { event: obj, date: date });
    assert.deepEqual(subject.times[dateId], {'uniq1': true});
  });

  test('#get', function() {
    var date = new Date();
    subject.add(date, '1', obj);

    assert.deepEqual(subject.get('1'), { event: obj, date: date });
  });

  test('#remove', function() {
    var date = new Date();
    var dateId = Calendar.Calc.getDayId(date);
    var expectedTimes = {};
    expectedTimes[dateId] = {};


    subject.add(date, '2', obj);
    var result = subject.remove('2');

    assert.ok(!subject.get('2'), 'should not have object for removed element');
    assert.deepEqual(subject.times, expectedTimes);
    assert.deepEqual(subject.ids, {});
    assert.isTrue(result);
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
      console.log(expected);

      assert.deepEqual(result, expected);
    });

  });

});

