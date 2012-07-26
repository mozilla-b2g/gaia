requireApp('calendar/test/unit/helper.js', function() {
  requireLib('ext/caldav.js');
  requireLib('provider/event/abstract.js');
  requireLib('provider/event/caldav.js');
});

suite('provider/event/caldav', function() {

  var subject;
  var ics;

  suiteSetup(function(done) {
    testSupport.calendar.loadSample('single_event.ics', function(err, data) {
      if (err) {
        done(err);
        return;
      }
      ics = data.trim();
      done();
    });
  });

  setup(function() {
    subject = new Calendar.Provider.Event.Caldav();
  });

  test('initializer', function() {
    assert.instanceOf(
      subject,
      Calendar.Provider.Event.Abstract
    );
  });

  suite('#mapRemote', function() {

    test('from parsed ics', function() {
      var parsed = ICAL.parse(ics);

      subject.mapRemote(parsed);

      // look at single_event.ics for
      // the correct values.
      assert.equal(subject.title, 'Summary Name');
      assert.equal(subject.description, 'ICAL Description');
      assert.equal(subject.location, 'My Loc');

      var start = subject.startDate.valueOf();
      var end = subject.endDate.valueOf();

      // June 30th 2012 6pm
      var expectedStart = new Date(
        2012,
        5,
        30,
        6
      ).valueOf();


      // June 30th 2012 7pm
      var expectedEnd = new Date(
        2012,
        5,
        30,
        7
      ).valueOf();

      assert.equal(start, expectedStart, 'start date');
      assert.equal(end, expectedEnd, 'end date');
    });

  });

});

