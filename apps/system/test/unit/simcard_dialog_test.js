'use strict';

mocha.globals(['SIMSlotManager', 'SystemDialog', 'SimPinDialog']);

requireApp('system/test/unit/mock_l10n.js');
requireApp('system/js/mock_simslot.js');
requireApp('system/js/mock_simslot_manager.js');

var mocksForSIMPINDialog = new MocksHelper([
  'SIMSlotManager'
]).init();

suite('simcard dialog', function() {
  var realL10n = window.navigator.mozL10n;
  var stubByQuery, stubById;

  mocksForSIMPINDialog.attachTestHelpers();

  var MockSystemDialog = function(id, options) {
    return {
      show: function() {},
      hide: function() {}
    };
  };

  suiteSetup(function() {
    window.navigator.mozL10n = MockL10n;
    window['SystemDialog'] = MockSystemDialog;
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
    window['SystemDialog'] = null;
  });

  setup(function(callback) {
    stubByQuery = this.sinon.stub(document, 'querySelector');
    stubByQuery.returns(document.createElement('div'));
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    MockSIMSlotManager.mInstances = [new MockSIMSlot(null, 0)];
    requireApp('system/js/simcard_dialog.js', callback);
  });

  teardown(function() {
    stubByQuery.restore();
    stubById.restore();
  });

  test('unlock', function() {
    var slot = new MockSIMSlot(null, 0);
    slot.simCard.cardState = 'pinRequired';
    var stubUnlockCardLock = this.sinon.stub(slot, 'unlockCardLock');
    var stubRequestClose = this.sinon.stub(SimPinDialog, 'requestClose');
    var stubHandleError = this.sinon.stub(SimPinDialog, 'handleError');
    var domreq = {
      onsuccess: function() {},
      onerror: function() {}
    };
    stubUnlockCardLock.returns(domreq);
    SimPinDialog._currentSlot = slot;
    SimPinDialog.unlockCardLock();
    assert.isTrue(stubUnlockCardLock.called);
    domreq.onsuccess();
    assert.isTrue(stubRequestClose.calledWith('success'));
    domreq.onerror();
    assert.isTrue(stubHandleError.called);
  });

  test('unlockPin', function() {
    var stubUnlockCardLock = this.sinon.stub(SimPinDialog, 'unlockCardLock');
    var stubClear = this.sinon.stub(SimPinDialog, 'clear');
    SimPinDialog.pinInput.value = '0000';
    SimPinDialog.unlockPin();
    assert.isTrue(stubClear.called);
    assert.deepEqual(stubUnlockCardLock.getCall(0).args[0], {
      lockType: 'pin',
      pin: '0000'
    });
  });

  test('unlockPuk', function() {
    var stubUnlockCardLock = this.sinon.stub(SimPinDialog, 'unlockCardLock');
    var stubClear = this.sinon.stub(SimPinDialog, 'clear');
    SimPinDialog.pukInput.value = '0000';
    SimPinDialog.newPinInput.value = '1111';
    SimPinDialog.confirmPinInput.value = '1111';
    SimPinDialog.unlockPuk();
    assert.isTrue(stubClear.called);
  });

  test('unlockXck', function() {
    var stubUnlockCardLock = this.sinon.stub(SimPinDialog, 'unlockCardLock');
    var stubClear = this.sinon.stub(SimPinDialog, 'clear');
    SimPinDialog.xckInput.value = '0000';
    SimPinDialog.lockType = 'xxxx';
    SimPinDialog.unlockXck();
    assert.isTrue(stubClear.called);
    assert.deepEqual(stubUnlockCardLock.getCall(0).args[0], {
      lockType: 'xxxx',
      pin: '0000'
    });
  });

  suite('error handling', function() {
    test('retry', function() {
      var stubShowErrorMsg = this.sinon.stub(SimPinDialog, 'showErrorMsg');
      SimPinDialog.handleError({
        retryCount: 1,
        lockType: 'pin'
      });
      assert.isTrue(stubShowErrorMsg.calledWith(1, 'pin'));

      SimPinDialog.handleError({
        retryCount: 1,
        lockType: 'puk'
      });
      assert.isTrue(stubShowErrorMsg.calledWith(1, 'puk'));

      SimPinDialog.handleError({
        retryCount: 1,
        lockType: 'xck'
      });
      assert.isTrue(stubShowErrorMsg.calledWith(1, 'xck'));
    });

    test('showErrorMsg', function() {
      var stub_ = this.sinon.stub(MockL10n, 'get');
      var count = 0;
      stub_.returns(count++);
      SimPinDialog.showErrorMsg(1, 'pin');
      assert.deepEqual(stub_.getCall(0).args[1], { n: 1 });
      assert.deepEqual(stub_.getCall(1).args[0], 'pinErrorMsg');
      assert.deepEqual(stub_.getCall(2).args[0], 'pinLastChanceMsg');
    });
  });

  suite('handle card state', function() {
    teardown(function() {
    });

    test('null', function() {
      var slot = new MockSIMSlot(null, 0);
      slot.simCard.cardState = 'pinRequired';
      SimPinDialog._currentSlot = slot;
      slot.simCard = {
        cardState: null
      };
      var stubSkip = this.sinon.stub(SimPinDialog, 'skip');
      SimPinDialog.handleCardState();
      assert.isTrue(stubSkip.called);
    });

    test('unknown', function() {
      var slot = new MockSIMSlot(null, 0);
      slot.simCard.cardState = 'pinRequired';
      SimPinDialog._currentSlot = slot;
      slot.simCard = {
        cardState: 'unknown'
      };
      SimPinDialog.handleCardState();

      var stubSkip = this.sinon.stub(SimPinDialog, 'skip');
      SimPinDialog.handleCardState();
      assert.isTrue(stubSkip.called);
    });

    test('ready', function() {
      var slot = new MockSIMSlot(null, 0);
      slot.simCard.cardState = 'pinRequired';
      SimPinDialog._currentSlot = slot;
      slot.simCard = {
        cardState: 'ready'
      };
      SimPinDialog.handleCardState();

      var stubSkip = this.sinon.stub(SimPinDialog, 'skip');
      SimPinDialog.handleCardState();
      assert.isTrue(stubSkip.called);
    });

    test('pin required', function() {
      var slot = new MockSIMSlot(null, 0);
      slot.simCard.cardState = 'pinRequired';
      SimPinDialog._currentSlot = slot;
      slot.simCard = {
        cardState: 'pinRequired'
      };

      var stubInputFieldControl =
        this.sinon.stub(SimPinDialog, 'inputFieldControl');
      SimPinDialog.handleCardState();
      assert.isTrue(
        stubInputFieldControl.calledWith(true, false, false, false));
    });

    test('puk required', function() {
      var slot = new MockSIMSlot(null, 0);
      slot.simCard.cardState = 'pinRequired';
      SimPinDialog._currentSlot = slot;
      slot.simCard = {
        cardState: 'pukRequired'
      };

      var stubInputFieldControl =
        this.sinon.stub(SimPinDialog, 'inputFieldControl');
      SimPinDialog.handleCardState();
      assert.isTrue(
        stubInputFieldControl.calledWith(false, true, false, true));
    });

    test('network locked', function() {
      var slot = new MockSIMSlot(null, 0);
      slot.simCard.cardState = 'pinRequired';
      SimPinDialog._currentSlot = slot;
      slot.simCard = {
        cardState: 'networkLocked'
      };

      var stubInputFieldControl =
        this.sinon.stub(SimPinDialog, 'inputFieldControl');
      SimPinDialog.handleCardState();
      assert.isTrue(
        stubInputFieldControl.calledWith(false, false, true, false));
    });

    test('corporate locked', function() {
      var slot = new MockSIMSlot(null, 0);
      slot.simCard.cardState = 'pinRequired';
      SimPinDialog._currentSlot = slot;
      slot.simCard = {
        cardState: 'corporateLocked'
      };

      var stubInputFieldControl =
        this.sinon.stub(SimPinDialog, 'inputFieldControl');
      SimPinDialog.handleCardState();
      assert.isTrue(
        stubInputFieldControl.calledWith(false, false, true, false));
    });

    test('service provider locked', function() {
      var slot = new MockSIMSlot(null, 0);
      slot.simCard.cardState = 'pinRequired';
      SimPinDialog._currentSlot = slot;
      slot.simCard = {
        cardState: 'serviceProviderLocked'
      };

      var stubInputFieldControl =
        this.sinon.stub(SimPinDialog, 'inputFieldControl');
      SimPinDialog.handleCardState();
      assert.isTrue(
        stubInputFieldControl.calledWith(false, false, true, false));
    });
  });
});
