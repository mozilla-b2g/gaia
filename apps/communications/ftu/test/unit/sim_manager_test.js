'use strict';

requireApp(
  'communications/ftu/test/unit/mock_navigator_moz_mobile_connection.js');
requireApp(
  'communications/ftu/test/unit/mock_navigator_moz_icc_manager.js');
requireApp('communications/ftu/test/unit/mock_ui_manager.js');

requireApp('communications/ftu/js/sim_manager.js');

var _;
var mocksHelperForNavigation = new MocksHelper([
  'UIManager'
]);
mocksHelperForNavigation.init();

suite('sim mgmt >', function() {
  var realL10n,
      realMozMobileConnection,
      realMozIccManager;
  var mocksHelper = mocksHelperForNavigation;
  var conn, container;

  setup(function() {
    createDOM();

    realMozMobileConnection = navigator.mozMobileConnection;
    navigator.mozMobileConnection = MockNavigatorMozMobileConnection;

    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    mocksHelper.setup();
    SimManager.init();
    conn = navigator.mozMobileConnection;
  });

  teardown(function() {
    navigator.mozMobileConnection = realMozMobileConnection;
    realMozMobileConnection = null;

    navigator.mozIccManager = realMozIccManager;
    realMozIccManager = null;

    navigator.mozL10n = realL10n;
    realL10n = null;

    container.parentNode.removeChild(container);
    mocksHelper.teardown();
  });

  suiteSetup(function() {
    mocksHelper.suiteSetup();
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
  });

  test('"Skip" hides the screen', function() {
    SimManager.skip();
    assert.isTrue(UIManager.activationScreen.classList.contains('show'));
    assert.isFalse(UIManager.unlockSimScreen.classList.contains('show'));
  });

  suite('Handle state changes', function() {
    suiteSetup(function() {
      SimManager._unlocked = false;
      conn.setProperty('retryCount', 3);
    });

    setup(function() {
      UIManager.unlockSimScreen.classList.remove('show');
    });

    teardown(function() {
      UIManager.unlockSimScreen.classList.remove('show');
    });

    suiteTeardown(function() {
      SimManager._unlocked = null;
      conn.setProperty('retryCount', null);
    });

    test('pinRequired shows PIN screen', function() {
      conn.setProperty('cardState', 'pinRequired');
      SimManager.handleCardState();
      assert.isTrue(UIManager.unlockSimScreen.classList.contains('show'));
      assert.isFalse(UIManager.pinRetriesLeft.classList.contains('hidden'));
      assert.isFalse(UIManager.pukRetriesLeft.classList.contains('show'));
      assert.isFalse(UIManager.xckRetriesLeft.classList.contains('show'));
    });

    test('pukRequired shows PUK screen', function() {
      conn.setProperty('cardState', 'pukRequired');
      SimManager.handleCardState();
      assert.isTrue(UIManager.unlockSimScreen.classList.contains('show'));
      assert.isFalse(UIManager.pukRetriesLeft.classList.contains('hidden'));
      assert.isFalse(UIManager.pinRetriesLeft.classList.contains('show'));
      assert.isFalse(UIManager.xckRetriesLeft.classList.contains('show'));
    });

    test('networkLocked shows XCK screen', function() {
      conn.setProperty('cardState', 'networkLocked');
      SimManager.handleCardState();
      assert.isTrue(UIManager.unlockSimScreen.classList.contains('show'));
      assert.isFalse(UIManager.xckRetriesLeft.classList.contains('hidden'));
      assert.isFalse(UIManager.pinRetriesLeft.classList.contains('show'));
      assert.isFalse(UIManager.xckRetriesLeft.classList.contains('show'));
    });
  });

  suite('Unlocking', function() {
    setup(function() {
      SimManager._unlocked = false;
    });
    teardown(function() {
      SimManager._unlocked = false;
    });

    suite('PIN unlock ', function() {
      suiteSetup(function() {
        conn.setProperty('cardState', 'pinRequired');
      });
      suiteTeardown(function() {
        conn.setProperty('cardState', null);
      });

      test('too short PIN', function() {
        UIManager.pinInput.value = 123;
        SimManager.unlock();
        assert.isTrue(UIManager.pinInput.classList.contains('onerror'));
        assert.isFalse(UIManager.pinError.classList.contains('hidden'));
        assert.isFalse(SimManager._unlocked);
      });
      test('too long PIN', function() {
        UIManager.pinInput.value = 123456789;
        SimManager.unlock();
        assert.isTrue(UIManager.pinInput.classList.contains('onerror'));
        assert.isFalse(UIManager.pinError.classList.contains('hidden'));
        assert.isFalse(SimManager._unlocked);
      });
      test('all fields correct', function() {
        UIManager.pinInput.value = 1234;
        SimManager.unlock();
        assert.isFalse(UIManager.pinInput.classList.contains('onerror'));
        assert.isTrue(UIManager.pinError.classList.contains('hidden'));
        assert.isTrue(SimManager._unlocked);
        assert.isTrue(UIManager.activationScreen.classList.contains('show'));
        assert.isFalse(UIManager.unlockSimScreen.classList.contains('show'));
      });
    });

    suite('PUK unlock ', function() {
      suiteSetup(function() {
        conn.setProperty('cardState', 'pukRequired');
      });
      suiteTeardown(function() {
        conn.setProperty('cardState', null);
      });

      test('wrong length PUK', function() {
        UIManager.pukInput.value = 123;
        SimManager.unlock();
        assert.isTrue(UIManager.pukInput.classList.contains('onerror'));
        assert.isFalse(UIManager.pukError.classList.contains('hidden'));
        assert.isFalse(SimManager._unlocked);
      });
      test('too short newPIN', function() {
        UIManager.pukInput.value = 12345678;
        UIManager.newpinInput.value = 123;
        SimManager.unlock();
        assert.isTrue(UIManager.newpinInput.classList.contains('onerror'));
        assert.isFalse(UIManager.newpinError.classList.contains('hidden'));
        assert.isFalse(SimManager._unlocked);
      });
      test('too long newPIN', function() {
        UIManager.pukInput.value = 12345678;
        UIManager.newpinInput.value = 123456789;
        SimManager.unlock();
        assert.isTrue(UIManager.newpinInput.classList.contains('onerror'));
        assert.isFalse(UIManager.newpinError.classList.contains('hidden'));
        assert.isFalse(SimManager._unlocked);
      });
      test('different PIN and confirm PIN', function() {
        UIManager.pukInput.value = 12345678;
        UIManager.newpinInput.value = 1234;
        UIManager.confirmNewpinInput.value = 4321;
        SimManager.unlock();
        assert.isTrue(UIManager.newpinInput.classList.contains('onerror'));
        assert.isTrue(UIManager.confirmNewpinInput.classList.contains(
                      'onerror'));
        assert.isFalse(UIManager.confirmNewpinError.classList.contains(
                       'hidden'));
        assert.isFalse(SimManager._unlocked);
      });
      test('all fields correct', function() {
        UIManager.pukInput.value = 12345678;
        UIManager.newpinInput.value = 1234;
        UIManager.confirmNewpinInput.value = 1234;
        SimManager.unlock();
        assert.isFalse(UIManager.pukInput.classList.contains('onerror'));
        assert.isTrue(UIManager.pukError.classList.contains('hidden'));
        assert.isFalse(UIManager.newpinInput.classList.contains('onerror'));
        assert.isTrue(UIManager.newpinError.classList.contains('hidden'));
        assert.isFalse(UIManager.confirmNewpinInput.classList.contains(
                      'onerror'));
        assert.isTrue(UIManager.confirmNewpinError.classList.contains(
                       'hidden'));
        assert.isTrue(SimManager._unlocked);
        assert.isTrue(UIManager.activationScreen.classList.contains('show'));
        assert.isFalse(UIManager.unlockSimScreen.classList.contains('show'));
      });
    });

    suite('XCK unlock ', function() {
      suiteSetup(function() {
        conn.setProperty('cardState', 'networkLocked');
      });
      suiteTeardown(function() {
        conn.setProperty('cardState', null);
      });

      test('too short XCK', function() {
        UIManager.xckInput.value = 1234567;
        SimManager.unlock();
        assert.isTrue(UIManager.xckInput.classList.contains('onerror'));
        assert.isFalse(UIManager.xckError.classList.contains('hidden'));
        assert.isFalse(SimManager._unlocked);
      });
      test('too long XCK', function() {
        UIManager.xckInput.value = 12345678901234567;
        SimManager.unlock();
        assert.isTrue(UIManager.xckInput.classList.contains('onerror'));
        assert.isFalse(UIManager.xckError.classList.contains('hidden'));
        assert.isFalse(SimManager._unlocked);
      });
      test('all fields correct', function() {
        UIManager.xckInput.value = 12345678;
        SimManager.unlock();
        assert.isFalse(UIManager.xckInput.classList.contains('onerror'));
        assert.isTrue(UIManager.xckError.classList.contains('hidden'));
        assert.isTrue(SimManager._unlocked);
        assert.isTrue(UIManager.activationScreen.classList.contains('show'));
        assert.isFalse(UIManager.unlockSimScreen.classList.contains('show'));
      });
    });
  });

  function createDOM() {
    var markup =
    '<section id="activation-screen"></section>' +
    // Import from SIM
    '<button id="sim-import-button">' +
    ' SIM card' +
    '</button>' +
    '<p id="no-sim">To import insert a SIM card</p>' +
    // SIM Unlock screen
    '<section id="unlock-sim-screen" class="skin-organic">' +
    ' <header>' +
    '   <h1 id="unlock-sim-header">Enter PIN code</h1>' +
    ' </header>' +
    ' <article role="main">' +
    '   <section id="pincode-screen">' +
    '     <label id="pin-label">Type your PIN code</label>' +
    '     <label id="pin-retries-left">Unknown tries left</label>' +
    '     <section class="input-wrapper">' +
    '       <input id="pin-input" name="simpin" type="password" ' +
    '              size="8" maxlength="8" />' +
    '       <input id="fake-pin-input" class="fake-input" ' +
    '              name="fake-simpin" type="number" ' +
    '              size="8" maxlength="8" />' +
    '       <label id="pin-error" class="hidden error">' +
    '         The PIN was incorrect.' +
    '       </label>' +
    '     </section>' +
    '   </section>' +
    '   <section id="pukcode-screen">' +
    '     <label id="puk-label">The SIM card is locked</label>' +
    '     <label id="puk-retries-left">Unknown tries left</label>' +
    '     <section class="input-wrapper">' +
    '       <input id="puk-input" name="simpuk" type="password" ' +
    '              size="8" maxlength="8" />' +
    '       <input id="fake-puk-input" class="fake-input" name="fake-simpuk" ' +
    '              type="number" size="8" maxlength="8" />' +
    '       <div id="puk-info" class="info">...text...</div>' +
    '       <div id="puk-error" class="hidden error">...text...</div>' +
    '     </section>' +
    '     <label id="newpin">Create new PIN</label>' +
    '     <section class="input-wrapper">' +
    '       <input id="newpin-input" name="newpin" ' +
    '              type="password" size="8" maxlength="8" />' +
    '       <input id="fake-newpin-input" class="fake-input" ' +
    '              name="fake-newpin" type="number" size="8" maxlength="8" />' +
    '       <label id="newpin-error" class="hidden error">text</label>' +
    '     </section>' +
    '     <label id="confirm-newpin">Confirm new PIN</label>' +
    '     <section class="input-wrapper">' +
    '       <input id="confirm-newpin-input" name="confirm-newpin" ' +
    '              type="password" size="8" maxlength="8" />' +
    '       <input id="fake-confirm-newpin-input" class="fake-input" ' +
    '              name="fake-confirm-newpin" type="number" ' +
    '              size="8" maxlength="8" />' +
    '       <label id="confirm-newpin-error" class="hidden error">txt</label>' +
    '     </section>' +
    '   </section>' +
    '   <section id="xckcode-screen">' +
    '     <label id="xck-label" >Type your NCK code</label>' +
    '     <label id="xck-retries-left">Unknown</label>' +
    '     <section class="input-wrapper">' +
    '       <input id="xck-input" name="simxck" ' +
    '              type="password" size="16" maxlength="16" />' +
    '       <input id="fake-xck-input" class="fake-input" name="fake-simxck" ' +
    '              type="number" size="16" maxlength="16" />' +
    '       <label id="xck-error" class="hidden error"></label>' +
    '     </section>' +
    '   </section>' +
    ' </article>' +
    ' <nav role="navigation">' +
    '   <button id="skip-pin-button" class="button-left">' +
    '     Skip' +
    '   </button>' +
    '   <button id="unlock-sim-button" class="recommend">' +
    '     Send' +
    '   </button>' +
    ' </nav>' +
    '</section>';

    container = document.createElement('div');
    container.insertAdjacentHTML('beforeend', markup);
    document.body.appendChild(container);
  };

});
