requireApp('calendar/test/unit/helper.js', function() {
  requireLib('provider/calendar/abstract.js');
  requireLib('provider/calendar/local.js');
  requireLib('provider/local.js');

  requireLib('models/account.js');
});

suite('account', function() {
  var subject;
  var provider;

  setup(function() {
    subject = new Calendar.Models.Account({
      user: 'foo',
      providerType: 'Local'
    });
  });

  test('initialization', function() {
    assert.equal(subject.user, 'foo');
  });

  suite('fullUrl', function() {
    test('get', function() {
      subject.domain = 'http://google.com';
      subject.entrypoint = '/foo';

      assert.equal(subject.fullUrl, 'http://google.com/foo');
    });

    test('set', function() {
      subject.fullUrl = 'http://google.com/foo/bar';

      assert.equal(subject.domain, 'http://google.com');
      assert.equal(subject.entrypoint, '/foo/bar');
    });
  });

  suite('#toJSON', function() {
    setup(function() {
      subject._id = '1';
      subject.entrypoint = 'url';
      subject.domain = 'domain';
      subject.password = 'pass';
      subject.user = 'user';
      subject.providerType = 'local';
      subject.preset = 'google';
      subject.calendarHome = '/foo/home';
    });

    test('output', function() {
      var expected = {
        _id: subject._id,
        entrypoint: subject.entrypoint,
        domain: subject.domain,
        password: subject.password,
        user: subject.user,
        providerType: subject.providerType,
        calendarHome: '/foo/home',
        preset: 'google'
      };

      assert.deepEqual(subject.toJSON(), expected);
    });
  });

});
