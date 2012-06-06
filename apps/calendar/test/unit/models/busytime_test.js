requireApp('calendar/js/responder.js');
requireApp('calendar/js/calc.js');
requireApp('calendar/js/models/busytime.js');

suite('models/busytime', function() {
  var subject;

  setup(function() {
    subject = new Calendar.Models.Busytime();
  });

  test('initialize', function() {
    assert.instanceOf(subject, Calendar.Responder);
    assert.isObject(subject.times);
    assert.isObject(subject.ids);
  });

  test('#add', function() {
    var date = new Date(2012, 0, 1),
        dateId = Calendar.Calc.getDayId(date);

    subject.add(date, 'uniq1');

    assert.deepEqual(subject.ids['uniq1'], date);
    assert.deepEqual(subject.times[dateId], {'uniq1': true});
  });

  test('#get', function() {
    var date = new Date();
    subject.add(date, '1');

    assert.deepEqual(subject.get('1'), date);
  });

  test('#remove', function() {
    var date = new Date();
    var dateId = Calendar.Calc.getDayId(date);
    var expectedTimes = {};
    expectedTimes[dateId] = {};


    subject.add(date, '2');

    var result = subject.remove('2');

    assert.ok(!subject.get('2'), 'should not have object for removed element');
    assert.deepEqual(subject.times, expectedTimes);
    assert.deepEqual(subject.ids, {});
    assert.isTrue(result);
  });

  test('#getHours', function() {
    subject.add(new Date(10, 1, 1, 1), '1');
    subject.add(new Date(10, 1, 1, 2), '2');

    var result = subject.getHours(new Date(10, 1, 1));

    assert.deepEqual(result, [1, 2]);
  });

});
