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

  suite('#_updateProvider', function() {
    function update() {
      subject._updateProvider();
      provider = subject._provider;
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
      subject.password = 'bar';
      subject.url = 'missing';

      update();

      assert.ok(!provider.url);
      assert.equal(provider.user, subject.user);
      assert.equal(provider.passsword, subject.passsword);
    });

  });


  suite('#_updateProvider', function() {
    setup(function() {
      subject._updateProvider();
      provider = subject._provider;
    });

    test('with url changes', function(done) {
      provider.setupConnection = function(callback) {
        callback(null, { url: '/foo/bar' });
      };

      subject.refresh(function(err, success) {
        done(function() {
          assert.ok(!err);

          assert.equal(subject.url, '/foo/bar');
        });
      });
    });
  });

  suite('fullUrl', function() {
    test('get', function() {
      subject.domain = 'http://google.com';
      subject.url = '/foo';

      assert.equal(subject.fullUrl, 'http://google.com/foo');
    });

    test('set', function() {
      subject.fullUrl = 'http://google.com/foo/bar';

      assert.equal(subject.domain, 'http://google.com');
      assert.equal(subject.url, '/foo/bar');
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
