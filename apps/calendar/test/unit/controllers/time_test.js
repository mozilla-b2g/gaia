requireApp('calendar/test/unit/helper.js', function() {
});

window.page = window.page || {};

suite('controller', function() {
  var subject;

  setup(function() {
    subject = new Calendar.Controllers.Time();
  });

  test('initialize', function() {
    assert.instanceOf(subject, Calendar.Responder);
  });

  suite('setters', function() {

    function isSetter(fn, attr, value) {

      var val = value || 'val';

      test('#' + attr, function() {
        var eventFired;
        subject.on(attr + 'Change', function(value) {
          eventFired = value;
        });

        subject[fn](val);

        assert.equal(subject[attr], val);
        assert.equal(eventFired, val);
      });
    }

    isSetter('setCurrentMonth', 'currentMonth', new Date());
    isSetter('setSelectedDay', 'selectedDay');
  });

});
