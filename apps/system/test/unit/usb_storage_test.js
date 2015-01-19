'use strict';
/* global MocksHelper, MockSettingsListener, UsbStorage, MockService,
          MockNavigatorSettings */

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
  var realNavigatorSettings;

  mocksForStorage.attachTestHelpers();
  suiteSetup(function() {
    realNavigatorSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
  });
  suiteTeardown(function() {
    navigator.mozSettings = realNavigatorSettings;
  });
  setup(function() {
    subject = new UsbStorage();
    subject.start();
  });

  teardown(function() {
    subject.stop();
  });

  suite('init', function() {
    test('calls _usbStorageChanged', function() {
      var setModeStub = this.sinon.stub(UsbStorage.prototype, '_setMode');
      this.sinon.stub(UsbStorage.prototype, '_usbStorageChanged');
      subject = new UsbStorage();
      subject.start();
      MockSettingsListener.mCallbacks['ums.enabled'](1);
      assert.ok(setModeStub.notCalled);
      assert.ok(subject._usbStorageChanged.called);
    });
  });

  suite('configUsbTransfer', function() {
    test('doesn\'t call _setMode', function() {
      var setModeStub = this.sinon.stub(UsbStorage.prototype, '_setMode');
      subject = new UsbStorage();
      assert.ok(setModeStub.notCalled);
    });

    test('Leaves UMS disabled when locked', function() {
      var setModeStub = this.sinon.stub(UsbStorage.prototype, '_setMode');
      MockService.mockQueryWith('locked', true);
      subject = new UsbStorage();
      subject._mode = subject.automounterDisable;
      subject._protocol = '0'; // UMS
      subject._enabled = true;
      subject._updateMode();
      assert.ok(setModeStub.calledWith(subject.automounterDisable));
    });

    test('Enables UMS when unlocked (and previously disabled)', function() {
      var setModeStub = this.sinon.stub(UsbStorage.prototype, '_setMode');
      MockService.mockQueryWith('locked', false);
      subject = new UsbStorage();
      subject._mode = subject.automounterDisable;
      subject._protocol = '0'; // UMS
      subject._enabled = true;
      subject._updateMode();
      assert.ok(setModeStub.calledWith(subject.automounterUmsEnable));
    });

    test('Enables UMS when unlocked (and previously disableWhenUnplugged)',
         function() {
      var setModeStub = this.sinon.stub(UsbStorage.prototype, '_setMode');
      MockService.mockQueryWith('locked', false);
      subject = new UsbStorage();
      subject._mode = subject.automounterDisableWhenUnplugged;
      subject._protocol = '0'; // UMS
      subject._enabled = true;
      subject._updateMode();
      assert.ok(setModeStub.calledWith(subject.automounterUmsEnable));
    });

    test('If active, set UMS disableWhenUnplugged when locked', function() {
      var setModeStub = this.sinon.stub(UsbStorage.prototype, '_setMode');
      MockService.mockQueryWith('locked', true);
      subject = new UsbStorage();
      subject._mode = subject.automounterUmsEnable;
      subject._protocol = '0'; // UMS
      subject._enabled = true;
      subject._updateMode();
      assert.ok(setModeStub.calledWith(
        subject.automounterDisableWhenUnplugged));
    });

    test('If active, set UMS disableWhenUnplugged when user disables',
         function() {
      var setModeStub = this.sinon.stub(UsbStorage.prototype, '_setMode');
      MockService.mockQueryWith('locked', false);
      subject = new UsbStorage();
      subject._mode = subject.automounterUmsEnable;
      subject._protocol = '0'; // UMS
      subject._enabled = false;
      subject._updateMode();
      assert.ok(setModeStub.calledWith(
        subject.automounterDisableWhenUnplugged));
    });

    test('Leaves MTP disabled when locked', function() {
      var setModeStub = this.sinon.stub(UsbStorage.prototype, '_setMode');
      MockService.mockQueryWith('locked', true);
      subject = new UsbStorage();
      subject._mode = subject.automounterDisable;
      subject._protocol = '1'; // MTP
      subject._enabled = true;
      subject._updateMode();
      assert.ok(setModeStub.calledWith(subject.automounterDisable));
    });

    test('Enables MTP when unlocked (and previously disabled)', function() {
      var setModeStub = this.sinon.stub(UsbStorage.prototype, '_setMode');
      MockService.mockQueryWith('locked', false);
      subject = new UsbStorage();
      subject._mode = subject.automounterDisable;
      subject._protocol = '1'; // MTP
      subject._enabled = true;
      subject._updateMode();
      assert.ok(setModeStub.calledWith(subject.automounterMtpEnable));
    });

    test('Enables MTP when unlocked (and previously disableWhenUnplugged)',
         function() {
      var setModeStub = this.sinon.stub(UsbStorage.prototype, '_setMode');
      MockService.mockQueryWith('locked', false);
      subject = new UsbStorage();
      subject._mode = subject.automounterDisableWhenUnplugged;
      subject._protocol = '1'; // MTP
      subject._enabled = true;
      subject._updateMode();
      assert.ok(setModeStub.calledWith(subject.automounterMtpEnable));
    });

    test('If active, set MTP disableWhenUnplugged when locked', function() {
      var setModeStub = this.sinon.stub(UsbStorage.prototype, '_setMode');
      MockService.mockQueryWith('locked', true);
      subject = new UsbStorage();
      subject._mode = subject.automounterMtpEnable;
      subject._protocol = '1'; // MTP
      subject._enabled = true;
      subject._updateMode();
      assert.ok(setModeStub.calledWith(
        subject.automounterDisableWhenUnplugged));
    });

    test('If active, set MTP disabled when user disables', function() {
      var setModeStub = this.sinon.stub(UsbStorage.prototype, '_setMode');
      MockService.mockQueryWith('locked', false);
      subject = new UsbStorage();
      subject._mode = subject.automounterMtpEnable;
      subject._protocol = '1'; // MTP
      subject._enabled = false;
      subject._updateMode();
      assert.ok(setModeStub.calledWith(subject.automounterDisable));
    });
  });

  suite('handleEvent', function() {
    test('lock calls _setMode', function() {
      var setModeStub = this.sinon.stub(UsbStorage.prototype, '_setMode');
      MockService.mockQueryWith('locked', true);
      subject = new UsbStorage();
      subject._mode = subject.automounterUmsEnable;
      subject._protocol = '0'; // UMS
      subject._enabled = true;
      subject.handleEvent({
        type: 'lockscreen-appopened'
      });
      assert.ok(setModeStub.calledWith(
        subject.automounterDisableWhenUnplugged));
    });

    test('unlock calls _setMode', function() {
      // Not a real value, but tests that it passes through
      var setModeStub = this.sinon.stub(UsbStorage.prototype, '_setMode');
      MockService.mockQueryWith('locked', false);
      subject = new UsbStorage();
      subject._mode = subject.automounterDisableWhenUnplugged;
      subject._protocol = '0'; // UMS
      subject._enabled = true;
      subject.handleEvent({
        type: 'lockscreen-appclosed'
      });
      assert.ok(setModeStub.calledWith(subject.automounterUmsEnable));
    });
  });
});
