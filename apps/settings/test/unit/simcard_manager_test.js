/* global mocha, MockL10n, MockTemplate, MockSimUIModel,
   SimUIModel, MockSimSettingsHelper, SimCardManager,
   MockNavigatorMozIccManager, MockNavigatorMozMobileConnections,
   MockMobileOperator */
'use strict';

requireApp(
  'settings/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
requireApp(
  'settings/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
requireApp(
  'settings/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp(
  'settings/shared/test/unit/mocks/mock_mobile_operator.js');
requireApp('settings/test/unit/mock_l10n.js');
requireApp('settings/test/unit/mock_template.js');
requireApp('settings/test/unit/mock_simcard_manager_simcard_helper.js');
requireApp('settings/test/unit/mock_simcard_manager_settings_helper.js');

mocha.globals(['Template', 'SimUIModel', 'SimCardManager',
  'SimSettingsHelper', 'MobileOperator', 'localize']);

suite('SimCardManager > ', function() {
  var realL10n;
  var realTemplate;
  var realSimUIModel;
  var realSimSettingsHelper;
  var realMozMobileConnections;
  var realMozIccManager;
  var realMozSettings;
  var realMobileOperator;
  var realLocalize;
  var stubById;

  suiteSetup(function(done) {
    realL10n = window.navigator.mozL10n;

    // dont exec the init so quick
    MockL10n.ready = function() {};
    window.navigator.mozL10n = MockL10n;

    realLocalize = window.localize;
    window.localize = MockL10n.localize;

    realTemplate = window.Template;
    window.Template = MockTemplate;

    realSimUIModel = window.SimUIModel;
    window.SimUIModel = MockSimUIModel;

    realSimSettingsHelper = window.SimSettingsHelper;
    window.SimSettingsHelper = MockSimSettingsHelper;

    realMobileOperator = window.MobileOperator;
    window.MobileOperator = MockMobileOperator;

    // add a mobile connection to make it DSDS
    MockNavigatorMozMobileConnections.mAddMobileConnection();
    realMozMobileConnections = window.navigator.mozMobileConnections;
    window.navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

    realMozIccManager = window.navigator.mozIccManager;
    window.navigator.mozIccManager = MockNavigatorMozIccManager;

    realMozSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;

    stubById = sinon.stub(document, 'getElementById', function(key) {

      // NOTE
      // you can see that we will spy / stub our returned domElement
      // so that we can make sure they are called and called with
      // right arguments later for testing.

      // because select dom can use .add method,
      // we have to create a select element for it
      if (key.match(/-select/)) {
        var spySelect = document.createElement('select');
        sinon.spy(spySelect, 'addEventListener');

        return spySelect;
      } else if (key.match(/card-container/)) {

        // because we will use querySelector in a dom element,
        // we have to stub it and create a fake one
        var stubOutterDiv = document.createElement('div');
        var spyInnerDiv = document.createElement('div');

        sinon.spy(spyInnerDiv, 'addEventListener');
        sinon.stub(stubOutterDiv, 'querySelector', function() {
          return spyInnerDiv;
        });

        return stubOutterDiv;
      } else {
        return document.createElement('div');
      }
    });

    requireApp('settings/js/simcard_manager.js', done);
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
    window.localize = realLocalize;
    window.Template = realTemplate;
    window.SimUIModel = realSimUIModel;
    window.SimSettingsHelper = realSimSettingsHelper;
    window.navigator.mozIccManager = realMozIccManager;
    window.MobileOperator = realMobileOperator;
    // remove a mobile connection before reassign a real one
    window.navigator.mozMobileConnections.mRemoveMobileConnection();
    window.navigator.mozMobileConnections = realMozMobileConnections;
    window.navigator.mozSettings = realMozSettings;
    stubById.restore();
  });


  // add test below
  suite('init > ', function() {

    setup(function(done) {
      // we need them for later testing
      this.sinon.spy(SimCardManager, 'setAllElements');
      this.sinon.stub(SimCardManager, 'initSimCardsInfo');
      this.sinon.stub(SimCardManager, 'initSimCardManagerUI');
      this.sinon.stub(SimCardManager, 'addChangeEventOnIccs');
      this.sinon.stub(SimCardManager, 'addAirplaneModeChangeEvent');
      SimCardManager.init();
      setTimeout(done);
    });

    test('is event binded successfully', function() {
      var outgoingCall =
        SimCardManager.simManagerOutgoingCallSelect;
      var outgoingMessages =
        SimCardManager.simManagerOutgoingMessagesSelect;
      var outgoingData =
        SimCardManager.simManagerOutgoingDataSelect;

      assert.equal(outgoingCall.addEventListener.lastCall.args[0],
        'change');
      assert.equal(outgoingMessages.addEventListener.lastCall.args[0],
        'change');
      assert.equal(outgoingData.addEventListener.lastCall.args[0],
        'change');
    });

    test('is UI inited successfully', function() {
      assert.isTrue(SimCardManager.setAllElements.called);
      assert.isTrue(SimCardManager.initSimCardsInfo.called);
      assert.isTrue(SimCardManager.initSimCardManagerUI.called);
      assert.isTrue(SimCardManager.addChangeEventOnIccs.called);
      assert.isTrue(SimCardManager.addAirplaneModeChangeEvent.called);
    });
  });

  suite('initSimCardsInfo > ', function() {
    setup(function() {
      this.sinon.stub(SimCardManager, 'updateCardState');
      SimCardManager.initSimCardsInfo();
    });
    test('simcards info are inited', function() {
      assert.equal(SimCardManager.simcards.length,
        window.navigator.mozMobileConnections.length);
      assert.isTrue(SimCardManager.updateCardState.called);
    });
  });

  suite('updateCardState > ', function() {
    var fakeRightIccId = '12345';

    setup(function() {
      // make sure we will reset all state before testing
      SimCardManager.simcards[0]._state = '';
    });

    suiteTeardown(function() {
      // reset when leaving
      SimCardManager.simcards[0]._state = '';
    });

    suite('no iccId, we can\'t get icc instance > ', function() {
      setup(function() {
        SimCardManager.updateCardState(0, undefined);
      });
      test('simcard will be nosim', function() {
        assert.equal(SimCardManager.simcards[0]._state, 'nosim');
      });
    });

    suite('in airplane mode, we will make UI nosim > ', function() {
      setup(function() {
        SimCardManager.isAirplaneMode = true;
        SimCardManager.updateCardState(0, fakeRightIccId);
      });
      test('simcard will be nosim', function() {
        assert.equal(SimCardManager.simcards[0]._state, 'nosim');
      });
    });

    suite('not in airplane mode and with right iccId > ', function() {
      setup(function() {
        SimCardManager.isAirplaneMode = false;
        SimCardManager.updateCardState(0, fakeRightIccId);
      });
      test('simcard will be normal', function() {
        assert.equal(SimCardManager.simcards[0]._state, 'normal');
      });
    });

    suite('not in airplane mode and with right iccId but locked > ',
      function() {
        var fakeLockedIccId = '123456789';

        suiteSetup(function() {
          window.navigator.mozIccManager.addIcc(fakeLockedIccId, {
            'cardState' : 'pinRequired'
          });
        });

        suiteTeardown(function() {
          window.navigator.mozIccManager.removeIcc(fakeLockedIccId);
        });

        setup(function() {
          SimCardManager.isAirplaneMode = false;
          SimCardManager.updateCardState(0, fakeLockedIccId);
        });

        test('simcard will be locked', function() {
          assert.equal(SimCardManager.simcards[0]._state, 'locked');
        });
    });
  });

  suite('getSim related methods > ', function() {
    var originalSimCards;

    // don't override our internal variables
    suiteSetup(function() {
      originalSimCards = SimCardManager.simcards;
    });

    suiteTeardown(function() {
      SimCardManager.simcards = originalSimCards;
    });

    setup(function() {
      initCards(2);
    });

    suite('getSimCardsCount > ', function() {
      suite('empty cards', function() {
        setup(function() {
          SimCardManager.simcards = [];
        });
        test('empty cards return correctly', function() {
          assert.equal(SimCardManager.getSimCardsCount(), 0);
        });
      });

      suite('2 cards', function() {
        test('2 card returns correctly', function() {
          assert.equal(SimCardManager.getSimCardsCount(), 2);
        });
      });
    });

    suite('getSimCardInfo > ', function() {
      test('getSimCardInfo(0) correctly', function() {
        assert.isObject(SimCardManager.getSimCardInfo(0));
      });
      test('getSimCardInfo(1) correctly', function() {
        assert.isObject(SimCardManager.getSimCardInfo(1));
      });
    });

    test('getSimCard', function() {
      test('getSimCard(0) correctly', function() {
        assert.isObject(SimCardManager.getSimCard(0));
      });
      test('getSimCard(1) correctly', function() {
        assert.isObject(SimCardManager.getSimCard(1));
      });
    });
  });

  suite('updateSimCardsUI > ', function() {

    setup(function() {
      this.sinon.stub(SimCardManager, 'updateSimCardUI').returns();
    });

    suite('with 1 card', function() {
      setup(function() {
        initCards(1);
        SimCardManager.updateSimCardsUI();
      });

      test('call updateSimCardUI once', function() {
        assert.ok(SimCardManager.updateSimCardUI.calledOnce);
      });
    });

    suite('with 2 cards', function() {
      setup(function() {
        initCards(2);
        SimCardManager.updateSimCardsUI();
      });

      test('call updateSimCardUI twice', function() {
        assert.ok(SimCardManager.updateSimCardUI.calledTwice);
      });
    });
  });

  suite('updateSimCardUI > ', function() {
    var realSimCardContainer;

    // we will use this to track how many doms got updated
    var calledDoms = [];
    var cardDom;
    var nameDom;
    var numberDom;
    var operatorDom;

    var defaultName = 'card';
    var defaultNumber = '0123456789';
    var defaultOperator = 'Taiwan telecom';

    var defaultCardSelector = '.sim-card-0';
    var defaultNameSelector = '.sim-card-0 .sim-card-name';
    var defaultNumberSelector = '.sim-card-0 .sim-card-number';
    var defaultOperatorSelector = '.sim-card-0 .sim-card-operator';

    suiteSetup(function() {
      initCards(1);

      realSimCardContainer = SimCardManager.simCardContainer;
      Object.defineProperty(SimCardManager, 'simCardContainer', {
        value: {
          querySelector: function(selector) {
            var dom;

            if (selector.match(/checkbox/g)) {
              dom = document.createElement('input');
              dom.type = 'checkbox';
            } else {
              dom = document.createElement('div');
            }
            dom.dataset.selector = selector;
            calledDoms.push(dom);
            return dom;
          }
        }
      });
    });

    suiteTeardown(function() {
      SimCardManager.simCardContainer = realSimCardContainer;
    });

    setup(function() {
      SimCardManager.updateSimCardUI(0);

      cardDom = calledDoms[0];
      nameDom = calledDoms[1];
      numberDom = calledDoms[2];
      operatorDom = calledDoms[3];
    });

    test('cardDom is queried correctly', function() {
      assert.equal(cardDom.dataset.selector, defaultCardSelector);
    });

    test('name is queried correctly', function() {
      assert.equal(nameDom.dataset.selector, defaultNameSelector);
    });

    test('number is queried correctly', function() {
      assert.equal(numberDom.dataset.selector, defaultNumberSelector);
    });

    test('operator is queried correctly', function() {
      assert.equal(operatorDom.dataset.selector, defaultOperatorSelector);
    });

    test('cardDom maps to the right class', function() {
      // reflecting to default MockSimCard status
      var cardDomStatus = cardDom.classList.toString();

      assert.isTrue(/enabled/.test(cardDomStatus));
      assert.isFalse(/absent/.test(cardDomStatus));
      assert.isFalse(/locked/.test(cardDomStatus));
    });

    test('name is updated correctly', function() {
      assert.equal(nameDom.textContent, defaultName);
    });

    test('number is updated correctly', function() {
      assert.equal(numberDom.textContent, defaultNumber);
    });

    test('operator is updated correctly', function() {
      assert.equal(operatorDom.textContent, defaultOperator);
    });

  });

  suite('setAllElements > ', function() {
    suiteSetup(function() {
      SimCardManager.setAllElements();
    });
    test('setAllElements can be called successfully', function() {
      var keys = [
        'simCardContainer',
        'simCardTmpl',
        'simManagerOutgoingCallSelect',
        'simManagerOutgoingCallDesc',
        'simManagerOutgoingMessagesSelect',
        'simManagerOutgoingMessagesDesc',
        'simManagerOutgoingDataSelect',
        'simManagerOutgoingDataDescNew'
      ];

      keys.forEach(function(key) {
        assert.isDefined(SimCardManager[key]);
      });
    });
  });

  suite('initSimCardManagerUI > ', function() {
    setup(function() {
      this.sinon.stub(SimCardManager, 'initSimCardsUI');
      this.sinon.stub(SimCardManager, 'initSelectOptionsUI');
      this.sinon.stub(SimCardManager, 'updateSimCardsUI');
      this.sinon.stub(SimCardManager, 'updateSimSecurityUI');
      SimCardManager.initSimCardManagerUI();
    });
    test('all related methods are exectued', function() {
      assert.ok(SimCardManager.initSimCardsUI.called);
      assert.ok(SimCardManager.initSelectOptionsUI.called);
      assert.ok(SimCardManager.updateSimCardsUI.called);
      assert.ok(SimCardManager.updateSimSecurityUI.called);
    });
  });

  suite('initSimCardsUI > ', function() {
    setup(function() {
      SimCardManager.initSimCardsUI();
    });
    test('simCardContainer has inner nodes', function() {
      assert.isDefined(SimCardManager.simCardContainer.innerHTML);
    });
  });

  suite('updateSimSecurityUI > ', function() {
    suiteSetup(function() {
      initCards(2);
    });
    suite('two sims are absent and not in airplane mode > ', function() {
      setup(function() {
        SimCardManager.simcards[0].absent = true;
        SimCardManager.simcards[1].absent = true;
        SimCardManager.isAirplaneMode = false;
        SimCardManager.isAirplaneMode = false;
        SimCardManager.updateSimSecurityUI();
      });
      test('we will hide simSecurity', function() {
        assert.equal('true',
          SimCardManager.simManagerSecurityEntry.getAttribute('aria-disabled'));
      });
    });
    suite('two sims are absent but in airplane mode > ', function() {
      setup(function() {
        SimCardManager.simcards[0].absent = true;
        SimCardManager.simcards[1].absent = true;
        SimCardManager.isAirplaneMode = true;
        SimCardManager.isAirplaneMode = true;
        SimCardManager.updateSimSecurityUI();
      });
      test('we will hide simSecurity', function() {
        assert.equal('true',
          SimCardManager.simManagerSecurityEntry.getAttribute('aria-disabled'));
      });
    });
    suite('one sim is absent but in airplane mode > ', function() {
      setup(function() {
        SimCardManager.simcards[0].absent = false;
        SimCardManager.simcards[1].absent = true;
        SimCardManager.isAirplaneMode = true;
        SimCardManager.isAirplaneMode = true;
        SimCardManager.updateSimSecurityUI();
      });
      test('we will hide simSecurity', function() {
        assert.equal('true',
          SimCardManager.simManagerSecurityEntry.getAttribute('aria-disabled'));
      });
    });
    suite('one sim is absent but not in airplane mode > ', function() {
      setup(function() {
        SimCardManager.simcards[0].absent = false;
        SimCardManager.simcards[1].absent = true;
        SimCardManager.isAirplaneMode = false;
        SimCardManager.isAirplaneMode = false;
        SimCardManager.updateSimSecurityUI();
      });
      test('we will show simSecurity', function() {
        assert.equal('false',
          SimCardManager.simManagerSecurityEntry.getAttribute('aria-disabled'));
      });
    });
  });

  // helpers
  function initCards(count) {
    SimCardManager.simcards = [];
    for (var i = 0; i < count; i++) {
      var card = new SimUIModel(i);
      SimCardManager.simcards.push(card);
    }
  }
});
