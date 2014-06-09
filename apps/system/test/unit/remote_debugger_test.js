'use strict';
/* global MocksHelper, MockL10n, ModalDialog, RemoteDebugger, ScreenManager */

requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_modal_dialog.js');
requireApp('system/test/unit/mock_screen_manager.js');
requireApp('system/js/remote_debugger.js');

var mocksForRemoteDebugger = new MocksHelper([
  'ModalDialog',
  'ScreenManager'
]).init();

suite('system/RemoteDebugger', function() {
  var subject;
  var realMozL10n;

  mocksForRemoteDebugger.attachTestHelpers();
  setup(function() {
    subject = new RemoteDebugger();
  });

  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
  });

  suite('constructor', function() {
    test('adds the event listener', function() {
      var addEventStub = this.sinon.stub(window, 'addEventListener');
      subject = new RemoteDebugger();
      assert.ok(addEventStub.calledWith('mozChromeEvent', subject));
    });
  });

  suite('handleEvent', function() {
    test('enables the screen manager', function() {
      ScreenManager.screenEnabled = false;
      var screenStub = this.sinon.stub(ScreenManager, 'turnScreenOn');
      subject.handleEvent({
        detail: {
          type: 'remote-debugger-prompt'
        }
      });
      assert.ok(screenStub.calledOnce);
    });

    test('opens the modal dialog', function() {
      var dialogStub = this.sinon.stub(ModalDialog, 'showWithPseudoEvent');
      subject.handleEvent({
        detail: {
          type: 'remote-debugger-prompt'
        }
      });
      assert.ok(dialogStub.calledOnce);
    });
  });

  suite('_dispatchEvent', function() {
    test('calls the mozContentEvent', function() {
      var dispatchStub = this.sinon.stub(window, 'dispatchEvent');
      subject._dispatchEvent(false);
      var eventDetail = dispatchStub.getCall(0).args[0].detail;
      assert.equal(eventDetail.value, false);
      assert.equal(eventDetail.type, 'remote-debugger-prompt');
    });
  });
});
