requireApp('calendar/test/unit/helper.js', function() {
  requireLib('ext/caldav.js');
  requireLib('provider/calendar/abstract.js');
  requireLib('provider/calendar/caldav.js');
  requireLib('provider/local.js');
  requireLib('provider/caldav.js');
});

suite('provider/caldav', function() {

  var subject;
  var user = 'user';
  var password = 'pass';
  var domain = 'google.com';

  setup(function() {
    subject = new Calendar.Provider.Caldav({
      user: user,
      password: password,
      domain: domain
    });
  });

  test('global xhr', function() {
    var xhr = Caldav.Xhr;
    var expected = {
      mozSystem: true
    };

    assert.deepEqual(xhr.prototype.globalXhrOptions, expected);
  });

  test('initialization', function() {
    assert.equal(subject.user, user);
    assert.equal(subject.password, password);
    assert.instanceOf(
      subject,
      Calendar.Provider.Local
    );
  });

  test('capabilites', function() {
    assert.isTrue(subject.useUrl);
    assert.isTrue(subject.useCredentials);
  });

  suite('#_buildConnection', function() {

    test('re-use', function() {
      var con = subject._connection = {};
      var result = subject._buildConnection();

      assert.equal(con, result);
      assert.equal(subject._connection, result);
    });

    test('force', function() {
      var con = subject._connection = {};

      var result = subject._buildConnection(true);

      assert.instanceOf(result, Caldav.Connection);
      assert.equal(result.user, user);
      assert.equal(result.password, password);
      assert.equal(result.domain, domain);

      assert.ok(con !== result);
      assert.ok(subject._connection !== con);
    });
  });

  test('#_homeRequest', function() {
    subject._buildConnection();
    var result = subject._homeRequest();

    assert.instanceOf(
      result,
      Caldav.Request.CalendarHome
    );

    assert.equal(result.connection, subject._connection);
    assert.equal(result.url, subject.url);
  });

  suite('#setupConnection', function() {

    suite('success', function() {
      var newUrl = '/foo/';
      var req;
      var result;

      setup(function(done) {
        req = {
          send: function(callback) {
            callback(null, { url: newUrl });
          }
        };

        subject._homeRequest = function() {
          return req;
        };

        subject.setupConnection(function(err, data) {
          result = data;
          done();
        });
      });

      test('result', function() {
        assert.equal(result.url, newUrl);
      });
    });

  });

  test('#isConnected', function() {
  });

  test('#findCalendars', function() {
  });

});

