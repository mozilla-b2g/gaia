/* global MockL10n */
'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');

suite('SimPin > ', function() {
  var simpin;
  var map = {
    '*': {
      'shared/airplane_mode_helper': 'MockAirplaneModeHelper',
      'shared/simslot_manager': 'MockSIMSlotManager',
      'shared/template': 'MockTemplate',
      'shared/toaster': 'MockToaster',
      'modules/dialog_service': 'MockDialogService',
      'modules/sim_security': 'MockSimSecurity'
    }
  };

  suiteSetup(function() {
    window.navigator.mozL10n = MockL10n;
  });

  setup(function(done) {
    this.MockAirplaneModeHelper = {

    };

    this.MockSIMSlotManager = {
      isMultiSIM: function() {}
    };

    this.MockTemplate = {

    };

    this.MockToaster = {
      showToast: function() {}
    };

    this.MockDialogService = {
      show: function() {
        return Promise.resolve();
      }
    };

    this.MockIccManager = {
      getIccById: function() {}
    };

    this.MockSimSecurity = {
      getCardLock: function() {}
    };

    define('MockAirplaneModeHelper', () => {
      return this.MockAirplaneModeHelper;
    });

    define('MockSIMSlotManager', () => {
      return this.MockSIMSlotManager;
    });

    define('MockTemplate', () => {
      return this.MockTemplate;
    });

    define('MockToaster', () => {
      return this.MockToaster;
    });

    define('MockDialogService', () => {
      return this.MockDialogService;
    });

    define('MockIccManager', () => {
      return this.MockIccManager;
    });

    define('MockSimSecurity', () => {
      return this.MockSimSecurity;
    });

    var requireCtx = testRequire([], map, function() {});
    requireCtx(['panels/simpin/simpin'], (SimPin) => {
      simpin = SimPin({
        dialog: document.createElement('div'),
        simPinTmpl: document.createElement('div'),
        simPinContainer: document.createElement('div'),
        simPinHeader: document.createElement('div')
      });

      simpin.iccManager = this.MockIccManager;
      done();
    });
  });

  suite('initSimPinBack > ', function() {
    suite('single sim > ', function() {
      setup(function() {
        this.sinon.stub(this.MockSIMSlotManager, 'isMultiSIM').returns(false);
        simpin.initSimPinBack();
      });
      test('href is #root', function() {
        var href = simpin._elements.simPinHeader.dataset.href;
        assert.equal(href, '#root');
      });
    });
    suite('dual sim > ', function() {
      setup(function() {
        this.sinon.stub(this.MockSIMSlotManager, 'isMultiSIM').returns(true);
        simpin.initSimPinBack();
      });
      test('href is #sim-manager', function() {
        var href = simpin._elements.simPinHeader.dataset.href;
        assert.equal(href, '#sim-manager');
      });
    });
  });

  suite('initSimPinsUI > ', function() {
    var interpolateSpy;

    setup(function() {
      interpolateSpy = this.sinon.spy();
      simpin.simPinTemplate = {
        interpolate: interpolateSpy
      };
    });

    suite('in single sim structure', function() {
      setup(function() {
        simpin.conns = [{}];
        this.sinon.stub(this.MockSIMSlotManager, 'isMultiSIM').returns(false);

        simpin.initSimPinsUI();
      });

      test('init SimPinsUI successfully, we won\'t put SIM [n] PIN on UI',
        function() {
          var firstCallArgs = interpolateSpy.getCall(0).args[0];
          assert.equal(firstCallArgs['sim-index'], '0');
          assert.equal(firstCallArgs['sim-name'],
            'simPinWithIndex{"index":""}');
          assert.equal(firstCallArgs['change-sim-label'], 'changeSimPin');
      });
    });

    suite('in dsds structure', function() {
      setup(function() {
        simpin.conns = [{}, {}];
        this.sinon.stub(this.MockSIMSlotManager, 'isMultiSIM').returns(true);

        simpin.initSimPinsUI();
      });

      test('init SimPinsUI successfully', function() {
        var firstCallArgs = interpolateSpy.getCall(0).args[0];
        assert.equal(firstCallArgs['sim-index'], '0');
        assert.equal(firstCallArgs['sim-name'],
          'simPinWithIndex{"index":1}');
        assert.equal(firstCallArgs['change-sim-label'], 'changeSimPin');

        var secondCallArgs = interpolateSpy.getCall(1).args[0];
        assert.equal(secondCallArgs['sim-index'], '1');
        assert.equal(secondCallArgs['sim-name'],
          'simPinWithIndex{"index":2}');
        assert.equal(secondCallArgs['change-sim-label'], 'changeSimPin');
      });
    });
  });

  suite('updateSimPinUI > ', function() {
    var cachedDoms = {};

    setup(function() {
      simpin.conns = [{}, {}];

      // clean them at first
      cachedDoms = {};
      // make sure we will return right DOMs
      this.sinon.stub(simpin._elements.simPinContainer, 'querySelector',
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
        this.sinon.stub(this.MockIccManager, 'getIccById').returns({
          cardState: null
        });
        test('checkbox will be disabled, div will be hidden', function(done) {
          simpin.updateSimPinUI(0).then(function() {
            assert.ok(cachedDoms.checkbox.disabled);
            assert.ok(cachedDoms.div.hidden);
          }).then(done, done);
        });
      });
    });

    suite('icc has cardState, but not in airplane mode > ', function() {
      setup(function() {
        this.sinon.stub(this.MockSimSecurity, 'getCardLock', function() {
          return Promise.resolve({
            enabled: true
          });
        });

        this.sinon.stub(this.MockIccManager, 'getIccById').returns({
          cardState: 'normal'
        });

        simpin.isAirplaneMode = false;
      });

      test('will get right icc, and change UI', function(done) {
        simpin.updateSimPinUI(0).then(function() {
          assert.isFalse(cachedDoms.checkbox.disabled);
          assert.isTrue(cachedDoms.checkbox.checked);
          assert.isFalse(cachedDoms.div.hidden);
        }).then(done, done);
      });
    });

    suite('icc has cardState, but in airplane mode > ', function() {
      setup(function() {
        this.sinon.stub(this.MockIccManager, 'getIccById').returns({
          cardState: 'normal'
        });
        simpin.isAirplaneMode = true;
      });

      test('checkbox will be disabled and div will be hidden', function(done) {
        simpin.updateSimPinUI(0).then(function() {
          assert.ok(cachedDoms.checkbox.disabled);
          assert.ok(cachedDoms.div.hidden);
        }).then(done, done);
      });
    });
  });

  suite('changeSimPin > ', function() {
    setup(function() {
      this.sinon.stub(this.MockToaster, 'showToast');
      this.sinon.stub(this.MockDialogService, 'show').returns(
        Promise.resolve({ type: 'submit' }));
    });

    test('in single sim', function(done) {
      this.sinon.stub(this.MockSIMSlotManager, 'isMultiSIM').returns(false);
      simpin.changeSimPin(0).then(() => {
        var toastArgs = this.MockToaster.showToast.getCall(0).args[0];
        assert.equal(toastArgs.messageL10nId, 'simPinChangedSuccessfully');
      }).then(done, done);
    });

    test('in multi sim', function(done) {
      this.sinon.stub(this.MockSIMSlotManager, 'isMultiSIM').returns(true);
      simpin.changeSimPin(0).then(() => {
        var toastArgs = this.MockToaster.showToast.getCall(0).args[0];
        assert.equal(toastArgs.messageL10nId,
          'simPinChangedSuccessfullyWithIndex');
        assert.equal(toastArgs.messageL10nArgs.index, 1);
      }).then(done, done);
    });
  });

  suite('checkSimPin > ', function() {
    var fakeCheckbox = {
      checked: true
    };

    setup(function() {
      simpin.conns = [{}, {}];
      this.sinon.stub(simpin, 'updateSimPinUI');
      fakeCheckbox.checked = true;
    });

    suite('pukRequired >', function() {
      setup(function() {
        this.sinon.stub(this.MockIccManager, 'getIccById').returns({
          cardState: 'pukRequired'
        });
      });

      test('if submit, we will set values', function(done) {
        this.sinon.stub(this.MockDialogService, 'show').returns(
          Promise.resolve({ type: 'submit' }));
        simpin.checkSimPin(fakeCheckbox, 0).then(() => {
          assert.equal(fakeCheckbox.checked, true);
          assert.isTrue(simpin.updateSimPinUI.called);
        }).then(done, done);
      });

      test('if cancel, we will undo operations', function(done) {
        this.sinon.stub(this.MockDialogService, 'show').returns(
          Promise.resolve({ type: 'cancel' }));
        simpin.checkSimPin(fakeCheckbox, 0).then(() => {
          assert.equal(fakeCheckbox.checked, false);
          assert.isTrue(simpin.updateSimPinUI.called);
        }).then(done, done);
      });
    });

    suite('other cardstates with checkbox enabled', function() {
      setup(function() {
        this.sinon.stub(this.MockIccManager, 'getIccById').returns({
          cardState: 'normal'
        });
        fakeCheckbox.checked = true;
      });

      test('if submit, we will do following works', function(done) {
        this.sinon.stub(this.MockDialogService, 'show').returns(
          Promise.resolve({ type: 'submit' }));

        simpin.checkSimPin(fakeCheckbox, 0).then(() => {
          var args = this.MockDialogService.show.getCall(0).args[1];
          assert.equal(args.method, 'enable_lock');
          assert.isTrue(simpin.updateSimPinUI.called);
        }).then(done, done);
      });

      test('if cancel, we will undo operations', function(done) {
        this.sinon.stub(this.MockDialogService, 'show').returns(
          Promise.resolve({ type: 'cancel' }));

        simpin.checkSimPin(fakeCheckbox, 0).then(() => {
          var args = this.MockDialogService.show.getCall(0).args[1];
          assert.equal(args.method, 'enable_lock');
          assert.equal(fakeCheckbox.checked, false);
          assert.isTrue(simpin.updateSimPinUI.called);
        }).then(done, done);
      });
    });

    suite('other cardstates with checkbox disabled', function() {
      setup(function() {
        this.sinon.stub(this.MockIccManager, 'getIccById').returns({
          cardState: 'normal'
        });
        fakeCheckbox.checked = false;
      });

      test('if submit, we will do following works', function(done) {
        this.sinon.stub(this.MockDialogService, 'show').returns(
          Promise.resolve({ type: 'submit' }));

        simpin.checkSimPin(fakeCheckbox, 0).then(() => {
          var args = this.MockDialogService.show.getCall(0).args[1];
          assert.equal(args.method, 'disable_lock');
          assert.isTrue(simpin.updateSimPinUI.called);
        }).then(done, done);
      });

      test('if cancel, we will undo operations', function(done) {
        this.sinon.stub(this.MockDialogService, 'show').returns(
          Promise.resolve({ type: 'cancel' }));

        simpin.checkSimPin(fakeCheckbox, 0).then(() => {
          var args = this.MockDialogService.show.getCall(0).args[1];
          assert.equal(args.method, 'disable_lock');
          assert.equal(fakeCheckbox.checked, true);
          assert.isTrue(simpin.updateSimPinUI.called);
        }).then(done, done);
      });
    });
  });

  suite('addChangeEventOnIccByIccId > ', function() {
    var fakeIcc = {};
    setup(function() {
      fakeIcc.addEventListener = this.sinon.spy();
      this.sinon.stub(this.MockIccManager, 'getIccById').returns(fakeIcc);
      simpin.addChangeEventOnIccByIccId(1234);
    });

    test('with icc', function() {
      assert.ok(fakeIcc.addEventListener.called);
    });
  });

  suite('getCardIndexByIccId > ', function() {
    setup(function() {
      simpin.conns = [{iccId: '123'}, {iccId : '456'}];
    });

    test('with wrong iccId', function() {
      assert.isUndefined(simpin.getCardIndexByIccId('789'));
    });

    test('with right iccId', function() {
      assert.equal(simpin.getCardIndexByIccId('123'), 0);
    });
  });
});
