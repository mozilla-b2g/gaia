/* global MockNavigatorMozMobileConnections, MockNavigatorMozIccManager,
   MockL10n*/
'use strict';

requireApp(
  'settings/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
requireApp(
  'settings/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
requireApp(
  'settings/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_l10n.js');

suite('SimCardManager > ', function() {
  var realL10n;
  var realMozMobileConnections;
  var realMozIccManager;
  var mockSimSettingsHelper;
  var mockAirplaneModeHelper;
  var mockMobileOperator;
  var mockSimUIModel;
  var simcardManager;
  var map = {
    '*': {
      'shared/sim_settings_helper': 'shared_mocks/mock_sim_settings_helper',
      'shared/airplane_mode_helper': 'unit/mock_airplane_mode_helper',
      'shared/mobile_operator': 'shared_mocks/mock_mobile_operator',
      'panels/simcard_manager/sim_ui_model': 'unit/mock_sim_ui_model'
    }
  };

  suiteSetup(function() {
    realMozMobileConnections = window.navigator.mozMobileConnections;
    window.navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

    realMozIccManager = window.navigator.mozIccManager;
    window.navigator.mozIccManager = MockNavigatorMozIccManager;

    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    window.navigator.mozMobileConnections = realMozMobileConnections;
    window.navigator.mozIccManager = MockNavigatorMozIccManager;
    window.navigator.mozL10n = MockL10n;
  });

  setup(function(done) {
    // add a mobile connection to make it DSDS
    MockNavigatorMozMobileConnections.mAddMobileConnection();

    testRequire([
      'shared_mocks/mock_sim_settings_helper',
      'unit/mock_airplane_mode_helper',
      'shared_mocks/mock_mobile_operator',
      'unit/mock_sim_ui_model',
      'panels/simcard_manager/simcard_manager'
    ], map, function(MockSimSettingsHelper,
      MockAirplaneModeHelper, MockMobileOperator, MockSimUIModel,
      SimcardManager) {

      mockSimSettingsHelper = MockSimSettingsHelper;
      mockAirplaneModeHelper = MockAirplaneModeHelper;
      mockMobileOperator = MockMobileOperator;
      mockSimUIModel = MockSimUIModel;

      simcardManager = new SimcardManager({
        simCardContainer: document.createElement('div'),
        simCardTmpl: document.createElement('div'),
        simSettingsHeader: document.createElement('header'),
        simSettingsList: document.createElement('ul'),
        outgoingCallSelect: document.createElement('select'),
        outgoingMessagesSelect: document.createElement('select'),
        outgoingDataSelect: document.createElement('select')
      });
      done();
    });
  });

  teardown(function() {
    MockNavigatorMozMobileConnections.mTeardown();
  });

  suite('_addOutgoingDataSelectEvent > ', function() {
    var select;

    function triggerEventOnSelect(evtName) {
      if (select.addEventListener.withArgs(evtName)) {
        var cb = select.addEventListener.withArgs(evtName).args[0][1];
        cb.call(select);
      }
    }

    setup(function() {
      select = simcardManager._elements.outgoingDataSelect;

      // inject options into select element
      [0, 1].forEach(function(index) {
        var option = document.createElement('option');
        option.text = index;
        option.value = index;
        if (index === 0) {
          option.selected = true;
        }
        select.add(option);
      });

      this.sinon.stub(select, 'addEventListener');
      this.sinon.stub(mockSimSettingsHelper, 'setServiceOnCard');
      simcardManager._addOutgoingDataSelectEvent();
    });

    suite('if there is no change in option', function() {
      setup(function() {
        this.sinon.stub(window, 'confirm', function() {
          return false;
        });

        triggerEventOnSelect('focus');
        select.selectedIndex = 0;
        triggerEventOnSelect('blur');
      });
      test('nothing happened', function() {
        assert.isFalse(mockSimSettingsHelper.setServiceOnCard.called);
      });
    });

    suite('if option is changed, but users don\'t confirm it', function() {
      setup(function() {
        this.sinon.stub(window, 'confirm', function() {
          return false;
        });

        triggerEventOnSelect('focus');
        select.selectedIndex = 1;
        triggerEventOnSelect('blur');
      });
      test('we would set the select back to original value', function() {
        assert.equal(select.selectedIndex, 0);
        assert.isFalse(mockSimSettingsHelper.setServiceOnCard.called);
      });
    });

    suite('if option is chagned, and users confirm it', function() {
      setup(function() {
        this.sinon.stub(window, 'confirm', function() {
          return true;
        });

        triggerEventOnSelect('focus');
        select.selectedIndex = 1;
        triggerEventOnSelect('blur');
      });
      test('we would set cardIndex on mozSettings', function() {
        assert.equal(select.selectedIndex, 1);
        assert.isTrue(mockSimSettingsHelper.setServiceOnCard.called);
      });
    });
  });

  suite('init > ', function() {
    setup(function() {
      // we need them for later testing
      this.sinon.stub(simcardManager, '_initSimCardsInfo');
      this.sinon.stub(simcardManager, '_initSimCardManagerUI');
      this.sinon.stub(simcardManager, '_addCardStateChangeEventOnIccs');
      this.sinon.stub(simcardManager, '_addAirplaneModeChangeEvent');
      this.sinon.stub(simcardManager, '_addVoiceChangeEventOnConns');
      this.sinon.stub(simcardManager, '_addOutgoingDataSelectEvent');
      this.sinon.stub(simcardManager._elements.outgoingCallSelect,
        'addEventListener');
      this.sinon.stub(simcardManager._elements.outgoingMessagesSelect,
        'addEventListener');
      simcardManager.init();
    });

    test('is event binded successfully', function() {
      var outgoingCall =
        simcardManager._elements.outgoingCallSelect;
      var outgoingMessages =
        simcardManager._elements.outgoingMessagesSelect;

      assert.equal(outgoingCall.addEventListener.lastCall.args[0],
        'change');
      assert.equal(outgoingMessages.addEventListener.lastCall.args[0],
        'change');
    });

    test('is UI inited successfully', function() {
      assert.isTrue(simcardManager._initSimCardsInfo.called);
      assert.isTrue(simcardManager._initSimCardManagerUI.called);
      assert.isTrue(simcardManager._addCardStateChangeEventOnIccs.called);
      assert.isTrue(simcardManager._addAirplaneModeChangeEvent.called);
      assert.isTrue(simcardManager._addVoiceChangeEventOnConns.called);
    });
  });

  suite('_initSimCardsInfo > ', function() {
    setup(function() {
      this.sinon.stub(simcardManager, '_updateCardState');
      simcardManager._initSimCardsInfo();
    });

    test('simcards info are inited', function() {
      assert.equal(simcardManager._simcards.length,
        window.navigator.mozMobileConnections.length);
      assert.isTrue(simcardManager._updateCardState.called);
    });
  });

  suite('_updateCardState > ', function() {
    var fakeRightIccId = '12345';

    setup(function() {
      initCards(1);
      simcardManager._simcards[0]._state = '';
    });

    suite('no iccId, we can\'t get icc instance > ', function() {
      setup(function() {
        simcardManager._updateCardState(0, undefined);
      });

      test('simcard will be nosim', function() {
        assert.equal(simcardManager._simcards[0]._state, 'nosim');
      });
    });

    suite('in airplane mode, we will make UI nosim > ', function() {
      setup(function() {
        simcardManager._isAirplaneMode = true;
        simcardManager._updateCardState(0, fakeRightIccId);
      });

      test('simcard will be nosim', function() {
        assert.equal(simcardManager._simcards[0]._state, 'nosim');
      });
    });

    suite('not in airplane mode and with right iccId > ', function() {
      setup(function() {
        simcardManager._isAirplaneMode = false;
        simcardManager._updateCardState(0, fakeRightIccId);
      });

      test('simcard will be normal', function() {
        assert.equal(simcardManager._simcards[0]._state, 'normal');
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
          simcardManager._isAirplaneMode = false;
          simcardManager._updateCardState(0, fakeLockedIccId);
        });

        test('simcard will be locked', function() {
          assert.equal(simcardManager._simcards[0]._state, 'locked');
        });
    });
  });

  suite('_getSim related methods > ', function() {
    setup(function() {
      initCards(2);
    });

    suite('getSimCardsCount > ', function() {
      suite('empty cards', function() {
        setup(function() {
          simcardManager._simcards = [];
        });

        test('empty cards return correctly', function() {
          assert.equal(simcardManager._getSimCardsCount(), 0);
        });
      });

      suite('2 cards', function() {
        test('2 card returns correctly', function() {
          assert.equal(simcardManager._getSimCardsCount(), 2);
        });
      });
    });

    suite('getSimCardInfo > ', function() {
      test('getSimCardInfo(0) correctly', function() {
        assert.isObject(simcardManager._getSimCardInfo(0));
      });

      test('getSimCardInfo(1) correctly', function() {
        assert.isObject(simcardManager._getSimCardInfo(1));
      });
    });

    suite('getSimCard', function() {
      test('getSimCard(0) correctly', function() {
        assert.isObject(simcardManager._getSimCard(0));
      });

      test('getSimCard(1) correctly', function() {
        assert.isObject(simcardManager._getSimCard(1));
      });
    });
  });

  suite('_updateSimCardUI > ', function() {
    // we will use this to track how many doms got updated
    var calledDoms = [];
    var cardDom;
    var nameDom;
    var numberDom;
    var operatorDom;

    var defaultName = {
      id: 'simWithIndex',
      args: {
        index: 1
      }
    };
    var defaultNumber = '0123456789';
    var defaultOperator = 'Taiwan telecom';
    var defaultCardSelector = '.sim-card-0';
    var defaultNameSelector = '.sim-card-0 .sim-card-name';
    var defaultNumberSelector = '.sim-card-0 .sim-card-number';
    var defaultOperatorSelector = '.sim-card-0 .sim-card-operator';

    setup(function() {
      initCards(1);
      Object.defineProperty(simcardManager._elements, 'simCardContainer', {
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

      simcardManager._updateSimCardUI(0);
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
      assert.equal(nameDom.getAttribute('data-l10n-id'), defaultName.id);
    });

    test('number is updated correctly', function() {
      assert.equal(numberDom.textContent, defaultNumber);
    });

    test('operator is updated correctly', function() {
      assert.equal(operatorDom.textContent, defaultOperator);
    });
  });

  suite('_initSimCardManagerUI > ', function() {
    setup(function() {
      this.sinon.stub(simcardManager, '_initSimCardsUI');
      this.sinon.stub(simcardManager, '_updateSelectOptionsUI');
      this.sinon.stub(simcardManager, '_updateSimCardsUI');
      this.sinon.stub(simcardManager, '_updateSimSettingsUI');
      simcardManager._initSimCardManagerUI();
    });

    test('all related methods are exectued', function() {
      assert.ok(simcardManager._initSimCardsUI.called);
      assert.ok(simcardManager._updateSelectOptionsUI.called);
      assert.ok(simcardManager._updateSimCardsUI.called);
      assert.ok(simcardManager._updateSimSettingsUI.called);
    });
  });

  suite('_updateSelectOptionUI > ', function() {
    var selectedIndex = 1;
    var fakeSelect;

    setup(function() {
      initCards(2);
      simcardManager._simcards[0]._absent = false;
      simcardManager._simcards[1]._absent = false;
      fakeSelect = document.createElement('select');
    });

    test('if storageKey is outgoingCall, we would add "always ask" option',
      function() {
        simcardManager._updateSelectOptionUI('outgoingCall',
          selectedIndex, fakeSelect);
        assert.equal(fakeSelect.length, 3);
    });

    test('if storageKey is outgoingMessages, we would add "always ask" option',
      function() {
        simcardManager._updateSelectOptionUI('outgoingMessages',
          selectedIndex, fakeSelect);
        assert.equal(fakeSelect.length, 3);
    });

    test('if storageKey is outgoingData, we won\'t add "always ask" option',
      function() {
        simcardManager._updateSelectOptionUI('outgoingData',
          selectedIndex, fakeSelect);
        assert.equal(fakeSelect.length, 2);
    });
  });

  suite('_updateSimSettingsUI > ', function() {
    setup(function() {
      initCards(2);
    });

    suite('two sims are absent and not in airplane mode > ', function() {
      setup(function() {
        simcardManager._simcards[0]._absent = true;
        simcardManager._simcards[1]._absent = true;
        simcardManager._isAirplaneMode = false;
        simcardManager._isAirplaneMode = false;
        simcardManager._updateSimSettingsUI();
      });

      test('we will hide sim settings section', function() {
        assert.isTrue(simcardManager._elements.simSettingsHeader.hidden);
        assert.isTrue(simcardManager._elements.simSettingsList.hidden);
      });
    });

    suite('two sims are absent but in airplane mode > ', function() {
      setup(function() {
        simcardManager._simcards[0]._absent = true;
        simcardManager._simcards[1]._absent = true;
        simcardManager._isAirplaneMode = true;
        simcardManager._isAirplaneMode = true;
        simcardManager._updateSimSettingsUI();
      });

      test('we will hide sim settings section', function() {
        assert.isTrue(simcardManager._elements.simSettingsHeader.hidden);
        assert.isTrue(simcardManager._elements.simSettingsList.hidden);
      });
    });

    suite('one sim is absent but in airplane mode > ', function() {
      setup(function() {
        simcardManager._simcards[0]._absent = false;
        simcardManager._simcards[1]._absent = true;
        simcardManager._isAirplaneMode = true;
        simcardManager._isAirplaneMode = true;
        simcardManager._updateSimSettingsUI();
      });
      test('we will hide sim settings section', function() {
        assert.isTrue(simcardManager._elements.simSettingsHeader.hidden);
        assert.isTrue(simcardManager._elements.simSettingsList.hidden);
      });
    });

    suite('one sim is absent but not in airplane mode > ', function() {
      setup(function() {
        simcardManager._simcards[0]._absent = false;
        simcardManager._simcards[1]._absent = true;
        simcardManager._isAirplaneMode = false;
        simcardManager._isAirplaneMode = false;
        simcardManager._updateSimSettingsUI();
      });
      test('we will show sim settings section', function() {
        assert.isFalse(simcardManager._elements.simSettingsHeader.hidden);
        assert.isFalse(simcardManager._elements.simSettingsList.hidden);
      });
    });
  });

  suite('We can change options when simcard is blocked', function() {
    var fakeLockedIccId = '123456789';

    setup(function() {
      sinon.stub(simcardManager, '_updateCardStateWithUI');
      sinon.stub(simcardManager, '_updateSelectOptionsUI');

      window.navigator.mozIccManager.addIcc(fakeLockedIccId, {
        'cardState' : 'permanentBlocked'
      });

      simcardManager._addChangeEventOnIccByIccId(fakeLockedIccId);

      var callback = window.navigator.mozIccManager.getIccById(
        fakeLockedIccId
      )._eventListeners.cardstatechange[0];
      callback();
    });

    suiteTeardown(function() {
      window.navigator.mozIccManager.removeIcc(fakeLockedIccId);
    });

    test('change successfully', function() {
      assert.isTrue(simcardManager._updateCardStateWithUI.called);
      assert.isTrue(simcardManager._updateSelectOptionsUI.called);
    });
  });

  // helpers
  function initCards(count) {
    simcardManager.simcards = [];
    for (var i = 0; i < count; i++) {
      var card = mockSimUIModel(i);
      simcardManager._simcards.push(card);
    }
  }
});
