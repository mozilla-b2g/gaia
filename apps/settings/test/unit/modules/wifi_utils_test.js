/* global MockL10n, MockNavigatorSettings, MockNavigatorMozWifiManager,
          MockNavigatorSettings */
requireApp('settings/test/unit/mock_l10n.js');
requireApp('settings/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('settings/shared/test/unit/load_body_html_helper.js');
requireApp(
  'settings/shared/test/unit/mocks/mock_navigator_moz_wifi_manager.js');

mocha.globals(['MockWifiHelper']);

suite('WifiUtils', function() {
  'use strict';

  var realL10n;
  var realSettings;
  var wifiUtils;
  var settingsUtils;
  var map = {
    '*': {
      'modules/settings_utils': 'unit/mock_settings_utils',
      'shared/wifi_helper': 'shared_mocks/mock_wifi_helper'
    }
  };

  suiteSetup(function() {
    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;

    realSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
    window.navigator.mozSettings = realSettings;
  });

  setup(function(done) {
    testRequire([
      'modules/wifi_utils',
      'unit/mock_settings_utils',
    ], map, function(WifiUtils, MockSettingsUtils) {
      wifiUtils = WifiUtils;
      settingsUtils = MockSettingsUtils;

      MockNavigatorSettings.mSetup();
      MockNavigatorMozWifiManager.mSetup();
      done();
    });
  });

  test('newExplanationItem', function() {
    var li = wifiUtils.newExplanationItem('test');
    assert.equal(li.className, 'explanation');
    assert.equal(li.getAttribute('data-l10n-id'), 'test');
  });

  suite('changeDisplay', function() {
    var dialog;
    var eap;
    var identity;
    var password;
    var authPhase2;
    var certificate;
    var description;

    setup(function() {
      loadBodyHTML('./_wifi_utils.html');

      dialog = document.getElementById('wifi-auth');
      eap = dialog.querySelector('li.eap select');
      identity = dialog.querySelector('input[name=identity]');
      password = dialog.querySelector('input[name=password]');
      authPhase2 = dialog.querySelector('li.auth-phase2 select');
      certificate = dialog.querySelector('li.server-certificate select');
      description = dialog.querySelector('li.server-certificate-description');
    });

    teardown(function() {
      document.body.innerHTML = '';
    });

    test('panel is wifi-auth, security is WEP', function() {
      wifiUtils.changeDisplay(dialog, 'WEP');
      assert.equal(identity.parentNode.style.display, 'none');
      assert.equal(password.parentNode.style.display, 'block');
      assert.equal(authPhase2.parentNode.parentNode.style.display, 'none');
      assert.equal(certificate.parentNode.parentNode.style.display, 'none');
      assert.equal(description.style.display, 'none');
    });

    test('panel is wifi-auth, security is WPA-PSK', function() {
      wifiUtils.changeDisplay(dialog, 'WPA-PSK');
      assert.equal(identity.parentNode.style.display, 'none');
      assert.equal(password.parentNode.style.display, 'block');
      assert.equal(authPhase2.parentNode.parentNode.style.display, 'none');
      assert.equal(certificate.parentNode.parentNode.style.display, 'none');
      assert.equal(description.style.display, 'none');
    });

    test('panel is wifi-auth, security is WPA-EAP, eap is SIM', function() {
      eap.value = 'SIM';
      wifiUtils.changeDisplay(dialog, 'WPA-EAP');
      assert.equal(identity.parentNode.style.display, 'none');
      assert.equal(password.parentNode.style.display, 'none');
      assert.equal(authPhase2.parentNode.parentNode.style.display, 'none');
      assert.equal(certificate.parentNode.parentNode.style.display, 'none');
      assert.equal(description.style.display, 'none');
    });

    test('panel is wifi-auth, security is WPA-EAP, eap is PEAP', function() {
      eap.value = 'PEAP';
      wifiUtils.changeDisplay(dialog, 'WPA-EAP');
      assert.equal(identity.parentNode.style.display, 'block');
      assert.equal(password.parentNode.style.display, 'block');
      assert.equal(authPhase2.parentNode.parentNode.style.display, 'block');
      assert.equal(certificate.parentNode.parentNode.style.display, 'block');
      assert.equal(description.style.display, 'block');
    });

    test('panel is wifi-auth, security is WPA-EAP, eap is TLS', function() {
      eap.value = 'TLS';
      wifiUtils.changeDisplay(dialog, 'WPA-EAP');
      assert.equal(identity.parentNode.style.display, 'block');
      assert.equal(password.parentNode.style.display, 'block');
      assert.equal(authPhase2.parentNode.parentNode.style.display, 'block');
      assert.equal(certificate.parentNode.parentNode.style.display, 'block');
      assert.equal(description.style.display, 'block');
    });

    test('panel is wifi-auth, security is WPA-EAP, eap is TTLS', function() {
      eap.value = 'TTLS';
      wifiUtils.changeDisplay(dialog, 'WPA-EAP');
      assert.equal(identity.parentNode.style.display, 'block');
      assert.equal(password.parentNode.style.display, 'block');
      assert.equal(authPhase2.parentNode.parentNode.style.display, 'block');
      assert.equal(certificate.parentNode.parentNode.style.display, 'block');
      assert.equal(description.style.display, 'block');
    });
    
    test('panel is wifi-auth, security is none', function() {
      wifiUtils.changeDisplay(dialog, 'none');
      assert.equal(identity.parentNode.style.display, 'none');
      assert.equal(password.parentNode.style.display, 'none');
    });
  });

  test('loadImportedCertificateOptions', function() {
    var selectDOM = document.createElement('select');
    selectDOM.appendChild(createOption('--'));
    selectDOM.appendChild(createOption('1'));
    selectDOM.appendChild(createOption('2'));

    MockNavigatorMozWifiManager._certificateList = [
      'cert1', 'cert2', 'cert3'
    ];

    // the total options would be one default item and certificates
    var expectedLengthOfOptions = 
      1 + MockNavigatorMozWifiManager._certificateList.length;

    this.sinon.spy(selectDOM, 'remove');
    this.sinon.spy(selectDOM, 'add');
    wifiUtils.loadImportedCertificateOptions(selectDOM);

    // we have three options, but we would keep the first one
    assert.isTrue(selectDOM.remove.calledTwice);
    // and we would add three options back based on the number of our fake
    // certificates
    assert.isTrue(selectDOM.add.calledThrice);
    // and the total options should be one default item and certificates
    assert.equal(selectDOM.options.length, expectedLengthOfOptions);
  });

  function createOption(value) {
    var dom = document.createElement('option');
    dom.text = value;
    dom.value = value;
    return dom;
  }
});
