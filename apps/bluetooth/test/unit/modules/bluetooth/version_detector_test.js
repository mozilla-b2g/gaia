'use strict';

suite('VersionDetector > ', function() {
  setup(function(done) {
    var module = [
      'modules/bluetooth/version_detector'
    ];

    var map = {
      'modules/bluetooth': {
        'modules/navigator/mozBluetooth': 'MockNavigatorBluetooth'
      }
    };

    this.MockNavigatorBluetooth = {
      onattributechanged: undefined,
      mSetVersion: function(version) {
        if (version === null) {
        } else if (version === 1) {
          this.onattributechanged = undefined;
        } else if (version === 2) {
          this.onattributechanged = null;
        }
      }
    };

    var requireCtx = testRequire([], map, function() {});
    define('MockNavigatorBluetooth', function() {
      return this.MockNavigatorBluetooth;
    }.bind(this));

    requireCtx(module, function(VersionDetector) {
      this.VersionDetector = VersionDetector;
      done();
    }.bind(this));
  });

  suite('getVersion when API Version 1 > ', function() {
    setup(function() {
      this.MockNavigatorBluetooth.mSetVersion(1);
    });

    test('should return 1..', function() {
      assert.equal(this.VersionDetector.getVersion(), 1,
        'getVersion should return 1 if we run on Bluetooth API version 1..');
    });
  });

  suite('getVersion when API Version 2 > ', function() {
    setup(function() {
      this.MockNavigatorBluetooth.mSetVersion(2);
    });

    test('should return 2..', function() {
      assert.equal(this.VersionDetector.getVersion(), 2,
        'getVersion should return 2 if we run on Bluetooth API version 2..');
    });
  });
});
