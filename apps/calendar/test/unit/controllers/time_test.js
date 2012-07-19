requireApp('calendar/test/unit/helper.js', function() {
});

window.page = window.page || {};

suite('controller', function() {
  var subject;
  var app;

  setup(function() {
    app = testSupport.calendar.app();
    subject = new Calendar.Controllers.Time(app);
  });

  test('initialize', function() {
    assert.equal(subject.app, app);
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
