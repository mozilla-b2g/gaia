/* global MockNavigatorSettings*/
'use strict';

requireApp('settings/shared/test/unit/mocks/mock_navigator_moz_settings.js');

mocha.globals(['Settings']);

suite('start testing > ', function() {
  var realMozSettings;
  var realSettingsListener;
  var mockSettingsCache;
  var usbTransfer;

  var _keyTransferProtocol = 'usb.transfer';

  var MODE_UMS = 1;
  var MODE_UMS_UNPLUG = 2;
  var MODE_MTP = 3;
  var PROTOCOL_UMS = '0';
  var PROTOCOL_MTP = '1';

  suiteSetup(function(done) {
    testRequire([
      'shared_mocks/mock_settings_listener',
      'unit/mock_settings_cache',
      'panels/usb_storage/usb_transfer'
    ],
    { //mock map
      '*': {
        'module/settings_cache': 'unit/mock_settings_cache',
        'shared/settings_listener': 'shared_mocks/mock_settings_listener'
      }
    },
    function(MockSettingsListener, MockSettingsCache, usb_transfer) {
      realMozSettings = window.navigator.mozSettings;
      window.navigator.mozSettings = MockNavigatorSettings;

      realSettingsListener = window.SettingsListener;
      window.SettingsListener = MockSettingsListener;

      mockSettingsCache = MockSettingsCache;

      usbTransfer = usb_transfer();
      done();
    });
  });

  suiteTeardown(function() {
    window.navigator.mozSettings = realMozSettings;
    window.SettingsListener = realSettingsListener;
  });

  suite('initialization', function() {
    setup(function() {
      this.sinon.stub(usbTransfer, '_configProtocol');
      usbTransfer.init();
    });

    test('init', function() {
      window.SettingsListener.mTriggerCallback(_keyTransferProtocol,
        PROTOCOL_UMS);
      assert.ok(usbTransfer._configProtocol.called);
    });
  });

  // mode 0 is disabled, should be filtered by _configProtocol
  suite('_changeMode', function() {
    setup(function() {
      this.sinon.stub(usbTransfer, '_setMode');
    });

    test('mode 1 + protocol ums', function() {
      usbTransfer._changeMode(MODE_UMS, PROTOCOL_UMS);
      assert.ok(!usbTransfer._setMode.called);
    });

    test('mode 2 + protocol ums', function() {
      usbTransfer._changeMode(MODE_UMS_UNPLUG, PROTOCOL_UMS);
      assert.ok(!usbTransfer._setMode.called);
    });

    test('mode 3 + protocol ums', function() {
      usbTransfer._changeMode(MODE_MTP, PROTOCOL_UMS);
      assert.ok(usbTransfer._setMode.calledWith(MODE_UMS));
    });

    test('mode 1 + protocol mtp', function() {
      usbTransfer._changeMode(MODE_UMS, PROTOCOL_MTP);
      assert.ok(usbTransfer._setMode.calledWith(MODE_MTP));
    });

    test('mode 2 + protocol mtp', function() {
      usbTransfer._changeMode(MODE_UMS_UNPLUG, PROTOCOL_MTP);
      assert.ok(usbTransfer._setMode.calledWith(MODE_MTP));
    });

    test('mode 3 + protocol mtp', function() {
      usbTransfer._changeMode(MODE_MTP, PROTOCOL_MTP);
      assert.ok(!usbTransfer._setMode.called);
    });
  });
});
