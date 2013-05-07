suiteGroup('Models.Calendar', function() {

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
      remote: remoteCalendar
    });
  });

  suite('initialization', function() {

    test('when given a remote', function() {
      var date = new Date();

      subject = new CalendarModel({
        remote: remoteCalendar,
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
    subject._id = '1';
    var date = subject.firstEventSyncDate = new Date(2012, 0, 1);

    var expected = {
      error: undefined,
      lastEventSyncToken: subject.lastEventSyncToken,
      lastEventSyncDate: subject.lastEventSyncDate,
      localDisplayed: subject.localDisplayed,
      firstEventSyncDate: subject.firstEventSyncDate,
      accountId: subject.accountId,
      _id: subject._id,
      remote: subject.remote
    };

    assert.deepEqual(subject.toJSON(), expected);
  });

  test('#name', function() {
    subject.remote.name = 'foo';
    assert.equal(subject.name, 'foo');
  });

  suite('#color', function() {

    test('basic getter', function() {
      subject.remote.color = '#ccc';
      assert.equal(subject.color, '#ccc');
    });

    test('filter hex value', function() {
      subject.remote.color = '#7BD148FF';
      assert.equal(subject.color, '#7BD148');
    });

  });

  test('#description', function() {
    subject.remote.description = 'foo';
    assert.equal(subject.description, 'foo');
  });

});
