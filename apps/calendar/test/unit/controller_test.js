requireApp('calendar/test/unit/helper.js', function() {
  requireCalendarController();
});

window.page = window.page || {};

suite('controller', function() {
  var subject;

  setup(function() {
    subject = new Calendar.Controller({
      events: new Calendar.Store.Event,
      busytime: new Calendar.Store.Busytime
    });
  });

  test('initialize', function() {
    assert.instanceOf(subject, Calendar.Responder);
  });

  suite('#go', function() {
    var oldShow;
    var calledWith;

    setup(function() {
      if (!window.page) {
        window.page = {};
      }

      oldShow = page.show;
      page.show = function(url) {
        calledWith = url;
      };
    });

    teardown(function() {
      page.show = oldShow;
    });

    test('result', function() {
      subject.go('/settings');
      assert.equal(calledWith, '/settings');
    });

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
