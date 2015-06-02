/* globals MockL10n, MocksHelper, MockSIMSlot, MockSIMSlotManager,
           SimLockSystemDialog, MockApplications, SystemDialog */

'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system//shared/test/unit/mocks/mock_simslot.js');
requireApp('system//shared/test/unit/mocks/mock_simslot_manager.js');

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/system_dialog.js');
requireApp('system/js/sim_lock_system_dialog.js');


var mocksForSimLockSystemDialog = new MocksHelper([
  'SIMSlotManager'
]).init();

suite('sim lock dialog', function() {
  var realL10n = window.navigator.mozL10n;
  var stubByQuery, stubById;
  var subject;

  mocksForSimLockSystemDialog.attachTestHelpers();
  suiteSetup(function() {
    window.navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
  });

  setup(function() {
    window.applications = MockApplications;
    window.applications.ready = true;
    stubByQuery = this.sinon.stub(document, 'querySelector');
    stubByQuery.returns(document.createElement('div'));
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    MockSIMSlotManager.mInstances = [new MockSIMSlot(null, 0)];
    SimLockSystemDialog.prototype.containerElement =
      document.createElement('div');
    subject = new SimLockSystemDialog();
  });

  teardown(function() {
    stubByQuery.restore();
    stubById.restore();
  });

  test('done: should prevent default to keep keyboard open', function() {
    var fakeMouseDownEvt = new CustomEvent('mousedown');
    this.sinon.stub(fakeMouseDownEvt, 'preventDefault');
    subject.dialogDone.dispatchEvent(fakeMouseDownEvt);
    assert.isTrue(fakeMouseDownEvt.preventDefault.called);
  });

  test('skip: should prevent default to keep keyboard open', function() {
    var fakeMouseDownEvt = new CustomEvent('mousedown');
    this.sinon.stub(fakeMouseDownEvt, 'preventDefault');
    subject.dialogSkip.dispatchEvent(fakeMouseDownEvt);
    assert.isTrue(fakeMouseDownEvt.preventDefault.called);
  });

  test('requestFocus should be called when inputFieldControl is called',
    function() {
      this.sinon.stub(subject, 'requestFocus');
      subject.inputFieldControl(true);
      assert.isTrue(subject.requestFocus.called);
    });

  suite('unlock', function() {
    var stubClear, stubUnlockCardLock, stubDisable, slot, domreq;

    setup(function() {
      slot = new MockSIMSlot(null, 0);
      subject._currentSlot = slot;
      domreq = {
        error: {},
        onsuccess: function() {},
        onerror: function() {}
      };
      stubClear = this.sinon.stub(subject, 'clear');
      stubUnlockCardLock = this.sinon.stub(slot, 'unlockCardLock');
      stubUnlockCardLock.returns(domreq);
      stubDisable = this.sinon.stub(subject, 'disableInput');
    });

    test('unlock', function() {
      slot.simCard.cardState = 'pinRequired';
      var stubRequestClose = this.sinon.stub(subject, 'requestClose');
      var stubHandleError = this.sinon.stub(subject, 'handleError');
      subject.unlockCardLock({});
      assert.isTrue(stubUnlockCardLock.called);
      assert.isTrue(stubDisable.called);
      domreq.onsuccess();
      assert.isTrue(stubRequestClose.calledWith('success'));
      domreq.onerror();
      assert.isTrue(stubHandleError.called);
      assert.isTrue(stubClear.called);
    });

    test('unlockPin', function() {
      subject.pinInput.value = '0000';
      subject.unlockPin();
      assert.deepEqual(stubUnlockCardLock.getCall(0).args[0], {
        lockType: 'pin',
        pin: '0000'
      });
    });

    test('unlockPuk', function() {
      subject.pukInput.value = '0000';
      subject.newPinInput.value = '1111';
      subject.confirmPinInput.value = '1111';
      subject.unlockPuk();
      assert.isTrue(stubClear.called);
    });

    test('unlockXck', function() {
      subject.xckInput.value = '0000';
      subject.lockType = 'xxxx';
      subject.unlockXck();
      assert.isTrue(stubClear.called);
      assert.deepEqual(stubUnlockCardLock.getCall(0).args[0], {
        lockType: 'xxxx',
        pin: '0000'
      });
    });
  });

  suite('clear', function() {
    var stubEnable;

    setup(function() {
      stubEnable = this.sinon.stub(subject, 'enableInput');
      subject.clear();
    });

    test('enables all fields', function() {
      assert.isTrue(stubEnable.called);
    });
  });

  suite('disableInput', function() {
    setup(function() {
      subject.pinInput.disabled = false;
      subject.pukInput.disabled = false;
      subject.xckInput.disabled = false;
      subject.newPinInput.disabled = false;
      subject.confirmPinInput.disabled = false;
      subject.disableInput();
    });

    teardown(function() {
      subject.enableInput();
    });

    test('disables all fields', function() {
      assert.isTrue(subject.pinInput.disabled);
      assert.isTrue(subject.pukInput.disabled);
      assert.isTrue(subject.xckInput.disabled);
      assert.isTrue(subject.newPinInput.disabled);
      assert.isTrue(subject.confirmPinInput.disabled);
    });
  });

  suite('enableInput', function() {
    setup(function() {
      subject.pinInput.disabled = true;
      subject.pukInput.disabled = true;
      subject.xckInput.disabled = true;
      subject.newPinInput.disabled = true;
      subject.confirmPinInput.disabled = true;
      subject.enableInput();
    });

    test('enables all fields', function() {
      assert.isFalse(subject.pinInput.disabled);
      assert.isFalse(subject.pukInput.disabled);
      assert.isFalse(subject.xckInput.disabled);
      assert.isFalse(subject.newPinInput.disabled);
      assert.isFalse(subject.confirmPinInput.disabled);
    });
  });

  suite('show', function() {
    var stubClear, stubApply;

    setup(function() {
      stubClear = this.sinon.stub(subject, 'clear');
      this.sinon.stub(screen, 'mozLockOrientation');
      stubApply = this.sinon.stub(SystemDialog.prototype.show, 'apply');
      subject.show();
    });

    test('clears the input when showing the dialog', function() {
      assert.isTrue(stubClear.called);
    });

    test('locks the orientation', function() {
      assert.isTrue(screen.mozLockOrientation.calledWith('portrait-primary'));
    });

    test('calls to SystemDialog show method', function() {
      assert.isTrue(stubApply.calledWith(subject));
    });
  });

  suite('hide', function() {
    var stubApply;

    setup(function() {
      this.sinon.stub(screen, 'mozUnlockOrientation');
      stubApply = this.sinon.stub(SystemDialog.prototype.hide, 'apply');
      subject.hide();
    });

    test('unlocks the orientation', function() {
      assert.isTrue(screen.mozUnlockOrientation.calledWith());
    });

    test('calls to SystemDialog hide method', function() {
      assert.isTrue(stubApply.calledWith(subject));
    });
  });

  suite('error handling', function() {
    test('retry', function() {
      var stubShowErrorMsg = this.sinon.stub(subject, 'showErrorMsg');
      subject.handleError('pin', 1);
      assert.isTrue(stubShowErrorMsg.calledWith(1, 'pin'));

      subject.handleError('puk', 1);
      assert.isTrue(stubShowErrorMsg.calledWith(1, 'puk'));

      subject.handleError('xck', 1);
      assert.isTrue(stubShowErrorMsg.calledWith(1, 'xck'));
    });

    test('showErrorMsg', function() {
      var stub_ = this.sinon.stub(MockL10n, 'setAttributes');
      var count = 0;
      stub_.returns(count++);
      subject.showErrorMsg(1, 'pin');
      assert.deepEqual(stub_.getCall(0).args[2], { n: 1 });
      assert.deepEqual(stub_.getCall(1).args[1], 'pinErrorMsg');
      assert.deepEqual(stub_.getCall(2).args[1], 'pinLastChanceMsg');
    });
  });

  suite('handle card state', function() {
    teardown(function() {
    });

    test('null', function() {
      var slot = new MockSIMSlot(null, 0);
      slot.simCard.cardState = 'pinRequired';
      subject._currentSlot = slot;
      slot.simCard = {
        cardState: null
      };
      var stubSkip = this.sinon.stub(subject, 'skip');
      subject.handleCardState();
      assert.isTrue(stubSkip.called);
    });

    test('unknown', function() {
      var slot = new MockSIMSlot(null, 0);
      slot.simCard.cardState = 'pinRequired';
      subject._currentSlot = slot;
      slot.simCard = {
        cardState: 'unknown'
      };
      subject.handleCardState();

      var stubSkip = this.sinon.stub(subject, 'skip');
      subject.handleCardState();
      assert.isTrue(stubSkip.called);
    });

    test('ready', function() {
      var slot = new MockSIMSlot(null, 0);
      slot.simCard.cardState = 'pinRequired';
      subject._currentSlot = slot;
      slot.simCard = {
        cardState: 'ready'
      };
      subject.handleCardState();

      var stubSkip = this.sinon.stub(subject, 'skip');
      subject.handleCardState();
      assert.isTrue(stubSkip.called);
    });

    test('pin required', function() {
      var slot = new MockSIMSlot(null, 0);
      slot.simCard.cardState = 'pinRequired';
      subject._currentSlot = slot;
      slot.simCard = {
        cardState: 'pinRequired'
      };

      var stubInputFieldControl =
        this.sinon.stub(subject, 'inputFieldControl');
      subject.handleCardState();
      assert.isTrue(
        stubInputFieldControl.calledWith(true, false, false, false));
    });

    test('puk required', function() {
      var slot = new MockSIMSlot(null, 0);
      slot.simCard.cardState = 'pinRequired';
      subject._currentSlot = slot;
      slot.simCard = {
        cardState: 'pukRequired'
      };

      var stubInputFieldControl =
        this.sinon.stub(subject, 'inputFieldControl');
      subject.handleCardState();
      assert.isTrue(
        stubInputFieldControl.calledWith(false, true, false, true));
    });

    test('network locked', function() {
      var slot = new MockSIMSlot(null, 0);
      slot.simCard.cardState = 'pinRequired';
      subject._currentSlot = slot;
      slot.simCard = {
        cardState: 'networkLocked'
      };

      var stubInputFieldControl =
        this.sinon.stub(subject, 'inputFieldControl');
      subject.handleCardState();
      assert.isTrue(
        stubInputFieldControl.calledWith(false, false, true, false));
    });

    test('corporate locked', function() {
      var slot = new MockSIMSlot(null, 0);
      slot.simCard.cardState = 'pinRequired';
      subject._currentSlot = slot;
      slot.simCard = {
        cardState: 'corporateLocked'
      };

      var stubInputFieldControl =
        this.sinon.stub(subject, 'inputFieldControl');
      subject.handleCardState();
      assert.isTrue(
        stubInputFieldControl.calledWith(false, false, true, false));
    });

    test('service provider locked', function() {
      var slot = new MockSIMSlot(null, 0);
      slot.simCard.cardState = 'pinRequired';
      subject._currentSlot = slot;
      slot.simCard = {
        cardState: 'serviceProviderLocked'
      };

      var stubInputFieldControl =
        this.sinon.stub(subject, 'inputFieldControl');
      subject.handleCardState();
      assert.isTrue(
        stubInputFieldControl.calledWith(false, false, true, false));
    });

    test('network1 locked', function() {
      var slot = new MockSIMSlot(null, 0);
      slot.simCard.cardState = 'pinRequired';
      subject._currentSlot = slot;
      slot.simCard = {
        cardState: 'network1Locked'
      };

      var stubInputFieldControl =
        this.sinon.stub(subject, 'inputFieldControl');
      subject.handleCardState();
      assert.isTrue(
        stubInputFieldControl.calledWith(false, false, true, false));
    });

    test('network2 locked', function() {
      var slot = new MockSIMSlot(null, 0);
      slot.simCard.cardState = 'pinRequired';
      subject._currentSlot = slot;
      slot.simCard = {
        cardState: 'network2Locked'
      };

      var stubInputFieldControl =
        this.sinon.stub(subject, 'inputFieldControl');
      subject.handleCardState();
      assert.isTrue(
        stubInputFieldControl.calledWith(false, false, true, false));
    });

    test('hrpd network locked', function() {
      var slot = new MockSIMSlot(null, 0);
      slot.simCard.cardState = 'pinRequired';
      subject._currentSlot = slot;
      slot.simCard = {
        cardState: 'hrpdNetworkLocked'
      };

      var stubInputFieldControl =
        this.sinon.stub(subject, 'inputFieldControl');
      subject.handleCardState();
      assert.isTrue(
        stubInputFieldControl.calledWith(false, false, true, false));
    });

    test('ruim corporate locked', function() {
      var slot = new MockSIMSlot(null, 0);
      slot.simCard.cardState = 'pinRequired';
      subject._currentSlot = slot;
      slot.simCard = {
        cardState: 'ruimCorporateLocked'
      };

      var stubInputFieldControl =
        this.sinon.stub(subject, 'inputFieldControl');
      subject.handleCardState();
      assert.isTrue(
        stubInputFieldControl.calledWith(false, false, true, false));
    });

    test('ruim service provider locked', function() {
      var slot = new MockSIMSlot(null, 0);
      slot.simCard.cardState = 'pinRequired';
      subject._currentSlot = slot;
      slot.simCard = {
        cardState: 'ruimServiceProviderLocked'
      };

      var stubInputFieldControl =
        this.sinon.stub(subject, 'inputFieldControl');
      subject.handleCardState();
      assert.isTrue(
        stubInputFieldControl.calledWith(false, false, true, false));
    });
  });
});
