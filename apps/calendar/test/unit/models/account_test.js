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

  test('#connect', function(done) {
    subject._setupProvider = function() {
      done();
    }
    subject.connect();
  });

  suite('#_setupProvider', function() {
    function update() {
      subject._setupProvider();
      provider = subject.provider;
    }

    setup(function() {
      update();
    });

    test('new provider', function() {
      assert.instanceOf(provider, Calendar.Provider.Local);
    });

    test('useUrl', function() {
      provider.useUrl = true;
      subject.url = '/foo';
      subject.domain = 'google.com';
      update();

      assert.equal(provider.url, subject.url);
      assert.equal(provider.domain, subject.domain);
    });

    test('useCredentials', function() {
      provider.useCredentials = true;
      subject.user = 'foo';
      subject.passsword = 'bar';
      subject.url = 'missing';

      update();

      assert.ok(!provider.url);
      assert.equal(provider.user, subject.user);
      assert.equal(provider.passsword, subject.passsword);
    });

  });


  suite('#_setupProvider', function() {
    setup(function() {
      subject._setupProvider();
      provider = subject.provider;
    });

    test('with url changes', function(done) {
      provider.setupConnection = function(callback) {
        callback(null, { url: '/foo/bar' });
      };

      subject.setup(function(err, success) {
        done(function() {
          assert.ok(!err);

          assert.equal(subject.url, '/foo/bar');
        });
      });
    });
  });

  suite('fullUrl', function() {
    test('get', function() {
      subject.domain = 'google.com';
      subject.url = '/foo';

      assert.equal(subject.fullUrl, 'google.com/foo');
    });

    test('set', function() {
      subject.fullUrl = 'google.com/foo';

      assert.equal(subject.domain, 'google.com');
      assert.equal(subject.url, '/foo');
    });
  });

  suite('#toJSON', function() {
    setup(function() {
      subject.url = 'url';
      subject.domain = 'domain';
      subject.password = 'pass';
      subject.user = 'user';
      subject.providerType = 'local';
      subject.preset = 'google';
    });

    test('output', function() {
      var expected = {
        url: subject.url,
        domain: subject.domain,
        password: subject.password,
        user: subject.user,
        providerType: subject.providerType,
        preset: 'google'
      };

      assert.deepEqual(subject.toJSON(), expected);
    });
  });

});
