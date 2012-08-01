requireApp('calendar/test/unit/helper.js', function() {
  requireLib('provider/calendar/abstract.js');
  requireLib('models/calendar.js');
});

suite('models/calendar', function() {

  var subject;
  var remoteCalendar;
  var CalendarModel;

  suiteSetup(function() {
    CalendarModel = Calendar.Models.Calendar;
  });

  setup(function() {
    remoteCalendar = {
      id: 'one',
      syncToken: 'xxx'
    };

    subject = new Calendar.Models.Calendar({
      name: 'foo',
      provider: remoteCalendar
    });
  });

  suite('initialization', function() {

    test('when given a provider', function() {
      var date = new Date();

      subject = new CalendarModel({
        provider: remoteCalendar,
        lastEventSyncToken: '0',
        lastEventSyncDate: date
      });

      assert.deepEqual(
        subject.remote,
        remoteCalendar
      );

      assert.equal(subject.lastEventSyncDate, date);
    });

    test('when given remote', function() {
      subject = new CalendarModel({
        remote: remoteCalendar
      });

      assert.deepEqual(subject.remote, remoteCalendar);
    });
  });

  test('#updateRemote', function() {
    remoteCalendar.id = 'foo';
    subject.updateRemote(remoteCalendar);
    assert.equal(subject.remote.id, 'foo');
  });

  suite('#eventSyncNeeded', function() {

    test('when remote and local match', function() {
      subject.remote.syncToken = 'foo';
      subject.lastEventSyncToken = 'foo';

      assert.isFalse(subject.eventSyncNeeded());
    });

    test('when remote and local differ', function() {
      subject.remote.syncToken = 'foo';
      subject.lastEventSyncToken = 'bar';

      assert.isTrue(subject.eventSyncNeeded());
    });
  });

  test('#toJSON', function() {
    var expected = {
      lastEventSyncToken: subject.lastEventSyncToken,
      lastEventSyncDate: subject.lastEventSyncDate,
      localDisplayed: subject.localDisplayed,
      accountId: subject.accountId,
      remote: subject.remote
    };

    assert.deepEqual(subject.toJSON(), expected);
  });

  test('#name', function() {
    subject.remote.name = 'foo';
    assert.equal(subject.name, 'foo');
  });

  test('#color', function() {
    subject.remote.color = '#ccc';
    assert.equal(subject.color, '#ccc');
  });

  test('#description', function() {
    subject.remote.description = 'foo';
    assert.equal(subject.description, 'foo');
  });

});
