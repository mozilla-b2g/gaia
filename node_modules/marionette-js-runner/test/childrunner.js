suite('childrunner', function() {
  var sinon;

  setup(function() {
    sinon = global.sinon.sandbox.create();
  });

  teardown(function() {
    sinon.restore();
  });

  var Child =
    require('../lib/childrunner').ChildRunner;

  var Consumer = require('mocha-json-proxy/consumer');
  var EventEmitter = require('events').EventEmitter;

  /** profile builder */
  function ProfileBuilder(options) {
    this.options = options;

    // used only in tests real implementations won't have this.
    this.mockPath = '/path/to/profile';
  }

  ProfileBuilder.prototype = {
    resetMock: function() {
      this.buildCall = null;
    },

    build: function(overrides, callback) {
      this.buildCall = overrides;
      process.nextTick(callback.bind(null, null, this.mockPath));
    },

    destroy: function(callback) {
      process.nextTick(callback);
    }
  };

  /** host */

  function MockHost(options) {
    this.options = options;
  }

  MockHost.metadata = { host: 'mock' };

  MockHost.prototype = {
    resetMock: function() {
      this.startProfile = null;
      this.startOptions = null;
    },

    start: function(profile, options, callback) {
      this.startProfile = profile;
      this.startOptions = options;

      process.nextTick(function() {
        this.started = true;
        callback();
      }.bind(this));
    },

    stop: function(callback) {
      process.nextTick(function() {
        this.stopped = true;
        callback();
      }.bind(this));
    }
  };

  var argv = [
    // test
    __dirname + '/fixtures/test',
    // Spec included to verify its ignored here
    '--reporter', 'Spec'
  ];

  var subject;
  var profileBase = { settings: { x: true } };

  setup(function() {
    subject = new Child({
      argv: argv,
      ProfileBuilder: ProfileBuilder,
      Host: MockHost,
      profileBase: profileBase
    });
  });

  teardown(function(done) {
    if (!subject.process)
      return done();

    subject.process.on('exit', function() {
      done();
    });
    subject.process.kill();
  });

  suite('#spawn', function() {
    setup(function() {
      subject.spawn();
    });

    test('.Host', function() {
      assert.equal(subject.Host, MockHost);
    });

    test('.profileBase', function() {
      assert.equal(subject.profileBase, profileBase);
    });

    test('.ProfileBuilder', function() {
      assert.equal(subject.ProfileBuilder, ProfileBuilder);
    });

    test('.process', function() {
      assert.ok(subject.process);
    });

    test('process.stdout', function() {
      assert.ok(subject.process.stdout);
    });

    test('process.stderr', function() {
      assert.ok(subject.process.stderr);
    });

    test('.runner', function() {
      assert.ok(subject.runner instanceof Consumer);
    });

    test('emits end', function(done) {
      subject.runner.on('end', done);
    });

    test('on process.exit', function(done) {
      var callsCleanup = false;
      subject.cleanup = function() {
        callsCleanup = true;
      };

      subject.process.on('exit', function() {
        assert.ok(!subject.process, 'removes .process reference');
        assert.ok(callsCleanup, 'cleans up child');
        done();
      });

      subject.process.kill();
    });
  });

  suite('#profileOptions', function() {
    var options,
        result,
        port = 2828;

    setup(function() {
      options = { prefs: { x: true } };
      result = subject.profileOptions(port, options);
    });

    test('should keep given prefs', function() {
      // no clobbering
      assert.equal(result.prefs.x, true, 'has given property');
    });

    test('marionette is enabled', function() {
      assert.ok(
        result.prefs['marionette.defaultPrefs.enabled'],
        'marionette is enabled'
      );
    });

    test('marionette port matches given port', function() {
      assert.equal(
        result.prefs['marionette.defaultPrefs.port'],
        port,
        'port setting should match given port'
      );
    });
  });

  suite('host methods', function() {
    function hostMethodResult(result, done) {
      for (var key in result)
        result[key] = null;

      return function(err, meta) {
        // copy all of the remote properties
        var remote = subject.remotes[meta.id];
        for (var key in remote) {
          result[key] = remote[key];
        }

        // and a reference to the returned meta
        result.meta = meta;
        done(err);
      };
    }

    setup(function() {
      subject.spawn();
    });

    // wrap process.send
    var sent;
    setup(function() {
      var originalSend = subject.process.send;
      sent = new EventEmitter();
      subject.process.send = function(input) {
        // incoming payload: ['runner response', number, ...];
        if (Array.isArray(input) && input[0] === 'response') {
          var slice = input.slice(1);
          sent.emit.apply(sent, slice);
        }
        originalSend.apply(this, arguments);
      };
    });

    suite('#createHost', function() {
      var host = {};
      var profileOverrides = { settings: { x: true } };
      setup(function(done) {
        subject.createHost(profileOverrides, hostMethodResult(host, done));
      });

      test('profile builder base options', function() {
        assert.deepEqual(
          host.profileBuilder.options,
          profileBase
        );
      });

      test('remote.port', function() {
        assert.ok(typeof host.port === 'number', 'is number');
      });

      test('meta sent to child', function() {
        assert.deepEqual(
          subject._remoteDetails(host),
          host.meta
        );
      });

      test('created profile', function() {
        var expected = subject.profileOptions(host.port);
        expected.settings = profileOverrides.settings;

        assert.deepEqual(
          host.profileBuilder.buildCall,
          expected
        );
      });

      test('host profile', function() {
        assert.equal(
          host.profileBuilder.mockPath,
          host.host.startProfile
        );
      });
    });

    suite('#restartHost', function() {
      var overrides = { settings: { x: true } };
      var create = {};
      var restart = {};

      // create the initial host
      setup(function(done) {
        subject.createHost({}, hostMethodResult(create, done));
      });

      // change the path of the profile to verify the restart
      setup(function(done) {
        // change the mocks
        create.profileBuilder.mockPath = '/new/path';
        create.profileBuilder.resetMock();
        create.host.resetMock();

        // trigger restart
        subject.restartHost(
          create.id,
          overrides,
          hostMethodResult(restart, done)
        );
      });

      test('changed port', function() {
        assert.notEqual(create.meta.port, restart.meta.port);
      });

      test('rebuilding of profile', function() {
        var expected = subject.profileOptions(restart.port);
        expected.settings = overrides.settings;

        assert.deepEqual(
          expected,
          restart.profileBuilder.buildCall
        );
      });

      test('host should be given port as option', function() {
        assert.deepEqual(
          restart.host.startOptions.port,
          restart.port
        );
      });

      test('host should be given new path', function() {
        assert.equal(
          restart.host.startProfile,
          restart.profileBuilder.mockPath
        );
      });

      test('unknown remoteId should produce an error', function(done) {
        subject.restartHost(
          123,
          overrides,
          function(error) {
            assert.ok(error);
            done();
          }
        );
      });
    });

    suite('#stopHost', function() {
      var create = {};
      var host;
      var builder;

      setup(function(done) {
        subject.createHost({}, hostMethodResult(create, done));
      });

      setup(function() {
        host = create.host;
        builder = create.profileBuilder;
      });

      test('calls destroy / stop', function(done) {
        var destroyed = false;
        var stopped = false;

        builder.destroy = function(callback) {
          destroyed = true;
          process.nextTick(callback);
        };

        host.stop = function(callback) {
          stopped = true;
          process.nextTick(callback);
        };

        subject.stopHost(create.id, function(err) {
          if (err) return done(err);
          assert.ok(destroyed, 'destroys profile');
          assert.ok(stopped, 'stops host');
          done();
        });
      });

      test('unknown remoteId should produce an error', function(done) {
        subject.stopHost(
          123,
          function(error) {
            assert.ok(error);
            done();
          }
        );
      });
    });

    suite('#cleanup', function() {
      var hosts;
      // create host a
      setup(function(done) {
        subject.createHost({}, done);
      });

      // create host b
      setup(function(done) {
        subject.createHost({}, done);
      });

      // capture all the hosts
      setup(function(done) {
        hosts = [];
        Object.keys(subject.remotes).forEach(function(id) {
          hosts.push(subject.remotes[id].host);
        });

        // then clear them
        subject.cleanup(done);
      });

      test('removes all remotes', function() {
        assert.equal(Object.keys(subject.remotes), 0);
      });

      test('all remote hosts are stopped', function() {
        hosts.forEach(function(host) {
          assert.equal(host.stopped, true, 'host(s) have been stopped');
        });
      });

    });

  });
});
