'use strict';

mocha.setup({ globals: ['MockNavigatorSettings'] });

suite('SettingsCache', function() {
  suiteSetup(function(done) {
    this.keyValuePairs = {
      'key1': 'value1',
      'key2': 'value2',
      'key3': 'value3'
    };

    testRequire(['shared_mocks/mock_navigator_moz_settings'],
      (function(MockNavigatorSettings) {
        this.MockNavigatorSettings = MockNavigatorSettings;
        this.realSettings = navigator.mozSettings;
        navigator.mozSettings = MockNavigatorSettings;

        // require settings cache after the mock of mozSettings loaded.
        testRequire(['modules/settings_cache'], (function(SettingsCache) {
          this.SettingsCache = SettingsCache;
          done();
        }).bind(this));
    }).bind(this));
  });

  suiteTeardown(function() {
    this.keyValuePairs = null;

    navigator.mozSettings = this.realSettings;
    this.realSettings = null;
    this.MockNavigatorSettings = null;
  });

  setup(function() {
    // init mozSettings
    var settings = this.MockNavigatorSettings.mSettings;
    for (var key in this.keyValuePairs) {
      settings[key] = this.keyValuePairs[key];
    }
    // reset SettingsCache to its initial state
    this.SettingsCache.reset();
  });

  teardown(function() {
    this.MockNavigatorSettings.mTeardown();
  });

  suite('getSettings()', function() {
    test('should return the same value as mozSettings',
      function(done) {
        this.SettingsCache.getSettings((function(settings) {
          for (var key in this.keyValuePairs) {
            assert.ok(settings[key] === this.keyValuePairs[key]);
          }
          done();
        }).bind(this));
    });

    test('should queue the settings requests before the cache being ready',
      function(done) {
        this.MockNavigatorSettings.mSyncRepliesOnly = true;

        var callCount = 10;
        var count = 0;
        var checkDone = function() {
          count++;
          if (callCount === count) {
            done();
          }
        };

        var gotSettings = (function(settings) {
          for (var key in this.keyValuePairs) {
            assert.ok(settings[key] === this.keyValuePairs[key]);
          }
          checkDone();
        }).bind(this);

        // query the settings
        for (var i = 0; i < callCount; i++) {
          this.SettingsCache.getSettings(gotSettings);
        }

        // trigger the mozSettings onsuccess 1s later
        setTimeout(function() {
          this.MockNavigatorSettings.mReplyToRequests();
        }, 1000);
    });

    test('should reflect mozSettings changes', function(done) {
      var key = 'key2';
      var newValue = 'value2_1';
      // make the cache as the current mozSettings.
      this.SettingsCache.getSettings((function() {
        var obj = {};
        obj[key] = newValue;

        // modify the value
        var req = this.MockNavigatorSettings.createLock().set(obj);
        req.onsuccess = (function() {
          this.SettingsCache.getSettings(function(settings) {
            assert.ok(settings[key] === newValue);
            done();
          });
        }).bind(this);
      }).bind(this));
    });

    test('should reflect newly created mozSettings fields', function(done) {
      var newKey = 'key4';
      var value = 'value4';
      // make the cache as the current mozSettings.
      this.SettingsCache.getSettings((function() {
        var obj = {};
        obj[newKey] = value;

        // set the value
        var req = this.MockNavigatorSettings.createLock().set(obj);
        req.onsuccess = (function() {
          this.SettingsCache.getSettings(function(settings) {
            assert.ok(settings[newKey] === value);
            done();
          });
        }).bind(this);
      }).bind(this));
    });
  });

  suite('event listeners', function() {
    suiteSetup(function() {
      // helper function to mutate setting
      this.mutateSetting = (function(key, value, callback) {
        var obj = {};
        obj[key] = value;

        var req = this.MockNavigatorSettings.createLock().set(obj);
        req.onsuccess = callback;
      }).bind(this);
    });

    suiteTeardown(function() {
      this.mutateSetting = null;
    });

    test('addEventListener()', function(done) {
      var key = 'key2';
      var newValue = 'value2_1';
      var onSettingsChange = function(event) {
        assert.ok(event.settingName === key);
        assert.ok(event.settingValue === newValue);
        done();
      };

      this.SettingsCache.addEventListener('settingsChange', onSettingsChange);
      this.mutateSetting(key, newValue);
    });

    test('removeEventListener()', function(done) {
      var onSettingsChangeSpy = sinon.spy();

      this.SettingsCache.addEventListener('settingsChange',
        onSettingsChangeSpy);
      this.mutateSetting('key2', 'value2_1', (function() {
        // ensure the event listener has been added
        sinon.assert.calledOnce(onSettingsChangeSpy);
        this.SettingsCache.removeEventListener('settingsChange',
          onSettingsChangeSpy);
        this.mutateSetting('key2', 'value2_2', function() {
          sinon.assert.calledOnce(onSettingsChangeSpy);
          done();
        });
      }).bind(this));
    });
  });
});
