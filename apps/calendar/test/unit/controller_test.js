requireApp('calendar/test/unit/helper.js', function() {
  requireCalendarController();
});

suite('controller', function() {
  var subject;

  setup(function() {
    subject = new Calendar.Controller({
      events: new Calendar.Models.Events,
      busytime: new Calendar.Models.Busytime
    });
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
    isSetter('setInSettings', 'inSettings', true);
  });

});
