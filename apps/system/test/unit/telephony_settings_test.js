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
    setRoamingPreference: function() {}
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
      subject.start();
      assert.ok(privacyStub.calledOnce);
      assert.ok(roamingStub.calledOnce);
    });
  });

  suite('initVoicePrivacy', function() {
    var stub;
    setup(function() {
      navigator.mozMobileConnections = fakeConnections;
      stub = this.sinon.stub(fakeConnections[0], 'setVoicePrivacyMode')
        .returns(reqResponse);
    });

    teardown(function() {
      stub.restore();
    });

    test('setVoicePrivacyMode default value', function() {
      subject = new TelephonySettings();
      this.sinon.stub(subject, 'initRoaming');

      subject.start();
      assert.ok(stub.calledWith(false));
    });

    test('setVoicePrivacyMode from settings', function() {
      subject = new TelephonySettings();
      this.sinon.stub(subject, 'initRoaming');

      MockSettingsHelper.instances['ril.voicePrivacy.enabled'] =
        {value: ['custom-value']};
      subject.start();
      assert.ok(stub.calledWith('custom-value'));
    });
  });

  suite('initRoaming', function() {
    var stub;
    setup(function() {
      navigator.mozMobileConnections = fakeConnections;
      stub = this.sinon.stub(fakeConnections[0], 'setRoamingPreference')
        .returns(reqResponse);
    });

    teardown(function() {
      stub.restore();
    });

    test('setRoamingPreference default value', function() {
      subject = new TelephonySettings();
      this.sinon.stub(subject, 'initVoicePrivacy');

      subject.start();
      assert.ok(stub.calledWith('any'));
    });

    test('setRoamingPreference from settings', function() {
      subject = new TelephonySettings();
      this.sinon.stub(subject, 'initVoicePrivacy');

      MockSettingsHelper.instances['ril.roaming.preference'] =
        {value: ['custom-value2']};
      subject.start();
      assert.ok(stub.calledWith('custom-value2'));
    });
  });
});
