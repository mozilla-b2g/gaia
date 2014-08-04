(function() {
'use strict';

requireApp('system/test/unit/mock_system_dialog.js');
requireApp('system/test/unit/mock_system_simcard_dialog.js');
requireApp('system/js/system_dialog_manager.js');
requireApp('system/js/system.js');

var mocksForSystemDialogManager = new window.MocksHelper([
  'SystemDialog',
  'SimPinSystemDialog'
]).init();

suite('system/SystemDialogManager', function() {
  mocksForSystemDialogManager.attachTestHelpers();
  var stubById, dialogFake,
      optionsFake = {
        onShow: function() {},
        onHide: function() {}
      };

  setup(function() {
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));

    dialogFake = new window.SystemDialog(optionsFake);
    window.systemDialogManager = new window.SystemDialogManager();

  });

  teardown(function() {
    stubById.restore();
  });

  suite('Handle events', function() {
    test('Dialog created', function() {
      window.systemDialogManager.handleEvent({type: 'system-dialog-created',
        detail: dialogFake});
      assert.isNull(window.systemDialogManager.states.activeDialog,
        'the dialog should not be activated');
      var createdDialog =
      window.systemDialogManager.states.runningDialogs[dialogFake.instanceID];
      window.assert.isObject(createdDialog,
        'the dialog was not registered in the maanger');
    });

    test('Dialog request show', function() {
      window.systemDialogManager.handleEvent({type: 'system-dialog-created',
        detail: dialogFake});
      window.systemDialogManager.handleEvent({type: 'system-dialog-show',
        detail: dialogFake});
      assert.isNotNull(window.systemDialogManager.states.activeDialog,
        'the dialog should be activated');
      var isContainDialog =
        window.systemDialogManager.elements.screen.classList.contains('dialog');
      assert.isTrue(isContainDialog,
        'the "dialog" was not in screen stylesheet after activated a dialog');
    });

    test('Dialog request hide', function() {
      var stubOnHide = this.sinon.stub(dialogFake, 'onHide');
      window.systemDialogManager.handleEvent({type: 'system-dialog-created',
        detail: dialogFake});
      window.systemDialogManager.handleEvent({type: 'system-dialog-show',
        detail: dialogFake});
      window.systemDialogManager.handleEvent({type: 'system-dialog-hide',
        detail: dialogFake});
      assert.isFalse(stubOnHide.called,
        'the dialog "onHide" should not be called after it fired the request');
      var isContainDialog =
        window.systemDialogManager.elements.screen.classList.contains('dialog');
      assert.isFalse(isContainDialog,
        'the "dialog" was in screen stylesheet after deactivated a dialog');
      stubOnHide.restore();
    });

    test('Resize dialog while received "system-resize" event', function() {
      var stubResize = this.sinon.stub(dialogFake, 'resize');
      window.systemDialogManager.handleEvent({type: 'system-dialog-created',
        detail: dialogFake});
      window.systemDialogManager.handleEvent({type: 'system-dialog-show',
        detail: dialogFake});
      window.dispatchEvent(new CustomEvent('system-resize'));
      assert.isTrue(stubResize.called,
        'the dialog was not "resize" after received "system-resize" event');
      var isContainDialog =
        window.systemDialogManager.elements.screen.classList.contains('dialog');
      assert.isTrue(isContainDialog,
        'the "dialog" was not in screen stylesheet after resize a dialog');
      stubResize.restore();
    });

    test('Deactivate dialog while received ' +
         '"home" or "holdhome" event', function() {
      window.systemDialogManager.handleEvent({type: 'system-dialog-created',
        detail: dialogFake});
      window.systemDialogManager.handleEvent({type: 'system-dialog-show',
        detail: dialogFake});
      var spyDeactivateDialog =
        this.sinon.spy(window.systemDialogManager, 'deactivateDialog');
      var stubOnHide = this.sinon.stub(dialogFake, 'onHide');
      var spyHide =
        this.sinon.spy(window.systemDialogManager.states.activeDialog, 'hide');
      window.systemDialogManager.handleEvent({type: 'home'});
      assert.isTrue(spyDeactivateDialog.called,
        'the "deactivateDialog" should be called after received "home" event');
      assert.isTrue(spyHide.called,
        'the dialog was not called "hide" after received "home" event');
      assert.isTrue(stubOnHide.calledWith('home'),
        'the dialog was not "onHide" after received "home" event');
      var isContainDialog =
        window.systemDialogManager.elements.screen.classList.contains('dialog');
      assert.isFalse(isContainDialog,
        'the "dialog" was in screen stylesheet after deactivated a dialog');
      assert.isNull(window.systemDialogManager.states.activeDialog,
        'the active dialog is not null ' +
        'after its be deactivate via "home"/"holdhome" events');
      spyDeactivateDialog.restore();
      stubOnHide.restore();
    });

    test('A dialog is active, ' +
         'then another dialog create and request show', function() {
      var stubOnHide = this.sinon.stub(dialogFake, 'onHide');
      window.systemDialogManager.handleEvent({type: 'system-dialog-created',
        detail: dialogFake});
      window.systemDialogManager.handleEvent({type: 'system-dialog-show',
        detail: dialogFake});
      var simPinSystemDialogFake = new window.SimPinSystemDialog(optionsFake);
      window.systemDialogManager.handleEvent({type: 'system-dialog-created',
        detail: simPinSystemDialogFake});
      window.systemDialogManager.handleEvent({type: 'system-dialog-show',
        detail: simPinSystemDialogFake});
      // Check fake dialog (first dialog)
      var createdFirstDialog =
      window.systemDialogManager.states.runningDialogs[dialogFake.instanceID];
      window.assert.isObject(createdFirstDialog,
        'the first dialog was not registered in the maanger');
      assert.isTrue(stubOnHide.called,
        'the first dialog was not "onHide" ' +
        'after received second dialog show request');

      // Check fake simpin dialog (second dialog)
      var createdSecondDialog =
      window.systemDialogManager.states.runningDialogs[
        simPinSystemDialogFake.instanceID];
      window.assert.isObject(createdSecondDialog,
        'the second dialog was not registered in the maanger');
      // Check "dialog" style is in screen stylesheet
      // after two dialogs reaquest show event
      var isContainDialog =
        window.systemDialogManager.elements.screen.classList.contains('dialog');
      assert.isTrue(isContainDialog,
        'the "dialog" was not in screen stylesheet after activated a dialog');
      stubOnHide.restore();
    });
  });
});

})();

