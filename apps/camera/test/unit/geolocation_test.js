/*jshint maxlen:false*/
'use strict';

suite('geolocation', function() {
  var GeoLocation;

  // Sometimes setup via the
  // test agent can take a while,
  // so we need to bump timeout
  // to prevent test failure.
  this.timeout(3000);

  suiteSetup(function(done) {
    req(['geolocation'], function(geolocation) {
      GeoLocation = geolocation;
      done();
    });
  });

  setup(function() {
    this.geolocation = new GeoLocation();
    sinon.stub(navigator.geolocation, 'watchPosition');
    sinon.stub(navigator.geolocation, 'clearWatch');
  });

  teardown(function() {
    navigator.geolocation.watchPosition.restore();
    navigator.geolocation.clearWatch.restore();
  });

  suite('GeoLocation#watch()', function() {
    test('Should begin watching geolocation position if' +
         'no watcher currently in place', function() {
      this.geolocation.watch();
      assert.isTrue(navigator.geolocation.watchPosition.calledOnce);
    });

    test('Should begin watching geolocation position if' +
         'no watcher currently in place', function() {
      this.geolocation.watcher = 1;
      this.geolocation.watch();
      assert.isFalse(navigator.geolocation.watchPosition.called);
    });
  });

  suite('GeoLocation#stopWatching()', function() {
    test('Should call navigator.geolocation.clearWatch passing' +
         'a reference to the watcher', function() {
      this.geolocation.watcher = 1;
      this.geolocation.stopWatching();
      assert.isTrue(navigator.geolocation.clearWatch.calledWith(1));
    });

    test('Should unset the watcher', function() {
      this.geolocation.watcher = 1;
      this.geolocation.stopWatching();
      assert.ok(!this.geolocation.watcher);
    });
  });

  suite('GeoLocation#setPosition()', function() {
    test('Should store passed geolocation object on instance', function() {
      this.geolocation.setPosition({
        timestamp: 1234,
        coords: {
          latitude: 1,
          longitude: 2,
          altitude: 3
        }
      });

      var position = this.geolocation.position;

      assert.ok(position.timestamp === 1234);
      assert.ok(position.latitude === 1);
      assert.ok(position.longitude === 2);
      assert.ok(position.altitude === 3);
    });
  });
});
