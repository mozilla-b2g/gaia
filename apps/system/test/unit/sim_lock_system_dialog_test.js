/* globals MockL10n, MocksHelper, MockSIMSlot, MockSIMSlotManager,
           SimLockSystemDialog, MockApplications */

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

  test('unlock', function() {
    var slot = new MockSIMSlot(null, 0);
    slot.simCard.cardState = 'pinRequired';
    var stubUnlockCardLock = this.sinon.stub(slot, 'unlockCardLock');
    var stubRequestClose = this.sinon.stub(subject, 'requestClose');
    var stubHandleError = this.sinon.stub(subject, 'handleError');
    var domreq = {
      error: {},
      onsuccess: function() {},
      onerror: function() {}
    };
    stubUnlockCardLock.returns(domreq);
    subject._currentSlot = slot;
    subject.unlockCardLock({});
    assert.isTrue(stubUnlockCardLock.called);
    domreq.onsuccess();
    assert.isTrue(stubRequestClose.calledWith('success'));
    domreq.onerror();
    assert.isTrue(stubHandleError.called);
  });

  test('unlockPin', function() {
    var stubUnlockCardLock = this.sinon.stub(subject, 'unlockCardLock');
    var stubClear = this.sinon.stub(subject, 'clear');
    subject.pinInput.value = '0000';
    subject.unlockPin();
    assert.isTrue(stubClear.called);
    assert.deepEqual(stubUnlockCardLock.getCall(0).args[0], {
      lockType: 'pin',
      pin: '0000'
    });
  });

  test('unlockPuk', function() {
    this.sinon.stub(subject, 'unlockCardLock');
    var stubClear = this.sinon.stub(subject, 'clear');
    subject.pukInput.value = '0000';
    subject.newPinInput.value = '1111';
    subject.confirmPinInput.value = '1111';
    subject.unlockPuk();
    assert.isTrue(stubClear.called);
  });

  test('unlockXck', function() {
    var stubUnlockCardLock = this.sinon.stub(subject, 'unlockCardLock');
    var stubClear = this.sinon.stub(subject, 'clear');
    subject.xckInput.value = '0000';
    subject.lockType = 'xxxx';
    subject.unlockXck();
    assert.isTrue(stubClear.called);
    assert.deepEqual(stubUnlockCardLock.getCall(0).args[0], {
      lockType: 'xxxx',
      pin: '0000'
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
