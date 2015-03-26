/* global MockL10n, MockNavigatorSettings, MockNavigatorMozWifiManager,
          MockNavigatorSettings */
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('settings/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('settings/shared/test/unit/load_body_html_helper.js');
requireApp(
  'settings/shared/test/unit/mocks/mock_navigator_moz_wifi_manager.js');

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

  suite('updateListItemStatus', function() {
    var fakeNetworkKey = 'network1';
    var fakeListItems;
    var fakeListItemDOM;
    var fakeActiveItemDOM;

    setup(function() {
      this.sinon.stub(wifiUtils, 'getNetworkKey').returns(fakeNetworkKey);

      fakeListItems = {};
      fakeListItemDOM = document.createElement('div');
      fakeListItemDOM.appendChild(document.createElement('small'));
      fakeListItemDOM.appendChild(document.createElement('aside'));

      fakeActiveItemDOM = document.createElement('div');
      fakeActiveItemDOM.appendChild(document.createElement('small'));
      fakeActiveItemDOM.appendChild(document.createElement('aside'));

      fakeListItems[fakeNetworkKey] = fakeListItemDOM;
    });

    suite('with no needed parameters', function() {
      setup(function() {
        this.sinon.stub(window.console, 'log');
        wifiUtils.updateListItemStatus();
      });
      test('we will get error message', function() {
        assert.isTrue(window.console.log.called);
      });
    });

    suite('if we are connecting to an AP with `connecting` status', function() {
      setup(function() {
        wifiUtils.updateListItemStatus({
          network: {},
          networkStatus: 'connecting',
          listItems: fakeListItems,
          activeItemDOM: fakeActiveItemDOM
        });
      });

      test('activeItemDOM is cleaned up to normal status', function() {
        assert.isFalse(fakeActiveItemDOM.classList.contains('active'));
        assert.equal(fakeActiveItemDOM.querySelector('small').dataset.l10nId,
          'shortStatus-disconnected');
        assert.isFalse(fakeActiveItemDOM.querySelector(
          'aside').classList.contains('connecting'));
        assert.isFalse(fakeActiveItemDOM.querySelector(
          'aside').classList.contains('connected'));
      });

      test('listItemDOM is in right status', function() {
        assert.isTrue(fakeListItemDOM.classList.contains('active'));
        assert.equal(fakeListItemDOM.querySelector('small').dataset.l10nId,
          'shortStatus-connecting');
        assert.isTrue(fakeListItemDOM.querySelector(
          'aside').classList.contains('connecting'));
        assert.isFalse(fakeListItemDOM.querySelector(
          'aside').classList.contains('connected'));
      });
    });

    suite('if we are connecting to an AP with `connected` status', function() {
      setup(function() {
        wifiUtils.updateListItemStatus({
          network: {},
          networkStatus: 'connected',
          listItems: fakeListItems,
          activeItemDOM: fakeActiveItemDOM
        });
      });

      test('listItemDOM is in right status', function() {
        assert.isTrue(fakeListItemDOM.classList.contains('active'));
        assert.equal(fakeListItemDOM.querySelector('small').dataset.l10nId,
          'shortStatus-connected');
        assert.isTrue(fakeListItemDOM.querySelector(
          'aside').classList.contains('connected'));
        assert.isFalse(fakeListItemDOM.querySelector(
          'aside').classList.contains('connecting'));
      });
    });
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

  suite('newListItem', function() {
    test('WPA-PSK network - not configured, in range', function() {
      var testNetwork = {
        ssid: 'Dummy network',
        security: ['WPA-PSK'],
        relSignalStrength: 40,
        known: false,
      };
      var l10nSpy = this.sinon.spy(navigator.mozL10n, 'setAttributes');

      var listItem = wifiUtils.newListItem({
        network: testNetwork
      });

      var icon = listItem.querySelector('aside');
      assert.ok(icon.classList.contains('secured'));

      var a = listItem.querySelector('a');
      var ssid = a.querySelector('span');
      assert.equal(ssid.textContent, testNetwork.ssid);

      var small = a.querySelector('small');
      assert.ok(l10nSpy.calledWith(small, 'securedBy',
        {capabilities: 'WPA-PSK'}));
    });

    test('WPA-PSK network - configured, in range', function() {
      var testNetwork = {
        ssid: 'Dummy network',
        security: ['WPA-PSK'],
        relSignalStrength: 40,
        known: true,
      };
      var l10nSpy = this.sinon.spy(navigator.mozL10n, 'setAttributes');

      var listItem = wifiUtils.newListItem({
        network: testNetwork
      });

      var icon = listItem.querySelector('aside');
      assert.ok(icon.classList.contains('secured'));

      var a = listItem.querySelector('a');
      var ssid = a.querySelector('span');
      assert.equal(ssid.textContent, testNetwork.ssid);

      var small = a.querySelector('small');
      assert.ok(l10nSpy.calledWith(small, 'securedBy',
        {capabilities: 'WPA-PSK'}));
    });

    test('WPA-PSK network - configured, not in range', function() {
      var testNetwork = {
        ssid: 'Dummy network',
        security: ['WPA-PSK'],
        relSignalStrength: 0,
        known: true,
      };
      var listItem = wifiUtils.newListItem({
        network: testNetwork,
        showNotInRange: true
      });

      var icon = listItem.querySelector('aside');
      assert.ok(icon.classList.contains('secured'));

      var a = listItem.querySelector('a');
      var ssid = a.querySelector('span');
      assert.equal(ssid.textContent, testNetwork.ssid);

      var small = a.querySelector('small');
      assert.equal(small.getAttribute('data-l10n-id'), 'notInRange');
    });

    test('Open network - not configured, in range', function() {
      var testNetwork = {
        ssid: 'Dummy network',
        security: [],
        relSignalStrength: 40,
        known: false,
      };
      var listItem = wifiUtils.newListItem({
        network: testNetwork
      });

      var icon = listItem.querySelector('aside');
      assert.ok(!icon.classList.contains('secured'));

      var a = listItem.querySelector('a');
      var ssid = a.querySelector('span');
      assert.equal(ssid.textContent, testNetwork.ssid);

      var small = a.querySelector('small');
      assert.equal(small.getAttribute('data-l10n-id'), 'securityOpen');
    });

    test('OPEN network - configured, in range', function() {
      var testNetwork = {
        ssid: 'Dummy network',
        security: [],
        relSignalStrength: 40,
        known: true,
      };
      var listItem = wifiUtils.newListItem({
        network: testNetwork
      });

      var icon = listItem.querySelector('aside');
      assert.ok(!icon.classList.contains('secured'));

      var a = listItem.querySelector('a');
      var ssid = a.querySelector('span');
      assert.equal(ssid.textContent, testNetwork.ssid);

      var small = a.querySelector('small');
      assert.equal(small.getAttribute('data-l10n-id'), 'securityOpen');
    });

    test('OPEN network - configured, not in range', function() {
      var testNetwork = {
        ssid: 'Dummy network',
        security: [],
        relSignalStrength: 0,
        known: true,
      };
      var listItem = wifiUtils.newListItem({
        network: testNetwork,
        showNotInRange: true
      });

      var icon = listItem.querySelector('aside');
      assert.ok(!icon.classList.contains('secured'));

      var a = listItem.querySelector('a');
      var ssid = a.querySelector('span');
      assert.equal(ssid.textContent, testNetwork.ssid);

      var small = a.querySelector('small');
      assert.equal(small.getAttribute('data-l10n-id'), 'notInRange');
    });
  });

  suite('updateNetworkSignal', function() {
    var testNetwork;
    var availableNetworks;
    var listItem;
    var networkIcon;

    setup(function() {
      loadBodyHTML('./_wifi_utils.html');
      testNetwork = {
        ssid: 'Dummy network',
        security: ['WPA-PSK'],
        relSignalStrength: 40,
        known: false,
      };
      listItem = wifiUtils.newListItem({
        network: testNetwork
      });
      networkIcon = listItem.querySelector('aside');

      availableNetworks = document.querySelector('ul.wifi-availableNetworks');
      availableNetworks.appendChild(listItem);
    });

    teardown(function() {
      document.body.innerHTML = '';
    });

    test('Signal Strength changes', function() {
      assert.isTrue(networkIcon.classList.contains('level-2'));
      wifiUtils.updateNetworkSignal(testNetwork, 100);
      assert.isTrue(networkIcon.classList.contains('level-4'));
    });
  });

  function createOption(value) {
    var dom = document.createElement('option');
    dom.text = value;
    dom.value = value;
    return dom;
  }
});
