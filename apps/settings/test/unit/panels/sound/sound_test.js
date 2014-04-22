/* global MockNavigatorMozTelephony */
'use strict';
mocha.globals([
  'MockL10n',
  'telephonyAddCall',
  'telephonyAddCdmaCall',
  'MockNavigatorMozTelephony',
  'MockMobileconnection',
  'MockNavigatorMozMobileConnections',
  'MockNavigatorSettings',
  'ForwardLock',
  'getSupportedNetworkInfo'
]);

suite('Sound > ', function() {
  var Sound;
  var realL10n, realTelephony, realMozSettings, realMozMobileConnections;

  suiteSetup(function(done) {
    testRequire([
      'shared_mocks/mock_navigator_moz_telephony',
      'unit/mock_l10n',
      'unit/mock_settings_listener',
      'panels/sound/sound',
      'shared_mocks/mock_navigator_moz_settings',
      'shared_mocks/mock_navigator_moz_mobile_connections'
    ],
    { //mock map
      'panels/sound/sound': {
        'shared/settings_listener': 'unit/mock_settings_listener'
      }
    },
    function(MockNavigatorMozTelephony, MockL10n,
      MockSettingsListener, module, MockNavigatorSettings) {
      Sound = module;
      // mock l10n
      realL10n = window.navigator.mozL10n;
      window.navigator.mozL10n = MockL10n;
      // mock mozMobileConnections
      realMozMobileConnections = window.navigator.mozMobileConnections;
      window.navigator.mozMobileConnections =
        window.MockNavigatorMozMobileConnections;
      // mock mozTelephony
      realTelephony = navigator.mozTelephony;
      navigator.mozTelephony = MockNavigatorMozTelephony;
      // mock mozSettings
      realMozSettings = navigator.mozSettings;
      navigator.mozSettings = MockNavigatorSettings;

      done();
    });
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
    navigator.mozTelephony = realTelephony;
    navigator.mozSettings = realMozSettings;
  });

  suite('initiation', function() {
    var sound;
    setup(function() {
      sound = Sound();
      var mock_elements = {};

      this.sinon.stub(sound, '_configureTones');
      this.sinon.stub(sound, '_handleTones');
      window.getSupportedNetworkInfo = function() {};
      this.sinon.stub(window, 'getSupportedNetworkInfo');
      sound.init(mock_elements);
    });

    teardown(function() {
      window.getSupportedNetworkInfo.restore();
    });

    test('we would call _configureTones and _handleTones in init', function() {
      assert.ok(sound._configureTones.called);
      assert.ok(sound._handleTones.called);
    });

    test('we would call getSupportedNetworkInfo in init', function() {
      assert.ok(window.getSupportedNetworkInfo.called);
    });
  });

  suite('_configureTones', function() {
    var mock_elements;
    var sound;
    setup(function() {
      sound = Sound();
      mock_elements = {
        ringer: document.createElement('div')
      };

      this.sinon.stub(sound, '_handleTones');
      window.getSupportedNetworkInfo = function() {};
      this.sinon.stub(window, 'getSupportedNetworkInfo');
    });

    teardown(function() {
      window.getSupportedNetworkInfo.restore();
    });

    test('we would push alerttone by default in tones list', function() {
      navigator.mozTelephony = null;
      sound.init(mock_elements);
      assert.equal(sound.tones.length, 1);
      assert.equal(sound.tones[0].pickType, 'alerttone');
    });

    test('If device support telephony API, show the section for ringtones',
      function() {
        navigator.mozTelephony = MockNavigatorMozTelephony;
        sound.init(mock_elements);
        assert.equal(sound.tones.length, 2);
        assert.equal(sound.tones[1].pickType, 'ringtone');
    });
  });

  suite('_handleTones', function() {
    var sound;
    setup(function() {
      sound = Sound();
      sound.tones = [{
        pickType: 'alerttone',
        settingsKey: 'notification.ringtone',
        allowNone: true,
        button: document.createElement('div')
      }];

      sound._handleTones();
    });

    test('we would set button textContent in SettingsListener', function() {
      assert.equal(sound.tones[0].button.textContent,
        'notification.ringtone.name');
    });
  });

  suite('_checkRingtone', function() {
    var sound;
    setup(function() {
      sound = Sound();
      sound.tones = [{
        pickType: 'alerttone',
        settingsKey: 'notification.ringtone',
        allowNone: true,
        button: document.createElement('div')
      }];

      var blob = this.sinon.stub();
      this.sinon.stub(window.URL, 'createObjectURL');
      sound._checkRingtone(blob, 'mock_name', sound.tones[0]);
    });

    teardown(function() {
      window.URL.createObjectURL.restore();
    });

    test('button textContent is changed in _checkRingtone', function() {
      assert.equal(sound.tones[0].button.textContent, 'savingringtone');
    });
  });

  suite('_setRingtone', function() {
    var blob;
    var sound;
    setup(function() {
      sound = Sound();
      blob = this.sinon.stub();
      sound._setRingtone(blob, 'aloha', 'notification.ringtone');
    });

    test('we would set ringtone value via _setRingtone', function() {
      assert.equal(
        navigator.mozSettings.mSettings['notification.ringtone.name'],
        'aloha');
      assert.equal(navigator.mozSettings.mSettings['notification.ringtone'],
        blob);
    });
  });
});
