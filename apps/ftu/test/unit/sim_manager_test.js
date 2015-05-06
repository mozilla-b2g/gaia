/* global UIManager, SimManager, MobileOperator, MocksHelper,
          MockNavigatorMozIccManager, MockNavigatorMozMobileConnections,
          Navigation, MockL10n */

'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_mobile_operator.js');
requireApp('ftu/test/unit/mock_ui_manager.js');
require('/shared/test/unit/mocks/mock_l10n.js');

requireApp('ftu/js/sim_manager.js');
requireApp('ftu/js/navigation.js');

require('/shared/test/unit/load_body_html_helper.js');

var mocksHelperForSimManager = new MocksHelper([
  'UIManager',
  'MobileOperator'
]).init();

suite('sim mgmt >', function() {
  var realL10n,
      realMozIccManager,
      realMozMobileConnections;
  var navigationStub,
      iccId0,
      iccInfo0,
      req,
      getCardLockRetryCountStub;
  var l10nAttrs;

  var setupRetryCount = function() {
    req = { result: { retryCount: 3 } };
    getCardLockRetryCountStub = sinon.stub(iccInfo0, 'getCardLockRetryCount',
      function() {
        return req;
      });
  };

  var fireRetryCountCallback = function() {
    req.onsuccess && req.onsuccess();
  };

  var teardownRetryCount = function() {
    getCardLockRetryCountStub.restore();
  };

  mocksHelperForSimManager.attachTestHelpers();

  suiteSetup(function() {
    loadBodyHTML('/index.html');

    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;

    realMozMobileConnections = navigator.mozMobileConnections;
    MockNavigatorMozMobileConnections[0].iccId =
                                     navigator.mozIccManager.iccIds[0];
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    iccId0 = navigator.mozIccManager.iccIds[0];
    iccInfo0 = navigator.mozIccManager.getIccById(iccId0);
  });

  setup(function() {
    SimManager.init();

    UIManager.activationScreen.classList.remove('show');
    UIManager.unlockSimScreen.classList.add('show');

    setupRetryCount();
  });

  teardown(function() {
    teardownRetryCount();
  });

  suiteTeardown(function() {
    document.body.innerHTML = '';

    navigator.mozMobileConnections = realMozMobileConnections;
    realMozMobileConnections = null;

    navigator.mozIccManager = realMozIccManager;
    realMozIccManager = null;

    navigator.mozL10n = realL10n;
    realL10n = null;
  });

  test('"Skip" hides the screen', function() {
    iccInfo0.cardState = 'pinRequired';
    SimManager.handleCardState();

    fireRetryCountCallback();
    assert.isFalse(UIManager.pinRetriesLeft.classList.contains('hidden'));
    assert.isTrue(getCardLockRetryCountStub.calledOnce);

    SimManager.skip();
    assert.isTrue(UIManager.activationScreen.classList.contains('show'));
    assert.isFalse(UIManager.unlockSimScreen.classList.contains('show'));
    assert.isTrue(UIManager.pinRetriesLeft.classList.contains('hidden'));
  });

  test('"Back" hides the screen', function() {
    iccInfo0.cardState = 'pinRequired';
    SimManager.handleCardState();

    fireRetryCountCallback();
    assert.isFalse(UIManager.pinRetriesLeft.classList.contains('hidden'));

    navigationStub = sinon.stub(Navigation, 'back');
    SimManager.back();
    assert.ok(navigationStub.calledOnce);
    assert.isTrue(UIManager.activationScreen.classList.contains('show'));
    assert.isFalse(UIManager.unlockSimScreen.classList.contains('show'));
    assert.isTrue(UIManager.pinRetriesLeft.classList.contains('hidden'));
    navigationStub.restore();
  });

  suite('Handle state changes', function() {

    setup(function() {
      UIManager.unlockSimScreen.classList.remove('show');
    });

    test('pinRequired shows PIN screen', function() {
      iccInfo0.cardState = 'pinRequired';
      SimManager.handleCardState();

      assert.isTrue(UIManager.unlockSimScreen.classList.contains('show'));

      assert.isTrue(UIManager.pincodeScreen.classList.contains('show'));
      assert.isFalse(UIManager.pukcodeScreen.classList.contains('show'));
      assert.isFalse(UIManager.xckcodeScreen.classList.contains('show'));

      fireRetryCountCallback();
      assert.isFalse(UIManager.pinRetriesLeft.classList.contains('hidden'));
      assert.isTrue(getCardLockRetryCountStub.calledOnce);
    });

    test('pukRequired shows PUK screen', function() {
      iccInfo0.cardState = 'pukRequired';
      SimManager.handleCardState();

      assert.isTrue(UIManager.unlockSimScreen.classList.contains('show'));
      assert.equal(UIManager.pinLabel.getAttribute('data-l10n-id'), 'type_pin');

      assert.isFalse(UIManager.pincodeScreen.classList.contains('show'));
      assert.isTrue(UIManager.pukcodeScreen.classList.contains('show'));
      assert.isFalse(UIManager.xckcodeScreen.classList.contains('show'));

      fireRetryCountCallback();
      assert.isFalse(UIManager.pukRetriesLeft.classList.contains('hidden'));
      assert.isTrue(getCardLockRetryCountStub.calledOnce);
    });

    test('networkLocked shows XCK screen', function() {
      iccInfo0.cardState = 'networkLocked';
      SimManager.handleCardState();

      assert.isTrue(UIManager.unlockSimScreen.classList.contains('show'));

      assert.isFalse(UIManager.pincodeScreen.classList.contains('show'));
      assert.isFalse(UIManager.pukcodeScreen.classList.contains('show'));
      assert.isTrue(UIManager.xckcodeScreen.classList.contains('show'));

      fireRetryCountCallback();
      assert.isFalse(UIManager.xckRetriesLeft.classList.contains('hidden'));
      assert.isTrue(getCardLockRetryCountStub.calledOnce);
    });
  });

  suite('Handle state changes DSDS', function() {
    var iccId1;
    var iccInfo1;

    suiteSetup(function() {
      iccId1 = '98765';
      navigator.mozIccManager.addIcc(iccId1);
      iccInfo1 = navigator.mozIccManager.getIccById(iccId1);
      navigator.mozMobileConnections.mAddMobileConnection();
      navigator.mozMobileConnections[1].iccId = iccId1;
      navigator.mozMobileConnections[1].iccInfo = iccInfo1;

      SimManager.updateIccState(iccId1);
      SimManager.simSlots = 2;
    });

    suiteTeardown(function() {
      navigator.mozIccManager.removeIcc(iccId1);
      navigator.mozMobileConnections.mRemoveMobileConnection(1);
      SimManager.simSlots = 1;
      SimManager.icc1 = null;
    });

    test('pinRequired DSDS screen', function() {
      iccInfo0.cardState = 'pinRequired';
      iccInfo1.cardState = 'pinRequired';
      SimManager.handleCardState();

      assert.isTrue(UIManager.unlockSimScreen.classList.contains('show'));
      l10nAttrs = navigator.mozL10n.getAttributes(UIManager.pinLabel);
      assert.equal(l10nAttrs.id, 'pincodeLabel');
      assert.deepEqual(l10nAttrs.args, {n: 1});

      fireRetryCountCallback();
      assert.isTrue(getCardLockRetryCountStub.calledOnce);
      assert.isFalse(UIManager.pinRetriesLeft.classList.contains('hidden'));

      SimManager.skip();
      l10nAttrs = navigator.mozL10n.getAttributes(UIManager.pinLabel);
      assert.equal(l10nAttrs.id, 'pincodeLabel');
      assert.deepEqual(l10nAttrs.args, {n: 2});
      assert.isTrue(UIManager.pinRetriesLeft.classList.contains('hidden'));
    });

    test('pukRequired DSDS screen', function() {
      iccInfo0.cardState = 'pukRequired';
      iccInfo1.cardState = 'pukRequired';
      SimManager.handleCardState();

      assert.isTrue(UIManager.unlockSimScreen.classList.contains('show'));
      l10nAttrs = navigator.mozL10n.getAttributes(UIManager.pukLabel);
      assert.equal(l10nAttrs.id, 'pukcodeLabel');
      assert.deepEqual(l10nAttrs.args, {n: 1});

      fireRetryCountCallback();
      assert.isTrue(getCardLockRetryCountStub.calledOnce);
      assert.isFalse(UIManager.pukRetriesLeft.classList.contains('hidden'));

      SimManager.skip();
      l10nAttrs = navigator.mozL10n.getAttributes(UIManager.pukLabel);
      assert.equal(l10nAttrs.id, 'pukcodeLabel');
      assert.deepEqual(l10nAttrs.args, {n: 2});
      assert.isTrue(UIManager.pukRetriesLeft.classList.contains('hidden'));
    });

    test('xckRequired DSDS screen', function() {
      iccInfo0.cardState = 'networkLocked';
      iccInfo1.cardState = 'networkLocked';
      SimManager.handleCardState();

      assert.isTrue(UIManager.unlockSimScreen.classList.contains('show'));
      l10nAttrs = navigator.mozL10n.getAttributes(UIManager.xckLabel);
      assert.equal(l10nAttrs.id, 'nckcodeLabel');
      assert.deepEqual(l10nAttrs.args, {n: 1});

      fireRetryCountCallback();
      assert.isTrue(getCardLockRetryCountStub.calledOnce);
      assert.isFalse(UIManager.xckRetriesLeft.classList.contains('hidden'));

      SimManager.skip();
      l10nAttrs = navigator.mozL10n.getAttributes(UIManager.xckLabel);
      assert.equal(l10nAttrs.id, 'nckcodeLabel');
      assert.deepEqual(l10nAttrs.args, {n: 2});
      assert.isTrue(UIManager.xckRetriesLeft.classList.contains('hidden'));
    });
  });

  suite('Unlocking', function() {

    suite('PIN unlock ', function() {
      setup(function() {
        iccInfo0.cardState = 'pinRequired';
        SimManager.resetForm();
        SimManager.handleCardState();
        // start from original state each test
        UIManager.pinInput.classList.remove('onerror');
        UIManager.pinError.classList.add('hidden');
        UIManager.pinRetriesLeft.classList.add('hidden');
      });

      suite('Unlock button > ', function() {
        teardown(function() {
          UIManager.pinInput.value = '';
        });
        test('should be disabled by default', function() {
          assert.isTrue(UIManager.unlockSimButton.disabled);
        });

        test('should be disabled with short PIN', function() {
          UIManager.pinInput.value = 123;
          UIManager.pinInput.dispatchEvent(new CustomEvent('input'));
          assert.isTrue(UIManager.unlockSimButton.disabled);
        });

        test('should be enabled with proper size PIN', function() {
          UIManager.pinInput.value = 1234;
          UIManager.pinInput.dispatchEvent(new CustomEvent('input'));
          assert.isFalse(UIManager.unlockSimButton.disabled);
        });
      });

      test('too short PIN', function() {
        UIManager.pinInput.value = 123;
        SimManager.unlock();
        assert.isTrue(UIManager.pinRetriesLeft.classList.contains('hidden'));
        assert.isTrue(UIManager.pinInput.classList.contains('onerror'));
        assert.isFalse(UIManager.pinError.classList.contains('hidden'));
        assert.isFalse(SimManager.icc0.unlocked);
      });
      test('too long PIN', function() {
        UIManager.pinInput.value = 123456789;
        SimManager.unlock();
        assert.isTrue(UIManager.pinRetriesLeft.classList.contains('hidden'));
        assert.isTrue(UIManager.pinInput.classList.contains('onerror'));
        assert.isFalse(UIManager.pinError.classList.contains('hidden'));
        assert.isFalse(SimManager.icc0.unlocked);
      });
      test('wrong sim pin with > 1 retries', function() {
        SimManager.icc0.mozIcc.retryCount = 2;
        UIManager.pinInput.value = '0000'; // special failure pin value
        SimManager.unlock();
        assert.isFalse(UIManager.pinRetriesLeft.classList.contains('hidden'));
        assert.isTrue(UIManager.pinInput.classList.contains('onerror'));
        assert.isFalse(UIManager.pinError.classList.contains('hidden'));
        assert.isFalse(SimManager.icc0.unlocked);
        assert.isFalse(UIManager.activationScreen.classList.contains('show'));
        assert.isTrue(UIManager.unlockSimScreen.classList.contains('show'));
        assert.isTrue(UIManager.pinError.querySelector('.lastchance')
          .classList.contains('hidden'));
        assert.isFalse(UIManager.pinError.querySelector('.main')
          .classList.contains('hidden'));
      });
      test('wrong sim pin with exactly 1 retry', function() {
        SimManager.icc0.mozIcc.retryCount = 1;
        UIManager.pinInput.value = '0000'; // special failure pin value
        SimManager.unlock();
        assert.isFalse(UIManager.pinError.querySelector('.lastchance')
          .classList.contains('hidden'));
        assert.isTrue(UIManager.pinError.querySelector('.main')
          .classList.contains('hidden'));
      });
      test('all fields correct', function() {
        fireRetryCountCallback();
        assert.isFalse(UIManager.pinRetriesLeft.classList.contains('hidden'));
        UIManager.pinInput.value = 1234;
        SimManager.unlock();
        assert.isTrue(UIManager.pinRetriesLeft.classList.contains('hidden'));
        assert.isFalse(UIManager.pinInput.classList.contains('onerror'));
        assert.isTrue(UIManager.pinError.classList.contains('hidden'));
        assert.isTrue(SimManager.icc0.unlocked);
        assert.isTrue(UIManager.activationScreen.classList.contains('show'));
        assert.isFalse(UIManager.unlockSimScreen.classList.contains('show'));
      });
    });

    suite('PUK unlock ', function() {
      setup(function() {
        iccInfo0.cardState = 'pukRequired';
        SimManager.resetForm();
        SimManager.handleCardState();
        // start from original state each test
        UIManager.pukInput.classList.remove('onerror');
        UIManager.pukError.classList.add('hidden');
        UIManager.pukRetriesLeft.classList.add('hidden');
      });

      test('wrong length PUK', function() {
        UIManager.pukInput.value = 123;
        SimManager.unlock();

        assert.isTrue(UIManager.pukRetriesLeft.classList.contains('hidden'));
        assert.isTrue(UIManager.pukInput.classList.contains('onerror'));
        assert.isFalse(UIManager.pukError.classList.contains('hidden'));
        assert.isFalse(SimManager.icc0.unlocked);
      });
      test('too short newPIN', function() {
        UIManager.pukInput.value = 12345678;
        UIManager.newpinInput.value = 123;
        SimManager.unlock();

        assert.isTrue(UIManager.pukRetriesLeft.classList.contains('hidden'));
        assert.isTrue(UIManager.newpinInput.classList.contains('onerror'));
        assert.isFalse(UIManager.newpinError.classList.contains('hidden'));
        assert.isFalse(SimManager.icc0.unlocked);
      });
      test('too long newPIN', function() {
        UIManager.pukInput.value = 12345678;
        UIManager.newpinInput.value = 123456789;
        SimManager.unlock();

        assert.isTrue(UIManager.pukRetriesLeft.classList.contains('hidden'));
        assert.isTrue(UIManager.newpinInput.classList.contains('onerror'));
        assert.isFalse(UIManager.newpinError.classList.contains('hidden'));
        assert.isFalse(SimManager.icc0.unlocked);
      });
      test('different PIN and confirm PIN', function() {
        UIManager.pukInput.value = 12345678;
        UIManager.newpinInput.value = 1234;
        UIManager.confirmNewpinInput.value = 4321;
        SimManager.unlock();

        assert.isTrue(UIManager.pukRetriesLeft.classList.contains('hidden'));
        assert.isTrue(UIManager.newpinInput.classList.contains('onerror'));
        assert.isTrue(UIManager.confirmNewpinInput.classList.contains(
                      'onerror'));
        assert.isFalse(UIManager.confirmNewpinError.classList.contains(
                       'hidden'));
        assert.isFalse(SimManager.icc0.unlocked);
      });
      test('wrong sim puk with > 1 retries', function() {
        SimManager.icc0.mozIcc.retryCount = 2;
        UIManager.pukInput.value = '00000000'; // special failure pin value
        UIManager.newpinInput.value = 1234;
        UIManager.confirmNewpinInput.value = 1234;
        SimManager.unlock();
        assert.isFalse(UIManager.pukRetriesLeft.classList.contains('hidden'));
        assert.isTrue(UIManager.pukInput.classList.contains('onerror'));
        assert.isFalse(UIManager.pukError.classList.contains('hidden'));
        assert.isFalse(SimManager.icc0.unlocked);
        assert.isFalse(UIManager.activationScreen.classList.contains('show'));
        assert.isTrue(UIManager.unlockSimScreen.classList.contains('show'));
        assert.isTrue(UIManager.pukError.querySelector('.lastchance')
          .classList.contains('hidden'));
        assert.isFalse(UIManager.pukError.querySelector('.main')
          .classList.contains('hidden'));
      });
      test('wrong sim puk with exactly 1 retry', function() {
        SimManager.icc0.mozIcc.retryCount = 1;
        UIManager.pukInput.value = '00000000'; // special failure pin value
        UIManager.newpinInput.value = 1234;
        UIManager.confirmNewpinInput.value = 1234;
        SimManager.unlock();
        assert.isFalse(UIManager.pukError.querySelector('.lastchance')
          .classList.contains('hidden'));
        assert.isTrue(UIManager.pukError.querySelector('.main')
          .classList.contains('hidden'));
      });
      test('all fields correct', function() {
        fireRetryCountCallback();
        assert.isFalse(UIManager.pukRetriesLeft.classList.contains('hidden'));
        UIManager.pukInput.value = 12345678;
        UIManager.newpinInput.value = 1234;
        UIManager.confirmNewpinInput.value = 1234;
        SimManager.unlock();

        assert.isTrue(UIManager.pukRetriesLeft.classList.contains('hidden'));
        assert.isFalse(UIManager.pukInput.classList.contains('onerror'));
        assert.isTrue(UIManager.pukError.classList.contains('hidden'));
        assert.isFalse(UIManager.newpinInput.classList.contains('onerror'));
        assert.isTrue(UIManager.newpinError.classList.contains('hidden'));
        assert.isFalse(UIManager.confirmNewpinInput.classList.contains(
                      'onerror'));
        assert.isTrue(UIManager.confirmNewpinError.classList.contains(
                       'hidden'));
        assert.isTrue(SimManager.icc0.unlocked);
        assert.isTrue(UIManager.activationScreen.classList.contains('show'));
        assert.isFalse(UIManager.unlockSimScreen.classList.contains('show'));
      });
    });

    suite('XCK unlock ', function() {
      setup(function() {
        iccInfo0.cardState = 'networkLocked';
        SimManager.resetForm();
        SimManager.handleCardState();
        // start from original state each test
        UIManager.xckInput.classList.remove('onerror');
        UIManager.xckError.classList.add('hidden');
        UIManager.xckRetriesLeft.classList.add('hidden');
      });

      test('too short XCK', function() {
        UIManager.xckInput.value = 1234567;
        SimManager.unlock();

        assert.isTrue(UIManager.xckRetriesLeft.classList.contains('hidden'));
        assert.isTrue(UIManager.xckInput.classList.contains('onerror'));
        assert.isFalse(UIManager.xckError.classList.contains('hidden'));
        assert.isFalse(SimManager.icc0.unlocked);
      });
      test('too long XCK', function() {
        UIManager.xckInput.value = 12345678901234567;
        SimManager.unlock();

        assert.isTrue(UIManager.xckRetriesLeft.classList.contains('hidden'));
        assert.isTrue(UIManager.xckInput.classList.contains('onerror'));
        assert.isFalse(UIManager.xckError.classList.contains('hidden'));
        assert.isFalse(SimManager.icc0.unlocked);
      });
      test('wrong sim XCK with > 1 retries', function() {
        SimManager.icc0.mozIcc.retryCount = 2;
        UIManager.xckInput.value = '00000000'; // special failure pin value
        SimManager.unlock();
        assert.isFalse(UIManager.xckRetriesLeft.classList.contains('hidden'));
        assert.isTrue(UIManager.xckInput.classList.contains('onerror'));
        assert.isFalse(UIManager.xckError.classList.contains('hidden'));
        assert.isFalse(SimManager.icc0.unlocked);
        assert.isFalse(UIManager.activationScreen.classList.contains('show'));
        assert.isTrue(UIManager.unlockSimScreen.classList.contains('show'));
        assert.isTrue(UIManager.xckError.querySelector('.lastchance')
          .classList.contains('hidden'));
        assert.isFalse(UIManager.xckError.querySelector('.main')
          .classList.contains('hidden'));
      });
      test('wrong sim XCK with exactly 1 retry', function() {
        SimManager.icc0.mozIcc.retryCount = 1;
        UIManager.xckInput.value = '00000000'; // special failure pin value
        SimManager.unlock();
        assert.isFalse(UIManager.xckError.querySelector('.lastchance')
          .classList.contains('hidden'));
        assert.isTrue(UIManager.xckError.querySelector('.main')
          .classList.contains('hidden'));
      });
      test('all fields correct', function() {
        fireRetryCountCallback();
        assert.isFalse(UIManager.xckRetriesLeft.classList.contains('hidden'));
        UIManager.xckInput.value = 12345678;
        SimManager.unlock();

        assert.isTrue(UIManager.xckRetriesLeft.classList.contains('hidden'));
        assert.isFalse(UIManager.xckInput.classList.contains('onerror'));
        assert.isTrue(UIManager.xckError.classList.contains('hidden'));
        assert.isTrue(SimManager.icc0.unlocked);
        assert.isTrue(UIManager.activationScreen.classList.contains('show'));
        assert.isFalse(UIManager.unlockSimScreen.classList.contains('show'));
      });
    });
  });

  suite('No Telephony', function() {
    var realMozMobileConnections;

    setup(function() {
      realMozMobileConnections = navigator.mozMobileConnections;
      // no telephony API
      navigator.mozMobileConnections = null;

      SimManager.init();
    });

    teardown(function() {
      navigator.mozMobileConnections = realMozMobileConnections;
      realMozMobileConnections = null;
    });

    test('hide sim import section', function() {
      SimManager.skip();
      assert.isFalse(UIManager.simImport.classList.contains('show'));
    });
  });

  suite('Operator', function() {
    setup(function() {
      iccInfo0.cardState = 'ready';
      MobileOperator.mOperator = '';
      SimManager.updateSIMInfoText(SimManager.icc0);
    });

    test('should read locked state', function() {
      iccInfo0.cardState = 'pinRequired';
      SimManager.updateSIMInfoText(SimManager.icc0);

      assert.equal('simPinLocked',
        UIManager.simCarrier1.getAttribute('data-l10n-id'));
    });

    test('should read no operator when unlocked', function() {
      assert.equal(UIManager.simCarrier1.getAttribute('data-l10n-id'),
                                                      'searchingOperator');
    });

    test('should update the operator on voicechange', function() {
      MobileOperator.mOperator = 'Fake Operator';
      MockNavigatorMozMobileConnections[0].triggerEventListeners('voicechange');

      assert.equal('Fake Operator', UIManager.simCarrier1.textContent);
    });

    test('should have 1 event listener per ICC', function() {
      SimManager.updateSIMInfoText(SimManager.icc0);
      SimManager.updateSIMInfoText(SimManager.icc0);

      assert.equal(1, SimManager.voiceChangeListeners.length);
    });
  });

  suite('SIM2 inserted >', function() {
    var iccId1;
    var iccInfo1;
    var realIccId0;

    setup(function() {
      iccId1 = '98765';
      navigator.mozIccManager.addIcc(iccId1);
      iccInfo1 = navigator.mozIccManager.getIccById(iccId1);
      navigator.mozMobileConnections.mAddMobileConnection();
      navigator.mozMobileConnections[1].iccId = iccId1;
      navigator.mozMobileConnections[1].iccInfo = iccInfo1;

      SimManager.updateIccState(iccId1);
      SimManager.simSlots = 2;

      realIccId0 = SimManager.icc0;
      SimManager.icc0 = null;

      this.sinon.stub(Navigation, 'back');
    });

    teardown(function() {
      navigator.mozIccManager.removeIcc(iccId1);
      navigator.mozMobileConnections.mRemoveMobileConnection(1);
      SimManager.simSlots = 1;
      SimManager.icc1 = null;
      SimManager.icc0 = realIccId0;
    });

    test('"simUnlockBack" hides the screen', function() {
      iccInfo1.cardState = 'pinRequired';
      SimManager.handleCardState();

      SimManager.simUnlockBack();
      assert.ok(Navigation.back.calledOnce);
      assert.isTrue(UIManager.activationScreen.classList.contains('show'));
      assert.isFalse(UIManager.unlockSimScreen.classList.contains('show'));
      assert.isTrue(UIManager.pinRetriesLeft.classList.contains('hidden'));
    });
  });

  suite('SIM1 and SIM2 inserted >', function() {
    var iccId1;
    var iccInfo1;

    setup(function() {
      iccId1 = '98765';
      navigator.mozIccManager.addIcc(iccId1);
      iccInfo1 = navigator.mozIccManager.getIccById(iccId1);
      navigator.mozMobileConnections.mAddMobileConnection();
      navigator.mozMobileConnections[1].iccId = iccId1;
      navigator.mozMobileConnections[1].iccInfo = iccInfo1;
      SimManager.updateIccState(iccId1);

      SimManager.simSlots = 2;

      this.sinon.spy(SimManager, 'skip');
      this.sinon.spy(Navigation, 'back');
    });

    teardown(function() {
      navigator.mozIccManager.removeIcc(iccId1);
      navigator.mozMobileConnections.mRemoveMobileConnection(1);
      SimManager.simSlots = 1;
      SimManager.icc1 = null;
    });

    test('if SIM1 is skipped, SIM2 screen should be shown', function() {
      iccInfo0.cardState = 'pinRequired';
      iccInfo1.cardState = 'pinRequired';
      SimManager.handleCardState();

      SimManager.skip();
      assert.ok(SimManager.skip.calledOnce);
      assert.isFalse(UIManager.activationScreen.classList.contains('show'));
      assert.isTrue(UIManager.unlockSimScreen.classList.contains('show'));
      assert.equal(UIManager.pinLabel.getAttribute('data-l10n-args'),
        '{"n":2}');
    });

    test('SIM1 is skipped and user go back', function() {
      iccInfo0.cardState = 'pinRequired';
      iccInfo1.cardState = 'pinRequired';
      SimManager.handleCardState();

      SimManager.skip();
      assert.ok(SimManager.skip.calledOnce);
      assert.isFalse(UIManager.activationScreen.classList.contains('show'));
      assert.isTrue(UIManager.unlockSimScreen.classList.contains('show'));
      assert.equal(UIManager.pinLabel.getAttribute('data-l10n-args'),
        '{"n":2}');
      SimManager.icc0.skipped = true;

      SimManager.simUnlockBack();
      assert.isFalse(Navigation.back.calledOnce);
      assert.isFalse(UIManager.activationScreen.classList.contains('show'));
      assert.isTrue(UIManager.unlockSimScreen.classList.contains('show'));
      assert.equal(UIManager.pinLabel.getAttribute('data-l10n-args'),
        '{"n":1}');
    });
  });


});
