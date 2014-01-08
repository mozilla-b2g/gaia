/* global mocha, MockL10n, MockTemplate, Template,
   MockNavigatorMozIccManager, MockNavigatorMozMobileConnections, SimPinLock,
   MockSimPinDialog
*/
'use strict';

requireApp(
  'settings/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
requireApp(
  'settings/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
requireApp(
  'settings/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('settings/test/unit/mock_l10n.js');
requireApp('settings/test/unit/mock_template.js');
requireApp('settings/test/unit/mock_sim_pin_dialog.js');

mocha.globals(['Template', 'SimPinLock', 'SimPinDialog']);

suite('SimPinLock > ', function() {
  var realL10n;
  var realTemplate;
  var realMozMobileConnections;
  var realMozIccManager;
  var realMozSettings;
  var realSimPinDialog;
  var stubById;

  suiteSetup(function(done) {
    MockL10n.ready = function() {};
    MockL10n._cachedParams = {};
    MockL10n.get = function(key, params) {
      if (!MockL10n._cachedParams[key]) {
        MockL10n._cachedParams[key] = [];
      }
      if (params) {
        MockL10n._cachedParams[key].push(params);
      }
      return key;
    };

    window.navigator.mozL10n = MockL10n;

    realSimPinDialog = window.SimPinDialog;
    window.SimPinDialog = MockSimPinDialog;

    realTemplate = window.Template;
    window.Template = MockTemplate;

    realMozIccManager = window.navigator.mozIccManager;
    window.navigator.mozIccManager = MockNavigatorMozIccManager;

    realMozSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;

    MockNavigatorMozMobileConnections.mAddMobileConnection();
    realMozMobileConnections = window.navigator.mozMobileConnections;
    window.navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

    requireApp('settings/js/simcard_lock.js', done);
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
    window.Template = realTemplate;
    MockNavigatorMozMobileConnections.mTeardown();
    window.navigator.mozMobileConnections = realMozMobileConnections;
    window.navigator.mozIccManager = realMozIccManager;
    window.navigator.mozSettings = realMozSettings;
    window.SimPinDialog = realSimPinDialog;
  });

  // we use dsds for testing by default for each test
  setup(function() {
    this.sinon.stub(window.navigator.mozL10n, 'localize');
    this.sinon.stub(document, 'getElementById', function() {
      return document.createElement('div');
    });
  });

  // we will setAllElements first so that in later
  // case, we can easily access our references
  suite('setAllElements > ', function() {
    setup(function() {
      SimPinLock.setAllElements();
    });

    test('all elements are set well', function() {
      assert.isNotNull(SimPinLock.dialog);
      assert.isNotNull(SimPinLock.simPinTmpl);
      assert.isNotNull(SimPinLock.simPinContainer);
      assert.isNotNull(SimPinLock.simPinBackButton);
      assert.isNotNull(SimPinLock.simSecurityDesc);
    });
  });

  suite('init > ', function() {
    var fakeRightIccId = '12345';
    var fakeWrongIccId = '123';

    setup(function(done) {
      this.sinon.stub(SimPinLock, 'setAllElements');
      this.sinon.stub(SimPinLock, 'initSimPinBackButton');
      this.sinon.stub(SimPinLock, 'initSimPinsUI');
      this.sinon.stub(SimPinLock, 'updateSimPinUI');
      this.sinon.stub(SimPinLock, 'updateSimPinsUI');
      this.sinon.stub(SimPinLock, 'addChangeEventOnIccs');
      this.sinon.stub(SimPinLock, 'addIccDetectedEvent');
      this.sinon.stub(SimPinLock, 'addIccUndetectedEvent');
      this.sinon.stub(SimPinLock, 'addAirplaneModeChangeEvent');
      SimPinLock.init();
      setTimeout(done);
    });

    test('all methods are called', function() {
      assert.ok(SimPinLock.setAllElements.called);
      assert.ok(SimPinLock.initSimPinBackButton.called);
      assert.ok(SimPinLock.initSimPinsUI.called);
      assert.ok(SimPinLock.updateSimPinsUI.called);
      assert.ok(SimPinLock.addChangeEventOnIccs.called);
      assert.ok(SimPinLock.addIccDetectedEvent.called);
      assert.ok(SimPinLock.addIccUndetectedEvent.called);
      assert.ok(SimPinLock.addAirplaneModeChangeEvent.called);
    });
  });

  suite('initSimPinBackButton > ', function() {
    suite('single sim > ', function() {
      setup(function() {
        initConns(1);
        SimPinLock.initSimPinBackButton();
      });
      test('href is #root', function() {
        var href = SimPinLock.simPinBackButton.getAttribute('href');
        assert.equal(href, '#root');
      });
    });
    suite('dual sim > ', function() {
      setup(function() {
        initConns(2);
        SimPinLock.initSimPinBackButton();
      });
      test('href is #sim-manager', function() {
        var href = SimPinLock.simPinBackButton.getAttribute('href');
        assert.equal(href, '#sim-manager');
      });
    });
  });

  suite('initSimPinsUI > ', function() {
    var oldTemplate;

    suiteSetup(function() {
      oldTemplate = SimPinLock.simPinTemplate;
      SimPinLock.simPinTemplate = new Template(SimPinLock.simPinTmpl);
    });

    suiteTeardown(function() {
      SimPinLock.simPinTemplate = oldTemplate;
    });

    suite('in single sim structure', function() {
      setup(function() {
        initConns(1);
        SimPinLock.initSimPinsUI();
      });

      suiteTeardown(function() {
        navigator.mozL10n._cachedParams = {};
      });

      test('init SimPinsUI successfully, we won\'t put SIM [n] PIN on UI',
        function() {
          assert.equal(
            navigator.mozL10n._cachedParams.simPinWithIndex[0].index,
            ''
          );
      });
    });

    suite('in dsds structure', function() {
      suiteSetup(function() {
        initConns(2);
        SimPinLock.initSimPinsUI();
      });

      test('init SimPinsUI successfully', function() {
        assert.isDefined(SimPinLock.simPinContainer.innerHTML);
      });
    });
  });

  suite('updateSimPinUI > ', function() {
    var oldIccManager;
    var oldConns;
    var fakeRightIccId = '12345';
    var fakeWrongIccId = '123';
    var cachedDoms = {};

    suiteSetup(function() {
      oldIccManager = SimPinLock.iccManager;
      oldConns = SimPinLock.conns;

      // because we have no conns now
      // we have to make one first
      SimPinLock.iccManager = window.navigator.mozIccManager;
      SimPinLock.conns = window.navigator.mozMobileConnections;
    });

    suiteTeardown(function() {
      SimPinLock.iccManager = oldIccManager;
      SimPinLock.conns = oldConns;
    });

    setup(function() {
      // clean them at first
      cachedDoms = {};
      // make sure we will return right DOMs
      this.sinon.stub(SimPinLock.simPinContainer, 'querySelector',
        function(key) {
          var dom;
          var type;
          if (key.match(/input/)) {
            dom = document.createElement('input');
            dom.type = 'checkbox';
            type = 'checkbox';
          }
          else {
            dom = document.createElement('div');
            type = 'div';
          }
          cachedDoms[type] = dom;
          return dom;
      });
    });

    suite('icc has no cardState (maybe in airplane mode) > ', function() {
      setup(function() {
        SimPinLock.conns[0].iccId = fakeWrongIccId;
        SimPinLock.updateSimPinUI(0);
      });
      test('checkbox will be disabled and div will be hidden', function() {
        assert.ok(cachedDoms.checkbox.disabled);
        assert.ok(cachedDoms.div.hidden);
      });
    });

    suite('icc has cardState, but not in airplane mode > ', function() {
      setup(function(done) {
        SimPinLock.conns[0].iccId = fakeRightIccId;
        SimPinLock.isAirplaneMode = false;
        SimPinLock.updateSimPinUI(0);
        setTimeout(done);
      });

      test('will get right icc, exec onsuccess() and change UI', function() {
        assert.isFalse(cachedDoms.checkbox.disabled);
        assert.isTrue(cachedDoms.checkbox.checked);
        assert.isFalse(cachedDoms.div.hidden);
      });
    });

    suite('icc has cardState, but in airplane mode > ', function() {
      setup(function(done) {
        SimPinLock.conns[0].iccId = fakeRightIccId;
        SimPinLock.isAirplaneMode = true;
        SimPinLock.updateSimPinUI(0);
        setTimeout(done);
      });

      test('checkbox will be disabled and div will be hidden', function() {
        assert.ok(cachedDoms.checkbox.disabled);
        assert.ok(cachedDoms.div.hidden);
      });
    });
  });

  suite('updateSimPinsUI > ', function() {
    setup(function() {
      initConns(2);
      this.sinon.stub(SimPinLock, 'updateSimPinUI');
      SimPinLock.updateSimPinsUI();
    });

    test('updateSimPinUI got called twice', function() {
      assert.ok(SimPinLock.updateSimPinUI.calledTwice);
    });
  });

  suite('handleEvent > ', function() {
    var oldSimPinDialog;
    var fakeDom = document.createElement('div');
    var fakeEvt = {
      target: fakeDom
    };

    suiteSetup(function() {
      oldSimPinDialog = SimPinLock.simPinDialog;
      SimPinLock.simPinDialog = {
        show: function() { }
      };
    });

    suiteTeardown(function() {
      SimPinLock.simPinDialog = oldSimPinDialog;
    });

    suite('checkSimPin > ', function() {
      setup(function() {
        fakeDom.dataset.type = 'checkSimPin';
        fakeDom.dataset.simIndex = '0';
        this.sinon.stub(SimPinLock, 'checkSimPin');

        SimPinLock.handleEvent(fakeEvt);
      });
      test('called successfully', function() {
        assert.ok(SimPinLock.checkSimPin.called);
      });
    });

    suite('changeSimPin > ', function() {
      setup(function() {
        fakeDom.dataset.type = 'changeSimPin';
        fakeDom.dataset.simIndex = '0';
        this.sinon.stub(SimPinLock.simPinDialog, 'show');
        SimPinLock.handleEvent.call(SimPinLock, fakeEvt);
      });
      test('called successfully', function() {
        assert.ok(SimPinLock.simPinDialog.show.called);
        assert.equal(SimPinLock.simPinDialog.show.args[0][1].cardIndex, '0');
      });
    });
  });

  suite('checkSimPin > ', function() {
    var oldIccManager;
    var oldConns;
    var oldSimPinDialog;
    var fakeIccId = '123456';
    var fakeCheckbox;

    suiteSetup(function() {
      oldIccManager = SimPinLock.iccManager;
      oldConns = SimPinLock.conns;
      oldSimPinDialog = SimPinLock.simPinDialog;

      // because we have no conns now
      // we have to make one first
      SimPinLock.iccManager = window.navigator.mozIccManager;
      SimPinLock.conns = window.navigator.mozMobileConnections;
      SimPinLock.conns[0].iccId = fakeIccId;
      SimPinLock.simPinDialog = {
        show: function() { }
      };
    });

    suiteTeardown(function() {
      SimPinLock.iccManager = oldIccManager;
      SimPinLock.conns = oldConns;
      SimPinLock.simPinDialog = oldSimPinDialog;
    });

    setup(function() {
      this.sinon.stub(SimPinLock, 'updateSimSecurityDescUI');
      this.sinon.stub(SimPinLock, 'updateSimPinUI');
      this.sinon.stub(SimPinLock.simPinDialog, 'show');

      fakeCheckbox = document.createElement('input');
      fakeCheckbox.type = 'checkbox';
    });

    teardown(function() {
      // remove old icc each time to make it as new as possible
      SimPinLock.iccManager.removeIcc(fakeIccId);
    });

    suite('cardState is pukRequired > ', function() {
      setup(function() {
        SimPinLock.iccManager.addIcc(fakeIccId, {
          'cardState': 'pukRequired'
        });
        SimPinLock.checkSimPin(fakeCheckbox, 0);
      });
      test('show unlock_puk action', function() {
        assert.equal(SimPinLock.simPinDialog.show.lastCall.args[0],
          'unlock_puk');

        var onSuccessFunction =
          SimPinLock.simPinDialog.show.lastCall.args[1].onsuccess;

        onSuccessFunction();
        assert.isTrue(SimPinLock.updateSimSecurityDescUI.lastCall.args[0]);
      });
    });

    suite('cardState is ready > ', function() {
      setup(function() {
        SimPinLock.iccManager.addIcc(fakeIccId, {
          'cardState': 'ready'
        });
      });
      suite('checkbox is not checked > ', function() {
        setup(function() {
          fakeCheckbox.checked = false;
          SimPinLock.checkSimPin(fakeCheckbox, 0);
        });
        test('checkbox is not checked, call disable_lock', function() {
          assert.equal(SimPinLock.simPinDialog.show.lastCall.args[0],
            'disable_lock');

          var onSuccessFunction =
            SimPinLock.simPinDialog.show.lastCall.args[1].onsuccess;

          onSuccessFunction();
          assert.isFalse(SimPinLock.updateSimSecurityDescUI.lastCall.args[0]);
        });
      });

      suite('checkbox is checked', function() {
        setup(function() {
          fakeCheckbox.checked = true;
          SimPinLock.checkSimPin(fakeCheckbox, 0);
        });
        test('checkbox is not checked, call enable_lock', function() {
          assert.equal(SimPinLock.simPinDialog.show.lastCall.args[0],
            'enable_lock');

          var onSuccessFunction =
            SimPinLock.simPinDialog.show.lastCall.args[1].onsuccess;

          onSuccessFunction();
          assert.isTrue(SimPinLock.updateSimSecurityDescUI.lastCall.args[0]);
        });
      });
    });
  });

  suite('addChangeEventOnIccs > ', function() {
    var oldIccManager;
    var oldConns;
    var fakeRightIccId = '12345';
    var fakeWrongIccId = '123';

    suiteSetup(function() {
      oldIccManager = SimPinLock.iccManager;
      oldConns = SimPinLock.conns;

      // because we have no conns now
      // we have to make one first
      SimPinLock.iccManager = window.navigator.mozIccManager;
      SimPinLock.conns = window.navigator.mozMobileConnections;
      SimPinLock.conns[0].iccId = fakeRightIccId;
      SimPinLock.conns[1].iccId = fakeWrongIccId;
    });

    suiteTeardown(function() {
      SimPinLock.iccManager = oldIccManager;
      SimPinLock.conns = oldConns;
    });

    suite('one right iccId, one wrong iccId', function() {
      setup(function() {
        this.sinon.stub(SimPinLock, 'addChangeEventOnIccByIccId');
        SimPinLock.addChangeEventOnIccs();
      });
      test('there is only one iccId works', function() {
        assert.ok(SimPinLock.addChangeEventOnIccByIccId.calledOnce);
      });
    });
  });

  suite('addChangeEventOnIccByIccId > ', function() {
    var oldIccManager;
    var fakeRightIccId = '12345';
    var fakeWrongIccId = '123';

    suiteSetup(function() {
      oldIccManager = SimPinLock.iccManager;

      // because we have no conns now
      // we have to make one first
      SimPinLock.iccManager = window.navigator.mozIccManager;
    });

    suiteTeardown(function() {
      SimPinLock.iccManager = oldIccManager;
    });

    setup(function() {
      this.sinon.spy(SimPinLock.iccManager, 'getIccById');
    });

    suite('with wrong iccId > ', function() {
      setup(function() {
        SimPinLock.addChangeEventOnIccByIccId(fakeWrongIccId);
      });

      test('will not register change event', function() {
        var returnValues = SimPinLock.iccManager.getIccById.returnValues;
        assert.isUndefined(returnValues[0]);
      });
    });

    suite('with right iccId > ', function() {
      setup(function() {
        SimPinLock.addChangeEventOnIccByIccId(fakeRightIccId);
      });

      test('will register change event', function() {
        var returnValues = SimPinLock.iccManager.getIccById.returnValues;
        assert.isFunction(returnValues[0]._eventListeners.cardstatechange[0]);
      });
    });
  });

  suite('getCardIndexByIccId > ', function() {
    var oldConns;
    var fakeIccId = '12345';
    var fakeIccId2 = '123456';

    suiteSetup(function() {
      oldConns = SimPinLock.conns;

      // because we have no conns now
      // we have to make one first
      SimPinLock.conns = window.navigator.mozMobileConnections;
      SimPinLock.conns[0].iccId = fakeIccId;
      SimPinLock.conns[1].iccId = fakeIccId2;
    });

    suiteTeardown(function() {
      SimPinLock.conns = oldConns;
    });

    suite('with wrong iccId', function() {
      var cardIndex;
      setup(function() {
        cardIndex = SimPinLock.getCardIndexByIccId('12345678');
      });
      test('wrong iccId will return undefined cardIndex', function() {
        assert.isUndefined(cardIndex);
      });
    });

    suite('with right iccId', function() {
      var cardIndex;
      setup(function() {
        cardIndex = SimPinLock.getCardIndexByIccId(fakeIccId);
      });
      test('right iccId will return right cardIndex', function() {
        assert.equal(cardIndex, 0);
      });
    });
  });

  suite('isSingleSim > ', function() {
    suite('in single sim structure', function() {
      suiteSetup(function() {
        initConns(1);
      });
      test('is single sim', function() {
         assert.ok(SimPinLock.isSingleSim());
      });
    });
    suite('in dsds structure', function() {
      suiteSetup(function() {
        initConns(2);
      });
      test('is not single sim', function() {
        assert.ok(!SimPinLock.isSingleSim());
      });
    });
  });

  suite('updateSimSecurityDescUI > ', function() {
    suite('enabled >', function() {
      setup(function() {
        SimPinLock.updateSimSecurityDescUI(true);
      });
      test('is description with enabled wording', function() {
        assert.equal(window.navigator.mozL10n.localize.args[0][1],
          'enabled');
      });
    });
    suite('disabled >', function() {
      setup(function() {
        SimPinLock.updateSimSecurityDescUI(false);
      });
      test('is description with disabled wording', function() {
        assert.equal(window.navigator.mozL10n.localize.args[0][1],
          'disabled');
      });
    });
  });

  function initConns(count) {
    var conns = window.navigator.mozMobileConnections;
    var connsLength = conns.length;
    for (var i = 0; i < connsLength; i++) {
      window.navigator.mozMobileConnections.mRemoveMobileConnection(0);
    }
    for (var i = 0; i < count; i++) {
      window.navigator.mozMobileConnections.mAddMobileConnection();
    }
  }
});
