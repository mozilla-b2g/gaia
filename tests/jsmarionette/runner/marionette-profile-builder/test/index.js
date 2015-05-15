/* global assert */
'use strict';

suite('ProfileBuilder', function() {
  var sinon;
  setup(function() {
    sinon = global.sinon.sandbox.create();
  });

  teardown(function() {
    sinon.restore();
  });

  var ProfileBuilder = require('../'),
      mozprofile = require('mozilla-profile-builder');

  var subject;
  var options = {
    prefs: { original: true }
  };
  // profile returned by mozprofile.create
  var profile = { path: '/path/to/profile' };

  setup(function() {
    subject = new ProfileBuilder(options);
  });

  test('initialization', function() {
    assert.deepEqual(subject.options, options);
  });

  suite('#build', function() {
    var stub,
        // overrides on the profile options
        overrides = { a: true, prefs: { override: true } },
        // expected profile options (subject.options + overrides)
        expectedOptions,
        // profile path returned by build
        profilePath;

    setup(function(done) {
      stub = sinon.stub(mozprofile, 'create');

      // expected merge result
      expectedOptions = {
        a: true,
        prefs: { original: true, override: true }
      };

      // invoke the callback given to the stub async
      stub.callsArgWithAsync(1, null, profile);

      subject.build(overrides, function(err, _profilePath) {
        if (err) return done(err);
        profilePath = _profilePath;
        done();
      });
    });

    test('profile path', function() {
      assert.equal(profile.path, profilePath);
    });

    test('options given to mozprofile.create', function() {
      var call = stub.lastCall;
      assert.deepEqual(call.args[0], expectedOptions);
    });
  });

  suite('#destroy', function() {
    test('without profile', function(done) {
      subject.destroy(done);
    });

    test('with profile', function(done) {
      var calledDestroy = false;
      var profile = {
        path: '/path/to/profile',
        destroy: function(callback) {
          calledDestroy = true;
          process.nextTick(callback);
        }
      };

      subject.profile = profile;
      subject.destroy(function(err, path) {
        assert.equal(path, profile.path, 'returns path');
        assert.ok(!subject.profile, 'resets profile');
        done(err);
      });
    });
  });

});

