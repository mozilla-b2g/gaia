'use strict';

require(
  '/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
requireApp(
  'communications/ftu/test/unit/mock_navigator_moz_icc_manager.js');
requireApp('communications/ftu/test/unit/mock_ui_manager.js');
requireApp('communications/ftu/test/unit/mock_l10n.js');

requireApp('communications/ftu/js/sim_manager.js');
requireApp('communications/ftu/js/navigation.js');

require('/shared/test/unit/load_body_html_helper.js');

var _;
var mocksHelperForSimManager = new MocksHelper([
  'UIManager'
]).init();

suite('sim mgmt >', function() {
  var realL10n,
      realMozIccManager,
      realMozMobileConnections;
  var mocksHelper = mocksHelperForSimManager;
  var container, navigationStub;

  suiteSetup(function() {
    loadBodyHTML('/ftu/index.html');

    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;

    realMozMobileConnections = navigator.mozMobileConnections;
    MockNavigatorMozMobileConnections[0].iccId =
                                     navigator.mozIccManager.iccIds[0];
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    mocksHelper.suiteSetup();
  });

  setup(function() {
    SimManager.init();

    UIManager.activationScreen.classList.remove('show');
    UIManager.unlockSimScreen.classList.add('show');

    mocksHelper.setup();

  });

  teardown(function() {
    mocksHelper.teardown();
  });

  suiteTeardown(function() {
    document.body.innerHTML = '';

    navigator.mozMobileConnections = realMozMobileConnections;
    realMozMobileConnections = null;

    navigator.mozIccManager = realMozIccManager;
    realMozIccManager = null;

    navigator.mozL10n = realL10n;
    realL10n = null;

    mocksHelper.suiteTeardown();
  });

  test('"Skip" hides the screen', function() {
    navigator.mozIccManager.setProperty('cardState', 'pinRequired');
    SimManager.handleCardState();
    SimManager.skip();
    assert.isTrue(UIManager.activationScreen.classList.contains('show'));
    assert.isFalse(UIManager.unlockSimScreen.classList.contains('show'));
  });

  test('"Back" hides the screen', function() {
    navigationStub = sinon.stub(Navigation, 'back');
    SimManager.back();
    assert.ok(navigationStub.calledOnce);
    assert.isTrue(UIManager.activationScreen.classList.contains('show'));
    assert.isFalse(UIManager.unlockSimScreen.classList.contains('show'));
    navigationStub.restore();
  });

  suite('Handle state changes', function() {

    setup(function() {
      UIManager.unlockSimScreen.classList.remove('show');
    });

    test('pinRequired shows PIN screen', function() {
      navigator.mozIccManager.setProperty('cardState', 'pinRequired');
      SimManager.handleCardState();

      assert.isTrue(UIManager.unlockSimScreen.classList.contains('show'));

      assert.isTrue(UIManager.pincodeScreen.classList.contains('show'));
      assert.isFalse(UIManager.pukcodeScreen.classList.contains('show'));
      assert.isFalse(UIManager.xckcodeScreen.classList.contains('show'));
    });

    test('pukRequired shows PUK screen', function() {
      navigator.mozIccManager.setProperty('cardState', 'pukRequired');
      SimManager.handleCardState();

      assert.isTrue(UIManager.unlockSimScreen.classList.contains('show'));
      assert.equal('type_pin', UIManager.pinLabel.textContent);

      assert.isFalse(UIManager.pincodeScreen.classList.contains('show'));
      assert.isTrue(UIManager.pukcodeScreen.classList.contains('show'));
      assert.isFalse(UIManager.xckcodeScreen.classList.contains('show'));
    });

    test('pukRequired DSDS screen', function() {
      navigator.mozIccManager.setProperty('cardState', 'pukRequired');
      SimManager.simSlots = 2;
      SimManager.handleCardState();

      assert.isTrue(UIManager.unlockSimScreen.classList.contains('show'));
      assert.equal(navigator.mozL10n.get('pukcodeLabel', {n: 1}),
        UIManager.pukLabel.textContent);
      SimManager.simSlots = 1;
    });

    test('networkLocked shows XCK screen', function() {
      navigator.mozIccManager.setProperty('cardState', 'networkLocked');
      SimManager.handleCardState();

      assert.isTrue(UIManager.unlockSimScreen.classList.contains('show'));

      assert.isFalse(UIManager.pincodeScreen.classList.contains('show'));
      assert.isFalse(UIManager.pukcodeScreen.classList.contains('show'));
      assert.isTrue(UIManager.xckcodeScreen.classList.contains('show'));
    });
  });

  suite('Unlocking', function() {

    suite('PIN unlock ', function() {
      setup(function() {
        navigator.mozIccManager.setProperty('cardState', 'pinRequired');
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

        test('shuld be disabled with short PIN', function() {
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
      test('all fields correct', function() {
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
        navigator.mozIccManager.setProperty('cardState', 'pukRequired');
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
      test('all fields correct', function() {
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
        navigator.mozIccManager.setProperty('cardState', 'networkLocked');
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
      test('all fields correct', function() {
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

});
