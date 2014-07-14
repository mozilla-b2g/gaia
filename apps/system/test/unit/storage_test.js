'use strict';
/* global MocksHelper, MockSettingsListener, Storage */

require('/shared/test/unit/mocks/mock_system.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/js/storage.js');

var mocksForStorage = new MocksHelper([
  'SettingsListener',
  'System'
]).init();

suite('system/Storage', function() {
  var stubById;
  var fakeElement;
  var subject;

  mocksForStorage.attachTestHelpers();
  setup(function() {
    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));
    subject = new Storage();
  });

  teardown(function() {
    stubById.restore();
    window.System.locked = false;
  });

  suite('constructor', function() {
    test('calls setMode', function() {
      var setModeStub = this.sinon.stub(Storage.prototype, 'setMode');
      subject = new Storage();
      assert.ok(setModeStub.calledWith(subject.automounterDisable));
    });

    test('sets mode when locked', function() {
      var setModeStub = this.sinon.stub(Storage.prototype, 'setMode');
      window.System.locked = true;
      subject = new Storage();
      MockSettingsListener.mCallbacks['ums.enabled'](1);
      assert.ok(setModeStub.calledWith(subject.automounterDisable));
    });

    test('sets current mode', function() {
      var setModeStub = this.sinon.stub(Storage.prototype, 'setMode');
      window.System.locked = false;
      subject = new Storage();
      MockSettingsListener.mCallbacks['ums.enabled'](1);
      assert.ok(setModeStub.calledWith(subject._mode));
    });
  });

  suite('modeFromBool', function() {
    test('return values', function() {
      assert.equal(subject.modeFromBool(2), 1);
      assert.equal(subject.modeFromBool(1), 1);
      assert.equal(subject.modeFromBool(0), 0);
    });
  });

  suite('setMode', function() {
    test('sets umsMode', function() {
      MockSettingsListener.getSettingsLock().clear();
      subject.setMode(1);
      var lock = MockSettingsListener.getSettingsLock().locks[0];
      assert.equal(lock['ums.mode'], 1);
    });
  });

  suite('handleEvent', function() {
    test('lock calls setMode', function() {
      var setModeStub = this.sinon.stub(Storage.prototype, 'setMode');
      subject.handleEvent({
        type: 'lockscreen-appopened'
      });
      assert.ok(setModeStub.calledWith(2));
    });

    test('unlock calls setMode', function() {
      // Not a real value, but tests that it passes through
      subject._mode = 3;
      var setModeStub = this.sinon.stub(Storage.prototype, 'setMode');
      subject.handleEvent({
        type: 'lockscreen-appclosed'
      });
      assert.ok(setModeStub.calledWith(3));
    });
  });
});
