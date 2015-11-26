/* global MocksHelper, MockL10n, MockNavigatormozSetMessageHandler,
   MockNavigatorSettings, MockMozBluetooth */
'use strict';

require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_bluetooth.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
requireApp('bluetooth/test/unit/mock_gDeviceList.js');

function switchReadOnlyProperty(originObject, propName, targetObj) {
  Object.defineProperty(originObject, propName, {
    configurable: true,
    get: function() { return targetObj; }
  });
}

var mocksForTransferHelper = new MocksHelper([
  'NavigatorSettings',
  'gDeviceList'
]).init();

suite('Bluetooth app > transfer ', function() {
  var realL10n;
  var mockOnceFunc;
  var realSetMessageHandler;
  var realMozSettings;
  var realMozBluetooth;
  var dialogConfirmBluetooth;
  var bluetoothCancelButton;
  var bluetoothTurnOnButton;
  var dialogAlertView;
  var alertOkButton;

  mocksForTransferHelper.attachTestHelpers();

  suiteSetup(function(done) {
    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;
    mockOnceFunc = MockL10n.once;
    MockL10n.once = function(handler) { handler(); };

    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realMozBluetooth = navigator.mozBluetooth;
    switchReadOnlyProperty(navigator, 'mozBluetooth', MockMozBluetooth);

    MockNavigatormozSetMessageHandler.mSetup();

    loadBodyHTML('./_transfer.html');
    requireApp('bluetooth/js/transfer.js', done);
  });

  suiteTeardown(function() {
    MockNavigatormozSetMessageHandler.mTeardown();
    navigator.mozSetMessageHandler = realSetMessageHandler;
    navigator.mozSettings = realMozSettings;
    switchReadOnlyProperty(navigator, 'mozBluetooth', realMozBluetooth);
    window.navigator.mozL10n = realL10n;
    MockL10n.once = mockOnceFunc;
    document.body.innerHTML = '';
  });

  setup(function() {
    dialogConfirmBluetooth = document.getElementById('enable-bluetooth-view');
    bluetoothCancelButton = document.getElementById(
      'enable-bluetooth-button-cancel');
    bluetoothTurnOnButton = document.getElementById(
      'enable-bluetooth-button-turn-on');
    dialogAlertView = document.getElementById('alert-view');
    alertOkButton = document.getElementById('alert-button-ok');
  });

  suite('handle "share" activity > ', function() {
    var shareActivity, bluetoothKey;

    setup(function() {
      shareActivity = {
        source: {
          name: 'share',
          data: {
            blobs: [new Blob(), new Blob()],
            filenames: ['testBlob1', 'testBlob2']
          }
        }
      };

      bluetoothKey = 'bluetooth.enabled';
      MockNavigatormozSetMessageHandler.mTrigger('activity', shareActivity);
    });

    test('observes settings key "bluetooth.enabled"', function() {
      assert.equal(MockNavigatorSettings.mObservers[bluetoothKey].length, 1);
    });

    test('confirme dialog is showing after Bluetooth is disabled', function() {
      dialogConfirmBluetooth.hidden = true;
      MockNavigatorSettings.mTriggerObservers(bluetoothKey,
                                              {settingValue: false});
      assert.isFalse(dialogConfirmBluetooth.hidden);
    });

    test('confirme dialog is closed after Bluetooth is enabled', function() {
      dialogConfirmBluetooth.hidden = false;
      MockNavigatorSettings.mTriggerObservers(bluetoothKey,
                                              {settingValue: true});
      assert.isTrue(dialogConfirmBluetooth.hidden);
    });
  });
});
