/* globals MultiSimActionButton, MocksHelper, MockMozL10n,
           MockNavigatorMozIccManager, MockNavigatorMozTelephony,
           MockSettingsListener, MockTelephonyHelper, CustomElementsHelper,
           ALWAYS_ASK_OPTION_VALUE
*/

'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/dialer/mock_lazy_l10n.js');
require('/shared/test/unit/mocks/dialer/mock_telephony_helper.js');
require(
  '/shared/test/unit/mocks/elements/gaia_sim_picker/mock_gaia_sim_picker.js');

require('/shared/js/multi_sim_action_button.js');

var mocksHelperForMultiSimActionButton = new MocksHelper([
  'LazyL10n',
  'LazyLoader',
  'GaiaSimPicker',
  'SettingsListener'
]).init();

var customElementsHelperForMultiSimActionButton = new CustomElementsHelper([
  'GaiaSimPicker'
]);

suite('multi SIM action button', function() {
  var subject;
  var realMozSettings;
  var realMozTelephony;
  var realMozL10n;
  var realMozIccManager;
  var realTelephonyHelper;
  var phoneNumber;
  var button;
  var simPicker;
  var expectedCardIndex;
  var setCardIndex;

  mocksHelperForMultiSimActionButton.attachTestHelpers();

  var initSubject = function(options) {
    options = options || {};
    var callback = options.callback || function() {};
    var noSettingsTriggerCallback = options.noSettingsTriggerCallback || false;

    MockTelephonyHelper.mInUseSim = setCardIndex;

    button = options.button || document.createElement('button');
    subject = new MultiSimActionButton(
      button,
      callback,
      'ril.telephony.defaultServiceId',
      phoneNumberGetter
    );

    // MockSettingsListener doesn't simulate the regular behavior of triggering
    // the callback as soon as the pref is loaded, so we have to simulate it
    // once the subject is initialized. We can't alter MockSettingsListener
    // since doing so makes a ton of other tests fail.
    if (!noSettingsTriggerCallback) {
      MockSettingsListener.mTriggerCallback(
        'ril.telephony.defaultServiceId', setCardIndex);
    }
  };

  var simulateClick = function() {
    var ev = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    button.dispatchEvent(ev);
  };

  var simulateContextMenu = function() {
    var ev = document.createEvent('MouseEvents');
    ev.initMouseEvent('contextmenu', true, false, window, 0, 0, 0, 0, 0,
                      false, false, false, false, 2, null);
    button.dispatchEvent(ev);
  };

  var phoneNumberGetter = function() {
    return phoneNumber;
  };

  var shouldUsePrimarySimCard = function() {
    var callbackStub = this.sinon.stub();
    initSubject({ callback: callbackStub });

    phoneNumber = '0145345520';
    simulateClick();
    sinon.assert.calledWith(callbackStub, phoneNumber, expectedCardIndex);
  };

  suiteSetup(function() {
    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;

    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;

    realTelephonyHelper = window.TelephonyHelper;
    window.TelephonyHelper = null;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    navigator.mozTelephony = realMozTelephony;
    navigator.mozL10n = realMozL10n;
    navigator.mozIccManager = realMozIccManager;
    window.TelephonyHelper = realTelephonyHelper;
  });

  setup(function() {
    document.body.innerHTML =
      '<gaia-sim-picker id="sim-picker"></gaia-sim-picker>';
    customElementsHelperForMultiSimActionButton.resolve();
    simPicker = document.getElementById('sim-picker');

    phoneNumber = '';
    initSubject();

    setCardIndex = expectedCardIndex = 0;
  });

  teardown(function() {
    document.body.innerHTML = '';

    MockNavigatorMozTelephony.mTeardown();
    MockNavigatorMozIccManager.mTeardown();
    MockTelephonyHelper.mTeardown();
  });

  suite('0 SIMs', function() {
    setup(function() {
      setCardIndex = undefined;
      expectedCardIndex = 0;
      initSubject();
    });

    test('should not show SIM picker menu when long pressing', function() {
      phoneNumber = '15555555555';
      var showSpy = this.sinon.spy(simPicker, 'getOrPick');
      simulateContextMenu();
      sinon.assert.notCalled(showSpy);
    });

    test('should use first SIM slot (which is empty)', shouldUsePrimarySimCard);
  });

  [0, 1].forEach(function(cardIndex) {
    suite('1 SIM in slot ' + cardIndex, function() {
      setup(function() {
        navigator.mozIccManager.addIcc(cardIndex, {});

        setCardIndex = expectedCardIndex = cardIndex;
        initSubject();
      });

      test('should not show SIM picker menu when long pressing', function() {
        phoneNumber = '15555555555';
        var showSpy = this.sinon.spy(simPicker, 'getOrPick');
        simulateContextMenu();
        sinon.assert.notCalled(showSpy);
      });

      test('should use the only SIM', shouldUsePrimarySimCard);
    });
  });

  suite('2 SIMs', function() {
    setup(function() {
      navigator.mozIccManager.addIcc(0, {});
      navigator.mozIccManager.addIcc(1, {});
    });

    suite('settings loading race conditions', function() {
      var callbackStub;

      setup(function() {
        phoneNumber = '1234';

        callbackStub = this.sinon.stub();
        initSubject({
          callback: callbackStub,
          noSettingsTriggerCallback: true
        });

        this.sinon.spy(simPicker, 'getOrPick');
      });

      test('should queue one tap until settings are loaded', function() {
        simulateClick();
        sinon.assert.notCalled(callbackStub);

        MockSettingsListener.mTriggerCallback(
          'ril.telephony.defaultServiceId', setCardIndex);

        sinon.assert.calledOnce(callbackStub);
      });

      test('should ignore long taps until settings are loaded', function() {
        simulateContextMenu();
        sinon.assert.notCalled(simPicker.getOrPick);
      });
    });

    suite('SIM 2 preferred', function() {
      setup(function() {
        setCardIndex = expectedCardIndex = 1;
        initSubject();
      });

      test('should show SIM picker menu when long pressing', function() {
        phoneNumber = '15555555555';
        var showSpy = this.sinon.spy(simPicker, 'getOrPick');
        simulateContextMenu();
        sinon.assert.calledWith(showSpy, expectedCardIndex, phoneNumber);
      });

      test('should fire SIM selected callback', function() {
        var showSpy = this.sinon.spy(simPicker, 'getOrPick');

        phoneNumber = '15555555555';
        simulateContextMenu();
        subject.performAction(setCardIndex);
        sinon.assert.calledWith(showSpy, expectedCardIndex, phoneNumber);
      });

      test('should check the connection on the primary SIM card',
           shouldUsePrimarySimCard);
    });

    suite('always ask', function() {
      setup(function() {
        setCardIndex = expectedCardIndex = ALWAYS_ASK_OPTION_VALUE;
        initSubject();
      });

      test('should show SIM picker when clicked', function() {
        phoneNumber = '15555555555';
        var showSpy = this.sinon.spy(simPicker, 'getOrPick');
        simulateClick();
        sinon.assert.calledWith(showSpy, expectedCardIndex, phoneNumber);
      });
    });

    suite('with a call in progress', function() {
      suiteSetup(function() {
        window.TelephonyHelper = MockTelephonyHelper;
      });

      suiteTeardown(function() {
        window.TelephonyHelper = null;
      });

      setup(function() {
        // Use different cardIndex and mInUseSim.
        setCardIndex = 0;
        expectedCardIndex = MockTelephonyHelper.mInUseSim = 1;
        initSubject();
      });

      test('should not open SIM picker on (long) tap', function() {
        var showSpy = this.sinon.spy(simPicker, 'getOrPick');
        simulateClick();
        simulateContextMenu();
        sinon.assert.notCalled(showSpy);
      });

      test('should return current serviceId of call', function() {
        var callbackStub = this.sinon.stub();
        initSubject({ callback: callbackStub });

        phoneNumber = '0123456789';
        simulateClick();

        sinon.assert.calledWith(callbackStub, phoneNumber,
                                MockTelephonyHelper.mInUseSim);
      });
    });
  });

  suite('UI tests', function(){
    var setAttributesSpy;
    var simIndication;

    var initWithIndicationElement = function() {
      document.body.className = '';
      document.body.innerHTML =
        '<div id="container">' +
          '<gaia-sim-picker id="sim-picker"></gaia-sim-picker>' +
          '<div class="js-sim-indication"></div>' +
        '</div>';
      button = document.getElementById('container');
      simIndication = button.querySelector('.js-sim-indication');
      customElementsHelperForMultiSimActionButton.resolve();
      simPicker = document.getElementById('sim-picker');
      initSubject({ button: button });
    };

    var shouldNotShowAnIndicator = function() {
      var setAttributesSpy = this.sinon.spy(MockMozL10n, 'setAttributes');
      initSubject();
      sinon.assert.notCalled(setAttributesSpy);
    };

    setup(function() {
      setCardIndex = expectedCardIndex = 0;

      navigator.mozIccManager.addIcc(0, {});
      navigator.mozIccManager.addIcc(1, {});
    });

    suite('with SIM indication', function() {
      setup(function() {
        setAttributesSpy = this.sinon.spy(MockMozL10n, 'setAttributes');
        initWithIndicationElement();
      });

      test('body should have has-preferred-sim class', function() {
        assert.isTrue(document.body.classList.contains('has-preferred-sim'));
      });

      test('has a default localized SIM indicator', function() {
        sinon.assert.calledWith(setAttributesSpy,
                                simIndication,
                                'gaia-sim-picker-button',
                                {n: expectedCardIndex+1});
      });

      test('has a custom localized SIM indicator', function() {
        simIndication.dataset.l10nId = 'expected';
        // Re-create the button taking into account the new l10n-id.
        initSubject({ button: button });
        sinon.assert.calledWith(setAttributesSpy, simIndication, 'expected',
                                {n: expectedCardIndex+1});
      });

      test('indicator changes when settings change', function() {
        MockSettingsListener.mTriggerCallback(
          'ril.telephony.defaultServiceId', 1);

        sinon.assert.calledWith(setAttributesSpy,
                                simIndication,
                                'gaia-sim-picker-button',
                                {n: 2});
      });

      test('should hide indicators when changing to always ask', function() {
        MockSettingsListener.mTriggerCallback(
          'ril.telephony.defaultServiceId', ALWAYS_ASK_OPTION_VALUE);

        assert.isFalse(document.body.classList.contains('has-preferred-sim'));
      });

      suite('with a call in progress', function() {
        suiteSetup(function() {
          window.TelephonyHelper = MockTelephonyHelper;
        });

        suiteTeardown(function() {
          window.TelephonyHelper = null;
        });

        setup(function() {
          setCardIndex = 0;
          initSubject();
        });

        test('should show SIM indicator with in-use serviceId', function() {
          MockTelephonyHelper.mInUseSim = 1;
          MockNavigatorMozTelephony.mTriggerEvent({type: 'callschanged'});

          sinon.assert.calledWith(setAttributesSpy, simIndication,
                                  'gaia-sim-picker-button', {n: 2});
        });

        test('SIM indicator should go back to default serviceId when call over',
             function() {
          MockTelephonyHelper.mInUseSim = 1;
          MockNavigatorMozTelephony.mTriggerEvent({type: 'callschanged'});
          setAttributesSpy.reset();
          MockTelephonyHelper.mTeardown();
          MockNavigatorMozTelephony.mTriggerEvent({type: 'callschanged'});

          sinon.assert.calledWith(setAttributesSpy, simIndication,
                                  'gaia-sim-picker-button', {n: 1});
        });
      });
    });

    suite('without SIM indication', function() {
      setup(function() {
        document.body.className = '';
        document.body.innerHTML =
          '<div id="container">' +
            '<gaia-sim-picker id="sim-picker"></gaia-sim-picker>' +
          '</div>';
        button = document.getElementById('container');
        simIndication = button.querySelector('.js-sim-indication');
        customElementsHelperForMultiSimActionButton.resolve();
        simPicker = document.getElementById('sim-picker');

        initSubject();
      });

      test('body should have has-preferred-sim class', function() {
        assert.isTrue(document.body.classList.contains('has-preferred-sim'));
      });

      test('should not show a current SIM indicator', shouldNotShowAnIndicator);
    });

    suite('<= 1 SIMs', function() {
      setup(function() {
        document.body.className = '';

        navigator.mozIccManager.mTeardown();
        navigator.mozIccManager.addIcc(0, {});

        initWithIndicationElement();
      });

      test('body should not have has-preferred-sim class', function() {
        assert.isFalse(document.body.classList.contains('has-preferred-sim'));
      });

      test('should not show a current SIM indicator', shouldNotShowAnIndicator);
    });
  });
});
