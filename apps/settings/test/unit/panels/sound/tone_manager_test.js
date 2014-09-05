/*global: MockNavigatorMozTelephony*/
'use strict';

suite('Sound > ', function() {
  var toneManager;
  var realL10n, realTelephony, realMozSettings, realMozMobileConnections;
  var mockSettingsListener;
  var dom = document.createElement('div');
  var mockElements = {
    toneSelector: dom,
    alertToneSelection: dom,
    ringToneSelection: dom,
    ringer: dom,
    vibrationSetting: dom,
    manageTones: dom
  };
  var modules = [
    'shared_mocks/mock_navigator_moz_telephony',
    'unit/mock_l10n',
    'shared_mocks/mock_navigator_moz_settings',
    'shared_mocks/mock_settings_listener',
    'panels/sound/tone_manager',
    'shared_mocks/mock_navigator_moz_mobile_connections'
  ];
  var maps = {
    '*': {
      'shared/settings_listener': 'shared_mocks/mock_settings_listener',
      'modules/settings_cache': 'unit/mock_settings_cache',
      'shared/omadrm/fl': 'shared_mocks/mock_omadrm_fl'
    }
  };

  function getAsset(filename, loadCallback) {
    var req = new XMLHttpRequest();
    req.open('GET', filename, true);
    req.responseType = 'blob';
    req.onload = function() {
      loadCallback(req.response);
    };
    req.send();
  }

  suiteSetup(function(done) {
    testRequire(modules, maps, function(
      MockNavigatorMozTelephony, MockL10n,
      MockNavigatorSettings, MockSettingsListener, module) {
        toneManager = module();
        mockSettingsListener = MockSettingsListener;
        // mock l10n
        realL10n = window.navigator.mozL10n;
        window.navigator.mozL10n = MockL10n;
        // mock mozMobileConnections
        realMozMobileConnections = window.navigator.mozMobileConnections;
        window.navigator.mozMobileConnections =
          window.MockNavigatorMozMobileConnections;
        // mock navigator.mozTelephony
        realTelephony = navigator.mozTelephony;
        window.navigator.mozTelephony = MockNavigatorMozTelephony;
        // mock mozSettings
        realMozSettings = navigator.mozSettings;
        window.navigator.mozSettings = MockNavigatorSettings;
        done();
    });
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
    window.navigator.mozMobileConnections = realMozMobileConnections;
    window.navigator.mozTelephony = realTelephony;
    window.navigator.mozSettings = realMozSettings;
  });

  suite('initiation', function() {
    setup(function() {
      this.sinon.stub(toneManager, '_customize');
      this.sinon.stub(toneManager, '_configureTones');
      this.sinon.stub(toneManager, '_handleTones');
      toneManager.init(mockElements);
    });

    test('we would call _configureTones and _handleTones in init',
      function() {
        assert.ok(toneManager._customize.called);
        assert.ok(toneManager._configureTones.called);
        assert.ok(toneManager._handleTones.called);
    });
  });

  suite('_customize', function() {
    setup(function() {
      this.sinon.stub(toneManager, '_configureTones');
      this.sinon.stub(toneManager, '_handleTones');
      window.getSupportedNetworkInfo = function() {};
      window.loadJSON = function() {};
      this.sinon.stub(window, 'getSupportedNetworkInfo');
      toneManager.init(mockElements);
    });

    teardown(function() {
      window.getSupportedNetworkInfo.restore();
    });

    test('we would call getSupportedNetworkInfo', function() {
      assert.ok(window.getSupportedNetworkInfo.called);
    });
  });

  suite('_configureTones', function() {
    setup(function() {
      this.sinon.stub(toneManager, '_customize');
      this.sinon.stub(toneManager, '_handleTones');
      this.sinon.stub(window, 'getSupportedNetworkInfo');
    });

    teardown(function() {
      window.getSupportedNetworkInfo.restore();
    });

    test('we would push alerttone by default in tones list', function() {
      navigator.mozTelephony = null;
      toneManager.init(mockElements);
      assert.equal(toneManager._tones.length, 1);
      assert.equal(toneManager._tones[0].pickType, 'alerttone');
    });

    test('If device support telephony API, show the section for ringtones',
      function() {
        navigator.mozTelephony = true;
        toneManager.init(mockElements);
        assert.equal(toneManager._tones.length, 2);
        assert.equal(toneManager._tones[1].pickType, 'ringtone');
    });
  });

  suite('_handleTones', function() {
    var nameKey = 'notification.ringtone.name';
    setup(function() {
      toneManager._handleTones();
    });

    test('we would set button textContent in SettingsListener', function() {
      mockSettingsListener.mCallbacks[nameKey]('classic');
      assert.equal(toneManager._tones[0].button.textContent, 'classic');
    });
  });

  suite('_checkRingtone', function() {
    setup(function(done) {
      toneManager._tones = [{
        pickType: 'alerttone',
        settingsKey: 'notification.ringtone',
        allowNone: true,
        button: dom
      }];

      getAsset('/resources/ringtones/classic.ogg', function(blob) {
        var result = {
          'blob': blob
        };
        toneManager._checkRingtone(result, toneManager._tones[0]);
        done();
      });
    });

    test('button textContent is changed in _checkRingtone', function() {
      assert.equal(toneManager._tones[0].button.textContent, 'classic');
    });
  });
});
