'use strict';
/* global MockNavigatorSettings, BaseModule */

requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/telephony_settings.js');
requireApp('system/js/settings_core.js');

suite('system/TelephonySettings', function() {
  var subject, settingsCore, realSettings;

  var reqResponse = {
    onerror: function() {}
  };

  var fakeConnections = [{
    setVoicePrivacyMode: function() {},
    setRoamingPreference: function() {},
    getCallingLineIdRestriction: function() {},
    setCallingLineIdRestriction: function() {},
    setPreferredNetworkType: function() {},
    supportedNetworkTypes: ['gsm', 'wcdma', 'cdma', 'evdo'],
    addEventListener: function() {},
    removeEventListener: function() {},
    radioState: 'enabled',
    voice: {
      connected: true
    }
  }];

  setup(function() {
    MockNavigatorSettings.mSyncRepliesOnly = true;
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    settingsCore = BaseModule.instantiate('SettingsCore');
    settingsCore.start();
    subject = BaseModule.instantiate('TelephonySettings',
      { mobileConnections: ['foo'] });
  });

  teardown(function() {
    subject.stop();
    settingsCore.stop();
    navigator.mozSettings = realSettings;
  });

  suite('constructor', function() {
    test('sets connections', function() {
      assert.deepEqual(subject.connections, ['foo']);
    });

    test('defaults to empty', function() {
      subject = BaseModule.instantiate('TelephonySettings',
        { mobileConnections: null });
      assert.deepEqual(subject.connections, []);
    });
  });

  suite('initVoicePrivacy', function() {
    var stub, subject;
    setup(function() {
      navigator.mozMobileConnections = fakeConnections;
      stub = this.sinon.stub(fakeConnections[0], 'setVoicePrivacyMode')
        .returns(reqResponse);

      subject = BaseModule.instantiate('TelephonySettings',
        { mobileConnections: fakeConnections });
    });

    teardown(function() {
      stub.restore();
    });

    test('setVoicePrivacyMode from settings', function() {
      subject.start();
      MockNavigatorSettings.mTriggerObservers(
        'ril.voicePrivacy.enabled', {settingValue: ['custom-value']});
      assert.ok(stub.calledWith('custom-value'));
    });
  });

  suite('initRoaming', function() {
    var stub, subject;
    setup(function() {
      navigator.mozMobileConnections = fakeConnections;
      stub = this.sinon.stub(fakeConnections[0], 'setRoamingPreference')
        .returns(reqResponse);

      subject = BaseModule.instantiate('TelephonySettings',
        { mobileConnections: fakeConnections });
    });

    teardown(function() {
      stub.restore();
    });

    test('setRoamingPreference from settings', function() {
      MockNavigatorSettings.mTriggerObservers(
        'ril.roaming.preference', { settingValue: ['custom-value2']});
      subject.start();
      assert.ok(stub.calledWith('custom-value2'));
    });
  });

  suite('initCallerIdPreference', function() {
    var getStub, setStub, subject;
    setup(function() {
      navigator.mozMobileConnections = fakeConnections;
      getStub = this.sinon.stub(fakeConnections[0],
        'getCallingLineIdRestriction').returns(reqResponse);
      setStub = this.sinon.stub(fakeConnections[0],
        'setCallingLineIdRestriction').returns(reqResponse);

      subject = BaseModule.instantiate('TelephonySettings',
        { mobileConnections: fakeConnections });
      sinon.spy(subject, '_registerListenerForCallerIdPreference');
    });

    teardown(function() {
      getStub.restore();
      setStub.restore();
    });

    test('_registerListenerForCallerIdPreference is called when init',
      function() {
        subject.start();
        MockNavigatorSettings.mTriggerObservers(
          'ril.clirMode', { settingValue: [null]});
        assert.ok(subject._registerListenerForCallerIdPreference
          .calledWith(fakeConnections[0], 0));
    });

    test('setCallingLineIdRestriction from settings', function() {
      subject.start();
      MockNavigatorSettings.mTriggerObservers(
        'ril.clirMode', { settingValue: ['custom-value-clir']});
      assert.ok(setStub.calledWith('custom-value-clir'));
    });

    test('setCallingLineIdRestriction should not be called when user ' +
      'preference is not available', function() {
        MockNavigatorSettings.mTriggerObservers(
          'ril.clirMode', {settingValue: null});
        subject.start();
        assert.ok(setStub.notCalled);
    });

    test('_syncCallerIdPreferenceWithCarrier should set a default value when ' +
      'necessary', function() {
        MockNavigatorSettings.mTriggerObservers('ril.clirMode',
          {settingValue: null});

        var fakeValue = 1;

        this.sinon.stub(subject, '_getCallerIdPreference',
          function(conn, callback) {
            callback(fakeValue);
        });
        subject.start();
        subject._syncCallerIdPreferenceWithCarrier({}, 0);
        assert.deepEqual(
          MockNavigatorSettings.mSettings['ril.clirMode'], [fakeValue]);
    });
  });

  suite('initPreferredNetworkType', function() {
    var stub, subject;
    setup(function() {
      navigator.mozMobileConnections = fakeConnections;
      stub = this.sinon.stub(fakeConnections[0], 'setPreferredNetworkType')
        .returns(reqResponse);

      subject = BaseModule.instantiate('TelephonySettings',
        { mobileConnections: fakeConnections });
    });

    teardown(function() {
      stub.restore();
    });

    test('setPreferredNetworkType default value', function() {
      MockNavigatorSettings.mTriggerObservers(
        'ril.radio.preferredNetworkType',
        { settingValue: null});
      subject.start();
      assert.ok(stub.calledWith('wcdma/gsm/cdma/evdo'));
    });

    test('setPreferredNetworkType from settings', function() {
      MockNavigatorSettings.mTriggerObservers(
        'ril.radio.preferredNetworkType',
        { settingValue: ['custom-value3']});
      subject.start();
      assert.ok(stub.calledWith('custom-value3'));
    });

    test('setPreferredNetworkType is not called when radio state is not ' +
      'enabled', function() {
        var fakeConnection = fakeConnections[0];
        var originalRadioState = fakeConnection.radioState;

        fakeConnection.radioState = 'disabled';
        subject.start();
        assert.ok(stub.notCalled);
        fakeConnection.radioState = originalRadioState;
    });

    test('setPreferredNetworkType is called when radio state becomes enabled',
      function() {
        var fakeConnection = fakeConnections[0];
        var originalRadioState = fakeConnection.radioState;
        var callbacks = {
          'radiostatechange': []
        };
        sinon.stub(fakeConnection, 'addEventListener',
          function(event, callback) {
            if (callbacks[event]) {
              callbacks[event].push(callback);
            }
        });
        sinon.spy(fakeConnection, 'removeEventListener');

        fakeConnection.radioState = 'disabled';
        subject.start();
        MockNavigatorSettings.mTriggerObservers(
          'ril.radio.preferredNetworkType',
          { settingValue: ['custom-value3']});
        fakeConnection.radioState = 'enabled';
        callbacks.radiostatechange.forEach(function(callback) {
          callback();
        });

        assert.ok(stub.called);
        // Ensure that the event listener is removed correctly
        sinon.assert.calledWith(fakeConnection.removeEventListener,
          'radiostatechange', callbacks.radiostatechange[0]);

        fakeConnection.addEventListener.restore();
        fakeConnection.removeEventListener.restore();
        fakeConnection.radioState = originalRadioState;
    });

    test('should save a default value when ril.radio.preferredNetworkType is ' +
      'empty', function() {
        var fakeDefaultValue = ['fakeValue'];
        sinon.stub(subject, '_getDefaultPreferredNetworkTypes')
          .returns(fakeDefaultValue);

        subject.start();

        MockNavigatorSettings.mTriggerObservers(
          'ril.radio.preferredNetworkType',
          {settingValue: null });
        assert.deepEqual(fakeDefaultValue,
          MockNavigatorSettings.mSettings['ril.radio.preferredNetworkType']);
    });

    test('should migrate when ril.radio.preferredNetworkType is a string',
      function() {
        var fakeValue = 'fakeValue';
        MockNavigatorSettings.mTriggerObservers(
          'ril.radio.preferredNetworkType',
          {settingValue: fakeValue });

        subject.start();
        assert.deepEqual([fakeValue],
          MockNavigatorSettings.mSettings['ril.radio.preferredNetworkType']);
    });
  });
});
