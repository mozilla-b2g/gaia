suite('host', function() {
  var Marionette = require('marionette-client'),
      Host = require('../'),
      mozprofile = require('mozilla-profile-builder'),
      emptyPort = require('empty-port');
      net = require('net'),
      fs = require('fs');

  function connect(port, callback) {
    var Tcp = Marionette.Drivers.Tcp;

    // the intent is to verify that the marionette connection can/cannot work.
    (new Tcp({ port: port, tries: 5 })).connect(callback);
  }

  var subject;
  setup(function() {
    subject = new Host();
  });

  var port = 2828;
  var profile;
  setup(function(done) {
    var options = {
      prefs: {
        'marionette.defaultPrefs.enabled': true,
        'marionette.defaultPrefs.port': port
      }
    };

    mozprofile.create(options, function(err, _profile) {
      profile = _profile;
      done(err);
    });
  });

  teardown(function(done) {
    profile.destroy(done);
  });

  test('.options', function() {
    var subject = new Host({ xxx: true });
    assert.equal(subject.options.xxx, true);
  });

  test('Host.metadata', function() {
    assert.equal(Host.metadata.host, 'device');
  });

  suite('#start', function() {
    setup(function(done) {
      subject.start(profile.path, { port: port }, done);
    });

    test('can connect after start', function(done) {
      connect(port, done);
    });

    teardown(function(done) {
      subject.stop(done);
    });


  });

  suite('#stop', function() {
    setup(function(done) {
      subject.start(profile.path, done);
    });

    setup(function(done) {
      subject.stop(done);
    });

    test('after closing process', function(done) {
      var socket = net.connect(port);
      socket.on('error', function(err) {
        assert.equal(err.code, 'ECONNREFUSED');
        done();
      });
    });
  });
});
