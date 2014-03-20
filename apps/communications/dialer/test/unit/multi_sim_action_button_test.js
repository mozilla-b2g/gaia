/* globals MultiSimActionButton, MockSimPicker, MocksHelper, MockMozL10n,
           MockNavigatorSettings, MockNavigatorMozIccManager,
           MockSettingsListener, ALWAYS_ASK_OPTION_VALUE
*/

'use strict';

require('/dialer/test/unit/mock_lazy_loader.js');
require('/dialer/test/unit/mock_l10n.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_sim_picker.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');

require('/shared/js/multi_sim_action_button.js');

var mocksHelperForMultiSimActionButton = new MocksHelper([
  'LazyL10n',
  'LazyLoader',
  'SimPicker',
  'SettingsListener'
]).init();

suite('multi SIM action button', function() {
  var subject;
  var realMozSettings;
  var realMozL10n;
  var realMozIccManager;
  var phoneNumber;
  var button;
  var cardIndex;

  mocksHelperForMultiSimActionButton.attachTestHelpers();

  var initSubject = function() {
    MockNavigatorSettings.createLock().set({
      'ril.telephony.defaultServiceId': cardIndex });

    subject = new MultiSimActionButton(
      button,
      function() {},
      'ril.telephony.defaultServiceId',
      phoneNumberGetter
    );

    // MockSettingsListener doesn't simulate the regular behavior of triggering
    // the callback as soon as the pref is loaded, so we have to simulate it
    // once the subject is initialized. We can't alter MockSettingsListener
    // since doing so makes a ton of other tests fail.
    MockSettingsListener.mTriggerCallback(
      'ril.telephony.defaultServiceId', cardIndex);
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

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;

    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    navigator.mozL10n = realMozL10n;
    navigator.mozIccManager = realMozIccManager;
  });

  setup(function() {
    MockNavigatorSettings.mSyncRepliesOnly = true;
    phoneNumber = '';
    button = document.createElement('button');
    initSubject();
  });

  teardown(function() {
    MockNavigatorSettings.mTeardown();
    MockNavigatorMozIccManager.mTeardown();
  });

  suite('<= 1 SIMs', function() {
    setup(function() {
      navigator.mozIccManager.addIcc(0, {});
      initSubject();
    });

    test('should not show SIM picker menu when long pressing', function() {
      phoneNumber = '15555555555';
      var showSpy = this.sinon.spy(MockSimPicker, 'show');
      simulateContextMenu();
      sinon.assert.notCalled(showSpy);
    });
  });

  suite('>= 2 SIMs', function() {
    suite('SIM 2 preferred', function() {
      setup(function() {
        navigator.mozIccManager.addIcc(0, {});
        navigator.mozIccManager.addIcc(1, {});

        cardIndex = 1;
        initSubject();
      });

      test('should show SIM picker menu when long pressing', function() {
        phoneNumber = '15555555555';
        var showSpy = this.sinon.spy(MockSimPicker, 'show');
        simulateContextMenu();
        MockNavigatorSettings.mReplyToRequests();
        sinon.assert.calledWith(showSpy, cardIndex, phoneNumber);
      });

      test('should fire SIM selected callback', function() {
        var showSpy = this.sinon.spy(MockSimPicker, 'show');
        subject = new MultiSimActionButton(
          button,
          function() {},
          'ril.telephony.defaultServiceId',
          phoneNumberGetter
        );

        MockSettingsListener.mTriggerCallback(
          'ril.telephony.defaultServiceId', cardIndex);

        phoneNumber = '15555555555';
        simulateContextMenu();
        subject.performAction(cardIndex);
        MockNavigatorSettings.mReplyToRequests();
        sinon.assert.calledWith(showSpy, cardIndex, phoneNumber);
      });

      test('should check the connection on the primary SIM card', function() {
        var callStub = this.sinon.stub();
        subject = new MultiSimActionButton(
          button,
          callStub,
          'ril.telephony.defaultServiceId',
          phoneNumberGetter
        );

        MockSettingsListener.mTriggerCallback(
          'ril.telephony.defaultServiceId', cardIndex);

        phoneNumber = '0145345520';
        subject.performAction();
        MockNavigatorSettings.mReplyToRequests();
        sinon.assert.calledWith(callStub, phoneNumber, cardIndex);
      });
    });

    suite('always ask', function() {
      setup(function() {
        cardIndex = ALWAYS_ASK_OPTION_VALUE;
        MockNavigatorSettings.createLock().set({
          'ril.telephony.defaultServiceId': cardIndex });
      });

      test('should show SIM picker when clicked', function() {
        phoneNumber = '15555555555';
        var showSpy = this.sinon.spy(MockSimPicker, 'show');
        simulateClick();
        MockNavigatorSettings.mReplyToRequests();
        sinon.assert.calledWith(showSpy, cardIndex, phoneNumber);
      });
    });
  });

  suite('UI tests', function(){
    var simIndication;

    var initWithIndicationElement = function() {
      document.body.className = '';
      document.body.innerHTML =
        '<div id="container"><div class="js-sim-indication"></div></div>';
      button = document.getElementById('container');
      simIndication = button.querySelector('.js-sim-indication');
      initSubject();
    };

    var shouldNotShowAnIndicator = function() {
      var localizeSpy = this.sinon.spy(MockMozL10n, 'localize');
      initSubject();
      sinon.assert.notCalled(localizeSpy);
    };

    setup(function() {
      cardIndex = 0;
      MockNavigatorSettings.createLock().set({
        'ril.telephony.defaultServiceId': cardIndex });

      navigator.mozIccManager.addIcc(0, {});
      navigator.mozIccManager.addIcc(1, {});
    });

    suite('with SIM indication', function() {
      setup(function() {
        initWithIndicationElement();
      });

      test('body should have has-preferred-sim class', function() {
        assert.isTrue(document.body.classList.contains('has-preferred-sim'));
      });

      test('has a localized SIM indicator', function() {
        var localizeSpy = this.sinon.spy(MockMozL10n, 'localize');
        initSubject();
        sinon.assert.calledWith(localizeSpy, simIndication, 'sim-picker-button',
                                {n: cardIndex+1});
      });

      test('indicator changes when settings change', function() {
        var localizeSpy = this.sinon.spy(MockMozL10n, 'localize');

        MockNavigatorSettings.createLock().set({
          'ril.telephony.defaultServiceId': 1 });
        MockSettingsListener.mTriggerCallback(
          'ril.telephony.defaultServiceId', 1);

        sinon.assert.calledWith(localizeSpy, simIndication, 'sim-picker-button',
                                {n: 2});
      });

      test('should hide indicators when changing to always ask', function() {
        MockNavigatorSettings.createLock().set({
          'ril.telephony.defaultServiceId': ALWAYS_ASK_OPTION_VALUE });
        MockSettingsListener.mTriggerCallback(
          'ril.telephony.defaultServiceId', ALWAYS_ASK_OPTION_VALUE);

        assert.isFalse(document.body.classList.contains('has-preferred-sim'));
      });
    });

    suite('without SIM indication', function() {
      setup(function() {
        document.body.className = '';
        document.body.innerHTML = '<div id="container"></div>';
        button = document.getElementById('container');
        simIndication = button.querySelector('.js-sim-indication');

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
