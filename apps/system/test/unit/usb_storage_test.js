'use strict';
/* global MocksHelper, MockSettingsListener, UsbStorage */

require('/shared/test/unit/mocks/mock_service.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/js/usb_storage.js');

var mocksForStorage = new MocksHelper([
  'NavigatorSettings',
  'SettingsListener',
  'Service'
]).init();

suite('system/USB Storage', function() {
  var subject;

  mocksForStorage.attachTestHelpers();
  setup(function() {
    subject = new UsbStorage();
  });

  teardown(function() {
    subject.stop();
  });

  suite('init', function() {
    test('calls _usbStorageChanged', function() {
      var setModeStub = this.sinon.stub(UsbStorage.prototype, '_setMode');
      this.sinon.stub(UsbStorage.prototype, '_usbStorageChanged');
      subject = new UsbStorage();
      MockSettingsListener.mCallbacks['ums.enabled'](1);
      assert.ok(setModeStub.calledWith(subject.automounterDisable));
      assert.ok(subject._usbStorageChanged.called);
    });
  });

  suite('configUsbTransfer', function() {
    test('calls setMode', function() {
      var setModeStub = this.sinon.stub(UsbStorage.prototype, '_setMode');
      subject = new UsbStorage();
      assert.ok(setModeStub.calledWith(subject.automounterDisable));
    });

    test('sets ums mode when locked', function() {
      var setModeStub = this.sinon.stub(UsbStorage.prototype, '_setMode');
      window.Service.locked = true;
      subject = new UsbStorage();
      subject._protocol = '0';
      subject._enabled = true;
      subject._configUsbTransfer();
      assert.ok(setModeStub.calledWith(subject.automounterDisable));
    });

    test('sets mtp mode when locked', function() {
      var setModeStub = this.sinon.stub(UsbStorage.prototype, '_setMode');
      window.Service.locked = true;
      subject = new UsbStorage();
      subject._protocol = '1';
      subject._enabled = true;
      subject._configUsbTransfer();
      assert.ok(setModeStub.calledWith(subject.automounterMtpEnable));
    });

    test('sets current mtp mode', function() {
      var setModeStub = this.sinon.stub(UsbStorage.prototype, '_setMode');
      window.Service.locked = false;
      subject = new UsbStorage();
      subject._protocol = '1';
      subject._enabled = true;
      subject._configUsbTransfer();
      assert.ok(setModeStub.calledWith(subject.automounterMtpEnable));
    });

    test('sets current ums mode', function() {
      var setModeStub = this.sinon.stub(UsbStorage.prototype, '_setMode');
      window.Service.locked = false;
      subject = new UsbStorage();
      subject._protocol = '0';
      subject._enabled = true;
      subject._configUsbTransfer();
      assert.ok(setModeStub.calledWith(subject.automounterUmsEnable));
    });
  });

  suite('modeMapping', function() {
    test('return values', function() {
      assert.equal(subject._modeMapping(false, '0'), 0);
      assert.equal(subject._modeMapping(false, '1'), 0);
      assert.equal(subject._modeMapping(true, '0'), 1);
      assert.equal(subject._modeMapping(true, '1'), 3);
    });
  });

  suite('setMode', function() {
    test('sets umsMode', function() {
      MockSettingsListener.getSettingsLock().clear();
      subject._setMode(1);
      var lock = MockSettingsListener.getSettingsLock().locks[0];
      assert.equal(lock['ums.mode'], 1);
    });
  });

  suite('handleEvent', function() {
    test('lock calls setMode', function() {
      var setModeStub = this.sinon.stub(UsbStorage.prototype, '_setMode');
      subject.handleEvent({
        type: 'lockscreen-appopened'
      });
      assert.ok(setModeStub.calledWith(2));
    });

    test('unlock calls setMode', function() {
      // Not a real value, but tests that it passes through
      subject._mode = 3;
      var setModeStub = this.sinon.stub(UsbStorage.prototype, '_setMode');
      subject.handleEvent({
        type: 'lockscreen-appclosed'
      });
      assert.ok(setModeStub.calledWith(3));
    });
  });
});
