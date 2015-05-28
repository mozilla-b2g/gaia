'use strict';

suite('RoamingPreferenceManager', function() {
  var RoamingPreferenceManager;
  var mockConn;
  var mockSettingshelper;
  var mockRoamingPreference = 'mockRoamingPref';

  var realMozMobileConnections;

  var roamingPreferenceManager;

  var modules = [
    'panels/operator_settings/models/roaming_preference_manager'
  ];

  var map = {
    '*': {
      'shared/settings_helper': 'MockSettingsHelper'
    }
  };

  setup(function(done) {
    var requireCtx = testRequire([], map, function() {});

    mockSettingshelper = {
      get: function() {},
      set: function() {}
    };
    define('MockSettingsHelper', function() {
      return function() {
        return mockSettingshelper;
      };
    });

    mockConn = {
      getRoamingPreference:
        sinon.stub().returns(Promise.resolve(mockRoamingPreference)),
      setRoamingPreference: function() {}
    };
    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = [mockConn];

    requireCtx(modules, (_RoamingPreferenceManager) => {
      RoamingPreferenceManager = _RoamingPreferenceManager;
      roamingPreferenceManager = RoamingPreferenceManager(mockConn);
      done();
    });
  });

  teardown(function() {
    navigator.mozMobileConnections = realMozMobileConnections;
  });

  suite('initial state', function() {
    suite('support setting roaming preference', function() {
      test('preference', function(done) {
        var doAssert = function() {
          if (roamingPreferenceManager.preference !== null) {
            assert.equal(roamingPreferenceManager.preference,
              mockRoamingPreference);
            done();
          }
        };
        roamingPreferenceManager.observe('preference', doAssert);
        doAssert();
      });

      test('_serviceId', function() {
        assert.equal(roamingPreferenceManager._serviceId,
          navigator.mozMobileConnections.indexOf(mockConn));
      });
    });

    suite('does not support setting roaming preference', function() {
      test('should throw an exception', function() {
        assert.throw(() => {
          RoamingPreferenceManager({});
        }, Error);
      });
    });
  });

  suite('setRoamingPreference', function() {
    var mockPreference = 'mockPreference';

    setup(function() {
      sinon.stub(mockConn, 'setRoamingPreference', function() {
        return Promise.resolve();
      });
    });

    test('setRoamingPreference should change to the setting value',
      function(done) {
        roamingPreferenceManager.setRoamingPreference(mockPreference).then(
          function() {
            assert.equal(roamingPreferenceManager.preference, mockPreference);
        }).then(done, done);
    });

    test('the setting value should be stored using SettingsHelper',
      function(done) {
        var settingsHeplerGetCallback;
        sinon.stub(mockSettingshelper, 'get', function(callback) {
          settingsHeplerGetCallback = callback;
        });
        sinon.spy(mockSettingshelper, 'set');
        roamingPreferenceManager.setRoamingPreference(mockPreference).then(
          () => {
            settingsHeplerGetCallback({});
            assert.deepEqual(mockSettingshelper.set.args[0][0], {
              '0': mockPreference
            });
        }).then(done, done);
    });
  });
});
