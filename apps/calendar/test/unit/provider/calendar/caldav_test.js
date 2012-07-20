requireApp('calendar/test/unit/helper.js', function() {
  requireLib('ext/caldav.js');
  requireLib('provider/calendar/abstract.js');
  requireLib('provider/calendar/caldav.js');
  requireLib('provider/local.js');
  requireLib('provider/caldav.js');
});

suite('provider/calendar/caldav', function() {

  var subject;
  var provider;
  var connection;

  function remoteCalendar(opts) {
    return new Caldav.Resources.Calendar(
      connection,
      opts
    );
  }

  setup(function() {
    connection = new Caldav.Connection();
    provider = new Calendar.Provider.Caldav();
    subject = new Calendar.Provider.Calendar.Caldav(provider, {
      id: 'uuid1'
    });
  });

  test('initialization', function() {
    assert.equal(subject.provider, provider);
    assert.instanceOf(subject, Calendar.Provider.Calendar.Abstract);
  });

  test('#mapRemoteProps', function() {
    var remote = remoteCalendar({
      url: 'url',
      name: 'name',
      color: 'color',
      ctag: 'token',
      description: 'foo'
    });

    subject.mapRemoteCalendar(remote);

    assert.equal(subject._remoteCalendar, remote);
    assert.equal(subject.id, remote.url);
    assert.equal(subject.url, remote.url);
    assert.equal(subject.name, remote.name);
    assert.equal(subject.syncToken, remote.ctag);
    assert.equal(subject.description, remote.description);
    assert.equal(subject.color, remote.color);
  });

});
