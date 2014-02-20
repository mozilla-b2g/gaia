'use strict';
/* global MocksHelper, MockSettingsHelper, TelephonySettings */

requireApp('system/shared/test/unit/mocks/mock_settings_helper.js');
requireApp('system/js/telephony_settings.js');

mocha.globals(['TelephonySettings']);

var mocksForTelephonySettings = new MocksHelper([
  'SettingsHelper'
]).init();

suite('system/TelephonySettings', function() {
  var subject;
  var originalMobileConnections;
  mocksForTelephonySettings.attachTestHelpers();

  var reqResponse = {
    onerror: function() {}
  };

  var fakeConnections = [{
    setVoicePrivacyMode: function() {},
    setRoamingPreference: function() {},
    setPreferredNetworkType: function() {},
    supportedNetworkTypes: ['gsm', 'wcdma', 'cdma', 'evdo'],
    addEventListener: function() {},
    removeEventListener: function() {},
    radioState: 'enabled'
  }];

  setup(function() {
    originalMobileConnections = navigator.mozMobileConnections;
  });

  teardown(function() {
    navigator.mozMobileConnections = originalMobileConnections;
  });

  suite('constructor', function() {
    test('sets connections', function() {
      navigator.mozMobileConnections = ['foo'];
      subject = new TelephonySettings();
      assert.deepEqual(subject.connections, ['foo']);
    });

    test('defaults to empty', function() {
      navigator.mozMobileConnections = null;
      subject = new TelephonySettings();
      assert.deepEqual(subject.connections, []);
    });
  });

  suite('start', function() {
    test('does not call methods if no connections', function() {
      navigator.mozMobileConnections = null;
      subject = new TelephonySettings();
      var privacyStub = this.sinon.stub(subject, 'initVoicePrivacy');
      var roamingStub = this.sinon.stub(subject, 'initRoaming');
      subject.start();
      assert.ok(privacyStub.notCalled);
      assert.ok(roamingStub.notCalled);
    });

    test('calls init methods', function() {
      navigator.mozMobileConnections = fakeConnections;
      subject = new TelephonySettings();
      var privacyStub = this.sinon.stub(subject, 'initVoicePrivacy');
      var roamingStub = this.sinon.stub(subject, 'initRoaming');
      var preferredStub = this.sinon.stub(subject, 'initPreferredNetworkType');
      subject.start();
      assert.ok(privacyStub.calledOnce);
      assert.ok(roamingStub.calledOnce);
      assert.ok(preferredStub.calledOnce);
    });
  });

  suite('initVoicePrivacy', function() {
    var stub, subject;
    setup(function() {
      navigator.mozMobileConnections = fakeConnections;
      stub = this.sinon.stub(fakeConnections[0], 'setVoicePrivacyMode')
        .returns(reqResponse);

      subject = new TelephonySettings();
      this.sinon.stub(subject, 'initRoaming');
      this.sinon.stub(subject, 'initPreferredNetworkType');
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

      subject = new TelephonySettings();
      this.sinon.stub(subject, 'initVoicePrivacy');
      this.sinon.stub(subject, 'initPreferredNetworkType');
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

  suite('initPreferredNetworkType', function() {
    var stub, subject;
    setup(function() {
      navigator.mozMobileConnections = fakeConnections;
      stub = this.sinon.stub(fakeConnections[0], 'setPreferredNetworkType')
        .returns(reqResponse);

      subject = new TelephonySettings();
      this.sinon.stub(subject, 'initVoicePrivacy');
      this.sinon.stub(subject, 'initRoaming');
    });

    teardown(function() {
      stub.restore();
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
        console.log(callbacks.radiostatechange.length);
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
  });
});
