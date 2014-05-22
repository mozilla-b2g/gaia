/* global MocksHelper, MockL10n, MockNavigatorSettings,
          MockMozBluetooth, gDeviceList */
'use strict';

require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/load_body_html_helper.js');
requireApp('bluetooth/test/unit/mock_l10n.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_bluetooth.js');

function switchReadOnlyProperty(originObject, propName, targetObj) {
  Object.defineProperty(originObject, propName, {
    configurable: true,
    get: function() { return targetObj; }
  });
}

var mocksForDeviceListHelper = new MocksHelper([
  'NavigatorSettings'
]).init();

suite('Bluetooth app > deviceList ', function() {
  var realL10n;
  var realMozSettings;
  var realMozBluetooth;
  var deviceList;
  var bluetoothSearch;
  var searchAgainBtn;
  var searchingItem;
  var exitButton;

  mocksForDeviceListHelper.attachTestHelpers();

  suiteSetup(function(done) {
    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realMozBluetooth = navigator.mozBluetooth;
    switchReadOnlyProperty(navigator, 'mozBluetooth', MockMozBluetooth);

    loadBodyHTML('./_transfer.html');
    requireApp('bluetooth/js/deviceList.js', done);
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    switchReadOnlyProperty(navigator, 'mozBluetooth', realMozBluetooth);
    window.navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
  });

  setup(function() {
    deviceList = document.getElementById('devices-list-view');
    bluetoothSearch = document.getElementById('bluetooth-search');
    searchAgainBtn = document.getElementById('search-device');
    searchingItem = document.getElementById('bluetooth-searching');
    exitButton = document.getElementById('cancel-activity');
  });

  suite('deviceList > ', function() {
    test('list is updated with arg "true" ', function() {
      gDeviceList.update(true);
      assert.isFalse(bluetoothSearch.hidden);
      assert.isFalse(searchingItem.hidden);
    });

    test('list is updated with arg "false" ', function() {
      gDeviceList.update(false);
      assert.isTrue(bluetoothSearch.hidden);
      assert.isTrue(searchingItem.hidden);
    });
  });
});
