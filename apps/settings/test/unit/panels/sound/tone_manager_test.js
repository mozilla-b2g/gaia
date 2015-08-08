'use strict';

suite('Sound > ToneManager', function() {
  var toneManager;
  var realL10n, realTelephony, realMozSettings, realMozActivity;
  var mockSettingsListener, mockSettingsCache, mockForwardLock;
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
    'shared_mocks/mock_l10n',
    'shared_mocks/mock_navigator_moz_settings',
    'shared_mocks/mock_settings_listener',
    'unit/mock_settings_cache',
    'shared_mocks/mock_omadrm_fl',
    'shared_mocks/mock_moz_activity',
    'panels/sound/tone_manager'
  ];
  var maps = {
    '*': {
      'shared/settings_listener': 'shared_mocks/mock_settings_listener',
      'modules/settings_cache': 'unit/mock_settings_cache',
      'shared/omadrm/fl': 'shared_mocks/mock_omadrm_fl'
    }
  };

  setup(function(done) {
    testRequire(modules, maps, function(
      MockNavigatorMozTelephony, MockL10n,
      MockNavigatorSettings, MockSettingsListener,
      MockSettingsCache, MockForwardLock, MockMozActivity, module) {
        toneManager = module();
        mockSettingsListener = MockSettingsListener;
        mockSettingsCache = MockSettingsCache;
        mockForwardLock = MockForwardLock;
        // mock l10n
        realL10n = window.navigator.mozL10n;
        window.navigator.mozL10n = MockL10n;
        // mock navigator.mozTelephony
        realTelephony = navigator.mozTelephony;
        window.navigator.mozTelephony = MockNavigatorMozTelephony;
        // mock mozSettings
        realMozSettings = navigator.mozSettings;
        window.navigator.mozSettings = MockNavigatorSettings;

        realMozActivity = window.MozActivity;
        window.MozActivity = MockMozActivity;
        window.MozActivity.mSetup();
        done();
    });
  });

  teardown(function() {
    window.navigator.mozL10n = realL10n;
    window.navigator.mozTelephony = realTelephony;
    window.navigator.mozSettings = realMozSettings;
    window.MozActivity.mTeardown();
    window.MozActivity = realMozActivity;
  });

  suite('initiation', function() {
    setup(function() {
      this.sinon.stub(toneManager, '_configureTones');
      this.sinon.stub(toneManager, '_handleTones');
      toneManager.init(mockElements);
    });

    test('we would set _elements from param', function() {
      assert.equal(mockElements, toneManager._elements);
    });

    test('we would call _configureTones and _handleTones in init',
      function() {
        assert.ok(toneManager._configureTones.called);
        assert.ok(toneManager._handleTones.called);
    });
  });

  suite('_configureTones', function() {
    var mockTelephony;
    setup(function() {
      mockTelephony = navigator.mozTelephony;
    });

    teardown(function() {
      navigator.mozTelephony = mockTelephony;
    });

    test('we would push alerttone by default in tones list', function() {
      navigator.mozTelephony = null;
      toneManager.init(mockElements);
      assert.equal(toneManager._tones.length, 1);
      assert.equal(toneManager._tones[0].pickType, 'alerttone');
    });

    test('If device support telephony API, show the section for ringtones',
      function() {
        navigator.mozTelephony = {};
        toneManager.init(mockElements);
        assert.equal(toneManager._tones.length, 2);
        assert.equal(toneManager._tones[1].pickType, 'ringtone');
    });
  });

  suite('_renderTone', function() {
    var tone, result;
    var fakeBlob = new Blob([], {type: 'audio/ogg'});
    var secret = 'fakesecret';
    setup(function() {
      tone = {
        pickType: 'alerttone',
        settingsKey: 'notification.ringtone',
        allowNone: true,
        button: dom,
        desc: dom
      };
      result = {
        l10nID: '',
        name: '',
        blob: fakeBlob,
        id: ''
      };
      this.sinon.stub(toneManager, '_setRingtone');
      this.sinon.stub(window, 'alert');
      this.sinon.spy(mockForwardLock, 'unlockBlob');
    });

    teardown(function() {
      tone.button.textContent = null;
      tone.button.removeAttribute('data-l10n-id');
    });

    suite('is playable', function() {
      setup(function() {
        this.sinon.stub(toneManager, '_isPlayableTone', function() {
          return Promise.resolve(true);
        });
      });

      test('ForwardLock is called when blob mime is matched', function() {
        mockForwardLock.mSetupMimeSubtype('ogg');
        toneManager._renderTone(tone, result, secret);
        assert.equal(tone.button.dataset.l10nId, 'saving-tone');
        assert.ok(mockForwardLock.unlockBlob.calledWith(secret, fakeBlob));
      });

      test('ForwardLock is not called when blob mime is not matched',
        function() {
          mockForwardLock.mSetupMimeSubtype('mp3');
          toneManager._renderTone(tone, result, secret);
          assert.equal(tone.button.dataset.l10nId, 'saving-tone');
          assert.isFalse(mockForwardLock.unlockBlob.calledWith(secret,
            fakeBlob));
      });

      test('_setRingtone is called when tone is playable', function(done) {
        toneManager._renderTone(tone, result, secret);
        assert.isTrue(toneManager._isPlayableTone.called);
        toneManager._isPlayableTone(fakeBlob).then(function(value) {
          assert.isTrue(toneManager._setRingtone.calledWith(
            tone.settingsKey, result.l10nID,
            result.name, result.blob, result.id));
        }).then(done, done);
      });
    });

    suite('is not playable', function() {
      setup(function() {
        this.sinon.stub(toneManager, '_isPlayableTone', function() {
          return Promise.resolve(false);
        });
      });

      test('alert is called when tone is playable', function(done) {
        toneManager._renderTone(tone, result, secret);
        assert.isTrue(toneManager._isPlayableTone.called);

        // We're adding one empty Promise to push the test past
        // the microtask in which the l10n resolves the string
        toneManager._isPlayableTone(fakeBlob).then(
          Promise.resolve()).then((value) => {
            assert.isTrue(window.alert.called);
            assert.isFalse(toneManager._setRingtone.called);
        }).then(done, done);
      });

      test('textContent is set to origin name ' +
        'when data-l10n-id is not found', function(done) {
          tone.button.textContent = 'test';
          toneManager._renderTone(tone, result, secret);

          // We're adding one empty Promise to push the test past
          // the microtask in which the l10n resolves the string
          toneManager._isPlayableTone(fakeBlob).then(
            Promise.resolve()).then((value) => {
              assert.isTrue(window.alert.called);
              assert.isFalse(toneManager._setRingtone.called);
              assert.equal(tone.button.getAttribute('data-l10n-id'), null);
              assert.equal(tone.button.textContent, 'test');
          }).then(done, done);
      });

      test('textContent is set to data-l10n-id ' +
        'when data-l10n-id is found', function(done) {
          var toneId = 'fake-tone';
          tone.button.textContent = 'test';
          tone.button.setAttribute('data-l10n-id', toneId);
          toneManager._renderTone(tone, result, secret);

          // We're adding one empty Promise to push the test past
          // the microtask in which the l10n resolves the string
          toneManager._isPlayableTone(fakeBlob).then(
            Promise.resolve()).then((value) => {
              assert.isTrue(window.alert.called);
              assert.isFalse(toneManager._setRingtone.called);
              assert.equal(tone.button.getAttribute('data-l10n-id'), toneId);
              assert.equal(tone.button.textContent, 'test');
        }).then(done, done);
      });
    });
  });

  suite('_pickTone', function() {
    var tone;
    var secret = 'fakesecret';
    var fakeBlob = new Blob([], {type: 'audio/ogg'});
    setup(function() {
      this.clock = sinon.useFakeTimers();
      tone = {
        pickType: 'alerttone',
        settingsKey: 'notification.ringtone',
        allowNone: true,
        button: dom,
        desc: dom
      };
      this.sinon.spy(toneManager, '_setRingtone');
      this.sinon.stub(toneManager, '_renderTone');
      this.sinon.stub(window, 'alert');
    });

    teardown(function(){
      this.clock.restore();
    });

    test('pick activity is called', function() {
      window.MozActivity.successResult = { blob: fakeBlob };
      toneManager._pickTone(tone, '123', secret);
      this.clock.tick(100);
      assert.equal(window.MozActivity.calls[0].name, 'pick');
      assert.equal(window.MozActivity.calls[0].data.includeLocked, true);
      assert.equal(window.MozActivity.calls[0].data.type, tone.pickType);
      assert.equal(window.MozActivity.calls[0].data.allowNone, true);
    });

    test('generally blob is exist, _setRingtone and alert are not called',
      function(done) {
        window.MozActivity.successResult = { blob: fakeBlob };
        toneManager._pickTone(tone, '123', secret);
        this.clock.tick(100);
        Promise.resolve().then(() => {
          assert.isFalse(window.alert.called);
          assert.isFalse(toneManager._setRingtone.called);
          assert.isTrue(toneManager._renderTone.calledWith(
            tone, window.MozActivity.successResult, secret));
          done();
        });
    });

    test('_setRingtone is called while blob is not exist and ' +
      'tone.allowNone is true', function(done) {
        window.MozActivity.successResult = {};
        toneManager._pickTone(tone, '123', secret);
        this.clock.tick(100);
        Promise.resolve().then(() => {
          assert.isFalse(window.alert.called);
          assert.isTrue(toneManager._setRingtone.called);
          assert.isFalse(toneManager._renderTone.called);
          done();
        });
    });

    test('alert is called while blob is not exist and ' +
      'tone.allowNone is false', function(done) {
        var tone2 = {
          pickType: 'alerttone',
          settingsKey: 'notification.ringtone',
          allowNone: false,
          button: dom
        };
        window.MozActivity.successResult = {};
        toneManager._pickTone(tone2, '123', secret);
        this.clock.tick(100);
        Promise.resolve().then(() => {
          assert.isTrue(window.alert.called);
          assert.isFalse(toneManager._setRingtone.called);
          assert.isFalse(toneManager._renderTone.called);
          done();
        });
    });
  });

  suite('_handleTones', function() {
    var nameKey = 'notification.ringtone.name';
    setup(function() {
      toneManager._tones = [{
        pickType: 'alerttone',
        settingsKey: 'notification.ringtone',
        allowNone: true, // Allow "None" as a choice for alert tones.
        button: dom,
        desc: dom
      }];
      this.sinon.spy(mockSettingsCache, 'getSettings');
      this.sinon.spy(mockForwardLock, 'getKey');
      this.sinon.stub(toneManager, '_pickTone');
      mockSettingsCache.mockSettings({'notification.ringtone.id': 'demo'});
      toneManager._handleTones();
    });

    teardown(function() {
      navigator.mozSettings.mTeardown();
      mockSettingsCache.mTeardown();
    });

    test('we would set button textContent in SettingsListener', function() {
      mockSettingsListener.mCallbacks[nameKey]('classic');
      assert.equal(toneManager._tones[0].button.textContent, 'classic');
    });

    test('we would click button and make sure _pickTone is called', function() {
      toneManager._tones[0].button.dispatchEvent(new CustomEvent('click'));
      assert.ok(mockSettingsCache.getSettings.called);
      assert.ok(mockForwardLock.getKey.called);
      mockForwardLock.getKey.args[0][0]();
      assert.ok(toneManager._pickTone.calledWith(toneManager._tones[0],
        'demo'));
    });
  });
});
