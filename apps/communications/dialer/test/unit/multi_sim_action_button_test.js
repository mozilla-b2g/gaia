/* globals ALWAYS_ASK_OPTION_VALUE, MultiSimActionButton, MockSimPicker,
           MocksHelper, MockMozL10n, MockNavigatorMozIccManager,
           MockNavigatorMozTelephony, MockSettingsListener, MockTelephonyHelper,
           Promise
*/

'use strict';

require('/dialer/test/unit/mock_lazy_loader.js');
require('/dialer/test/unit/mock_telephony_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/mock_sim_picker.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/dialer/mock_lazy_l10n.js');

require('/shared/js/multi_sim_action_button.js');

var mocksHelperForMultiSimActionButton = new MocksHelper([
  'LazyL10n',
  'LazyLoader',
  'SimPicker',
  'SettingsListener'
]).init();

mocha.globals(['TelephonyHelper']);

suite('multi SIM action button', function() {
  var subject;
  var realMozSettings;
  var realMozTelephony;
  var realMozL10n;
  var realMozIccManager;
  var realTelephonyHelper;
  var phoneNumber;
  var button;
  var cardIndex;

  mocksHelperForMultiSimActionButton.attachTestHelpers();

  var initSubject = function() {
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

    // Wait for the cardIndex promise
    return subject._getCardIndex();
  };

  var simulateClick = function() {
    var ev = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    var cardIndexSpy = sinon.spy(subject, '_getCardIndex');

    button.dispatchEvent(ev);

    var cardPromise = cardIndexSpy.returnValues[0];
    cardIndexSpy.restore();

    return cardPromise;
  };

  // simulateContextMenuAndWaitFor
  var simulateContextMenu = function() {
    var ev = document.createEvent('MouseEvents');
    ev.initMouseEvent('contextmenu', true, false, window, 0, 0, 0, 0, 0,
                      false, false, false, false, 2, null);

    var cardIndexSpy = sinon.spy(subject, '_getCardIndex');
    button.dispatchEvent(ev);

    var cardPromise = cardIndexSpy.returnValues[0];
    cardIndexSpy.restore();

    if (cardPromise) {
      return cardPromise;
    } else {
      return Promise.resolve();
    }
  };

  var phoneNumberGetter = function() {
    return phoneNumber;
  };

  var shouldUsePrimarySimCard = function(done) {
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
    subject.performAction().then(function() {
      sinon.assert.calledWith(callStub, phoneNumber, cardIndex);
    }).then(done, done);
  };

  suiteSetup(function() {
    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;

    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;
    navigator.mozIccManager.mTeardown();

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

  setup(function(done) {
    phoneNumber = '';
    button = document.createElement('button');
    initSubject().then(function() { done(); });

    navigator.mozIccManager.addIcc(0, {});
  });

  teardown(function() {
    MockNavigatorMozTelephony.mTeardown();
    MockNavigatorMozIccManager.mTeardown();
    MockTelephonyHelper.mTeardown();
  });

  suite('<= 1 SIMs', function() {
    setup(function() {
      cardIndex = 0;
    });

    test('should not listen to contextmenu events', function() {
      var button = document.createElement('button');
      this.sinon.spy(button, 'addEventListener');
      subject = new MultiSimActionButton(button, function() {}, '',
                                         function() {});
      sinon.assert.neverCalledWith(button.addEventListener, 'contextmenu');
    });

    test('should use the only SIM', shouldUsePrimarySimCard);
  });

  suite('>= 2 SIMs', function() {
    setup(function() {
      navigator.mozIccManager.addIcc(1, {});
    });

    suite('SIM 2 preferred', function() {
      setup(function(done) {
        cardIndex = 1;
        initSubject().then(function() {done();});
      });

      test('should show SIM picker menu when long pressing', function(done) {

        phoneNumber = '15555555555';
        var showSpy = this.sinon.spy(MockSimPicker, 'getOrPick');
        simulateContextMenu().then(function() {
          sinon.assert.calledWith(showSpy, cardIndex, phoneNumber);
        }).then(done, done);
      });

      test('should fire SIM selected callback', function(done) {
        var showSpy = this.sinon.spy(MockSimPicker, 'getOrPick');
        subject = new MultiSimActionButton(
          button,
          function() {},
          'ril.telephony.defaultServiceId',
          phoneNumberGetter
        );

        MockSettingsListener.mTriggerCallback(
          'ril.telephony.defaultServiceId', cardIndex);

        phoneNumber = '15555555555';
        simulateContextMenu().then(function() {
          sinon.assert.calledWith(showSpy, cardIndex, phoneNumber);
        }).then(done, done);
      });

      test('should check the connection on the primary SIM card',
           shouldUsePrimarySimCard);
    });

    suite('always ask', function() {
      setup(function(done) {
        cardIndex = ALWAYS_ASK_OPTION_VALUE;
        initSubject().then(function() {done();});
      });

      test('should show SIM picker when clicked', function(done) {
        phoneNumber = '15555555555';
        var showSpy = this.sinon.spy(MockSimPicker, 'getOrPick');
        simulateClick().then(function() {
          sinon.assert.calledWith(showSpy, cardIndex, phoneNumber);
        }).then(done, done);
      });
    });

    suite('with a call in progress', function() {
      suiteSetup(function() {
        window.TelephonyHelper = MockTelephonyHelper;
      });

      suiteTeardown(function() {
        window.TelephonyHelper = null;
      });

      setup(function(done) {
        // Use different cardIndex and mInUseSim.
        cardIndex = 0;
        MockTelephonyHelper.mInUseSim = 1;
        initSubject().then(function() {done();});
      });

      test('should not open SIM picker on (long) tap', function(done) {
        var showSpy = this.sinon.spy(MockSimPicker, 'getOrPick');
        simulateContextMenu().then(function() {
          sinon.assert.notCalled(showSpy);
        }).then(done, done);
      });

      test('should return current serviceId of call', function(done) {
        var callStub = this.sinon.stub();

        subject = new MultiSimActionButton(
          button,
          callStub,
          'ril.telephony.defaultServiceId',
          phoneNumberGetter
        );
        MockSettingsListener.mTriggerCallback(
          'ril.telephony.defaultServiceId', cardIndex);

        phoneNumber = '0123456789';
        this.sinon.spy(subject, 'performAction');
        simulateClick().then(function() {
          subject.performAction.returnValues[0].then(function() {
            sinon.assert.calledWith(callStub, phoneNumber,
                                    MockTelephonyHelper.mInUseSim);
          });
        }).then(done, done);
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
      return initSubject();
    };

    var shouldNotShowAnIndicator = function(done) {
      var localizeSpy = this.sinon.spy(MockMozL10n, 'localize');
      initSubject().then(function() {
        sinon.assert.notCalled(localizeSpy);
      }).then(done, done);
    };

    setup(function() {
      cardIndex = 0;
      initSubject();

      navigator.mozIccManager.addIcc(0, {});
      navigator.mozIccManager.addIcc(1, {});
    });

    suite('with SIM indication', function() {
      setup(function(done) {
        initWithIndicationElement().then(function() { done(); });
      });

      test('body should have has-preferred-sim class', function() {
        assert.isTrue(document.body.classList.contains('has-preferred-sim'));
      });

      test('has a localized SIM indicator', function(done) {
        var localizeSpy = this.sinon.spy(MockMozL10n, 'localize');
        initSubject().then(function() {
          sinon.assert.calledWith(localizeSpy, simIndication,
                                  'sim-picker-button', {n: cardIndex+1});
        }).then(done, done);
      });

      test('indicator changes when settings change', function(done) {
        var localizeSpy = this.sinon.spy(MockMozL10n, 'localize');
        this.sinon.spy(subject, '_getCardIndex');

        MockSettingsListener.mTriggerCallback(
          'ril.telephony.defaultServiceId', 1);

        subject._getCardIndex.returnValues[0].then(function() {
          sinon.assert.calledWith(localizeSpy, simIndication,
                                  'sim-picker-button', {n: 2});
        }).then(done, done);
      });

      test('should hide indicators when changing to always ask',
           function(done) {
        this.sinon.spy(subject, '_getCardIndex');

        MockSettingsListener.mTriggerCallback(
          'ril.telephony.defaultServiceId', ALWAYS_ASK_OPTION_VALUE);

        subject._getCardIndex.returnValues[0].then(function() {
          assert.isFalse(document.body.classList.contains('has-preferred-sim'));
        }).then(done, done);
      });

      suite('with a call in progress', function() {
        suiteSetup(function() {
          window.TelephonyHelper = MockTelephonyHelper;
        });

        suiteTeardown(function() {
          window.TelephonyHelper = null;
        });

        setup(function(done) {
          cardIndex = 0;
          initSubject().then(function() { done(); });
        });

        test('should show SIM indicator with in-use serviceId', function(done) {
          var localizeSpy = this.sinon.spy(MockMozL10n, 'localize');
          this.sinon.spy(subject, '_getCardIndex');

          MockTelephonyHelper.mInUseSim = 1;
          MockNavigatorMozTelephony.mTriggerEvent({type: 'callschanged'});

          subject._getCardIndex.returnValues[0].then(function() {
            sinon.assert.calledWith(localizeSpy, simIndication,
                                    'sim-picker-button', {n: 2});
          }).then(done, done);
        });

        test('SIM indicator should go back to default serviceId when call over',
             function(done) {
          MockTelephonyHelper.mInUseSim = 1;
          MockNavigatorMozTelephony.mTriggerEvent({type: 'callschanged'});

          var localizeSpy = this.sinon.spy(MockMozL10n, 'localize');
          this.sinon.spy(subject, '_getCardIndex');
          MockTelephonyHelper.mTeardown();
          MockNavigatorMozTelephony.mTriggerEvent({type: 'callschanged'});

          subject._getCardIndex.returnValues[0].then(function() {
            sinon.assert.calledWith(localizeSpy, simIndication,
                                    'sim-picker-button', {n: 1});
          }).then(done, done);
        });
      });
    });

    suite('without SIM indication', function() {
      setup(function(done) {
        document.body.className = '';
        document.body.innerHTML = '<div id="container"></div>';
        button = document.getElementById('container');
        simIndication = button.querySelector('.js-sim-indication');

        initSubject().then(function() { done(); });
      });

      test('body should have has-preferred-sim class', function() {
        assert.isTrue(document.body.classList.contains('has-preferred-sim'));
      });

      test('should not show a current SIM indicator', shouldNotShowAnIndicator);
    });

    suite('<= 1 SIMs', function() {
      setup(function(done) {
        document.body.className = '';

        navigator.mozIccManager.mTeardown();
        navigator.mozIccManager.addIcc(0, {});

        initWithIndicationElement().then(function() { done(); });
      });

      test('body should not have has-preferred-sim class', function() {
        assert.isFalse(document.body.classList.contains('has-preferred-sim'));
      });

      test('should not show a current SIM indicator', shouldNotShowAnIndicator);
    });
  });
});
