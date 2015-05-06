'use strict';
/* global MocksHelper, MockSettingsHelper, BaseModule */

requireApp('system/shared/test/unit/mocks/mock_settings_helper.js');
requireApp('system/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/telephony_settings.js');

var mocksForTelephonySettings = new MocksHelper([
  'SettingsHelper', 'LazyLoader'
]).init();

suite('system/TelephonySettings', function() {
  var subject;
  mocksForTelephonySettings.attachTestHelpers();

  var functionsUnderTest = [
    'initVoicePrivacy',
    'initRoaming',
    'initCallerIdPreference',
    'initPreferredNetworkType'
  ];

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

  // Stub functions of the subject
  var stubFunctions = function(subject, exceptions) {
    exceptions = exceptions || [];
    return functionsUnderTest.map(function(name) {
      if (exceptions.indexOf(name) === -1) {
        return sinon.stub(subject, name);
      } else {
        return null;
      }
    });
  };

  suite('constructor', function() {
    test('sets connections', function() {
      subject = BaseModule.instantiate('TelephonySettings',
        { mobileConnections: ['foo'] });
      assert.deepEqual(subject.connections, ['foo']);
    });

    test('defaults to empty', function() {
      subject = BaseModule.instantiate('TelephonySettings',
        { mobileConnections: null });
      assert.deepEqual(subject.connections, []);
    });
  });

  suite('start', function() {
    test('calls init methods', function() {
      navigator.mozMobileConnections = fakeConnections;
      subject = BaseModule.instantiate('TelephonySettings',
        { mobileConnections: fakeConnections });
      var stubs = stubFunctions(subject);
      subject.start();
      assert.ok(stubs.every(stub => stub.calledOnce));
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
      stubFunctions(subject, 'initVoicePrivacy');
    });

    teardown(function() {
      stub.restore();
    });

    test('setVoicePrivacyMode default value', function() {
      subject.start();
      assert.ok(stub.calledWith(false));
    });

    test('setVoicePrivacyMode from settings', function() {
      MockSettingsHelper.instances['ril.voicePrivacy.enabled'] =
        {value: ['custom-value']};
      subject.start();
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
      stubFunctions(subject, 'initRoaming');
    });

    teardown(function() {
      stub.restore();
    });

    test('setRoamingPreference default value', function() {
      subject.start();
      assert.ok(stub.calledWith('any'));
    });

    test('setRoamingPreference from settings', function() {
      MockSettingsHelper.instances['ril.roaming.preference'] =
        {value: ['custom-value2']};
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
      MockSettingsHelper.instances['ril.clirMode'] = {
        value: ['custom-value-clir']
      };

      subject = BaseModule.instantiate('TelephonySettings',
        { mobileConnections: fakeConnections });
      stubFunctions(subject, 'initCallerIdPreference');
      sinon.spy(subject, '_registerListenerForCallerIdPreference');
    });

    teardown(function() {
      getStub.restore();
      setStub.restore();
    });

    test('_registerListenerForCallerIdPreference is called when init',
      function() {
        subject.start();
        reqResponse.onsuccess();
        assert.ok(subject._registerListenerForCallerIdPreference
          .calledWith(fakeConnections[0], 0));
    });

    test('setCallingLineIdRestriction from settings', function() {
      subject.start();
      assert.ok(setStub.calledWith('custom-value-clir'));
    });

    test('setCallingLineIdRestriction should not be called when user ' +
      'preference is not available', function() {
        MockSettingsHelper.instances['ril.clirMode'] = {
          value: null
        };
        subject.start();
        assert.ok(setStub.notCalled);
    });

    test('_syncCallerIdPreferenceWithCarrier should set a default value when ' +
      'necessary', function() {
        MockSettingsHelper.instances['ril.clirMode'] = {
          value: null
        };

        var fakeValue = 1;
        var mockSettingsHelper = MockSettingsHelper('ril.clirMode');

        this.sinon.stub(subject, '_getCallerIdPreference',
          function(conn, callback) {
            callback(fakeValue);
        });
        this.sinon.stub(mockSettingsHelper, 'set');

        subject._syncCallerIdPreferenceWithCarrier({}, 0, mockSettingsHelper);
        assert.deepEqual(
          mockSettingsHelper.set.getCall(0).args[0], [fakeValue]);
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
      stubFunctions(subject, 'initPreferredNetworkType');
    });

    teardown(function() {
      stub.restore();
      MockSettingsHelper.mTeardown();
    });

    test('setPreferredNetworkType default value', function() {
      subject.start();
      assert.ok(stub.calledWith('wcdma/gsm/cdma/evdo'));
    });

    test('setPreferredNetworkType from settings', function() {
      MockSettingsHelper.instances['ril.radio.preferredNetworkType'] =
        {value: ['custom-value3']};
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
        fakeConnection.radioState = 'enabled';
        callbacks.radiostatechange.forEach(function(callback) {
          callback();
        });

        assert.ok(stub.calledOnce);
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
        assert.deepEqual(fakeDefaultValue,
          MockSettingsHelper.instances['ril.radio.preferredNetworkType'].value);
    });

    test('should migrate when ril.radio.preferredNetworkType is a string',
      function() {
        var fakeValue = 'fakeValue';
        MockSettingsHelper.instances['ril.radio.preferredNetworkType'] =
          { value: fakeValue };

        subject.start();
        assert.deepEqual([fakeValue],
          MockSettingsHelper.instances['ril.radio.preferredNetworkType'].value);
    });
  });
});
