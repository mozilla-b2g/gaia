'use strict';

suite('ApnSettings', function() {
  var map = {
    '*': {
      'modules/apn/apn_utils': 'MockApnUtils',
      'modules/settings_cache': 'MockSettingsCache'
    }
  };
  var modules = [
    'modules/apn/apn_settings',
    'modules/apn/apn_const',
    'modules/apn/apn_utils',
    'modules/settings_cache'
  ];

  var findTargetSettings = function(apnSettings, serviceId, apnType) {
    return apnSettings._apnSettings[serviceId].find(function(apn) {
      return apn.types.some((type) => apnType === type);
    });
  };

  setup(function(done) {
    var that = this;
    var requireCtx = testRequire([], map, function() {});

    this.mockSettingsDB = {};
    define('MockSettingsCache', function() {
      return {
        getSettings: function(callback) {
          callback(that.mockSettingsDB);
        }
      };
    });

    define('MockApnUtils', function() {
      return {
        clone: function() {},
        isMatchedApn: function() {}
      };
    });

    requireCtx(modules,
      function(ApnSettings, ApnConst, MockApnUtils, MockSettingsCache) {
        this.ApnSettings = ApnSettings;
        this.ApnConst = ApnConst;
        this.MockApnUtils = MockApnUtils;
        this.MockSettingsCache = MockSettingsCache;

        this.apnSettings = new this.ApnSettings();
        this.mockApnSettings = [
          [{ carrier: 'fakeCarrier1', types: ['default'] }],
          [{ carrier: 'fakeCarrier2', types: ['mms'] }]
        ];
        this.mockSettingsDB = {};
        this.mockSettingsDB[this.ApnConst.APN_SETTINGS_KEY] =
          this.mockApnSettings;
        done();
    }.bind(this));
  });

  suite('_ready', function() {
    test('should init the settings correctly', function(done) {
      this.sinon.stub(this.apnSettings, '_addObservers');

      this.apnSettings._ready()
      .then(function() {
        assert.ok(this.apnSettings._isReady);
        assert.deepEqual(this.apnSettings._apnSettings, this.mockApnSettings);
        sinon.assert.called(this.apnSettings._addObservers);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('_update', function() {
    var serviceId = 0;
    var apnType = 'default';

    test('update with apn', function(done) {
      this.sinon.stub(this.MockApnUtils, 'isMatchedApn', function() {
        return false;
      });
      var newApnSetting = { carrier: 'newCarrier', types: [apnType] };

      this.apnSettings._update(serviceId, apnType, newApnSetting)
      .then(function() {
        var targetApnSettings =
          findTargetSettings(this.apnSettings, serviceId, apnType);
        assert.deepEqual(targetApnSettings, newApnSetting);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('update with null', function(done) {
      this.apnSettings._update(serviceId, apnType, null)
      .then(function() {
        var targetApnSettings =
          findTargetSettings(this.apnSettings, serviceId, apnType);
        assert.ok(targetApnSettings === undefined);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('getAll', function() {
    var serviceId = 0;

    test('should return correct apn setting', function(done) {
      this.apnSettings.getAll(serviceId)
      .then(function(apnSetting) {
        assert.deepEqual(apnSetting, this.mockApnSettings[serviceId]);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('get', function() {
    var serviceId = 0;
    var apnType = 'default';

    test('should return correct apn setting', function(done) {
      this.apnSettings.get(serviceId, apnType)
      .then(function(apnSetting) {
        var targetApnSettings =
          findTargetSettings(this.apnSettings, serviceId, apnType);
        assert.deepEqual(targetApnSettings, apnSetting);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('should return null if no existing setting', function(done) {
      this.mockSettingsDB[this.ApnConst.APN_SETTINGS_KEY] = {};
      this.apnSettings.get(serviceId, apnType)
      .then(function(apnSetting) {
        assert.isNull(apnSetting);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('update', function() {
    var serviceId = 0;
    var apnType = 'default';

    test('should call to _schedule and _update correctly', function(done) {
      var apn = {};
      var apnClone = {};
      this.sinon.stub(this.MockApnUtils, 'clone', function() {
        return apnClone;
      });
      this.sinon.stub(this.apnSettings, '_commit', function() {
        return Promise.resolve();
      });
      this.sinon.stub(this.apnSettings, '_update', function() {
        return Promise.resolve();
      });
      this.sinon.spy(this.apnSettings, '_schedule');

      this.apnSettings.update(serviceId, apnType, apn)
      .then(function(apnSetting) {
        sinon.assert.calledWith(this.MockApnUtils.clone, apn);
        sinon.assert.called(this.apnSettings._schedule);
        sinon.assert.calledWith(this.apnSettings._update, serviceId, apnType,
          apnClone);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });
});
