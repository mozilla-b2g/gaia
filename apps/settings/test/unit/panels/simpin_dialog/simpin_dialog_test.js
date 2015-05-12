/* global MockL10n */
'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');

suite('SimPinDialog > ', function() {

  var simPinDialog;
  var mockSettingsUtils;
  var mockDialogService;

  var modules = [
    'panels/simpin_dialog/simpin_dialog',
    'modules/settings_utils',
    'modules/dialog_service'
  ];

  var map = {
    '*': {
      'modules/settings_utils': 'unit/mock_settings_utils',
      'modules/dialog_service': 'MockDialogService'
    }
  };
  
  setup(function(done) {
    define('MockDialogService', function() {
      return {
        alert: function() {}
      };
    });

    window.navigator.mozL10n = MockL10n;

    var requireCtx = testRequire([], map, function() {});
    requireCtx(modules, function(SimPinDialog, MockSettingsUtils,
      MockDialogService) {
        mockSettingsUtils = MockSettingsUtils;
        mockDialogService = MockDialogService;

        simPinDialog = new SimPinDialog({
          pinInput: createInput(),
          pukInput: createInput(),
          newPinInput: createInput(),
          confirmPinInput: createInput(),
          dialogDone: createButton()
        });
        done();
    });
  });

  suite('_handleCardLockError > ', function() {
    test('if no lockType, close dialog', function() {
      var needToCloseDialog = simPinDialog._handleCardLockError({
        lockType: '',
        error: {
          retryCount: 3
        }
      });
      assert.isTrue(needToCloseDialog);
    });

    test('if retryCount is not less equal than 0, show message', function() {
      this.sinon.stub(simPinDialog, '_showMessage');
      this.sinon.stub(simPinDialog, '_showRetryCount');
      var needToCloseDialog = simPinDialog._handleCardLockError({
        lockType: 'pin',
        error: {
          name: 'IncorrectPassword',
          retryCount: 4
        }
      });

      assert.isFalse(needToCloseDialog);
      assert.isTrue(simPinDialog._showMessage.called);
      assert.isTrue(simPinDialog._showRetryCount.called);
    });

    test('if retryCount is 0 and the lockType is pin, close ' +
      'dialog and leave this to system app', function() {
        var needToCloseDialog = simPinDialog._handleCardLockError({
          lockType: 'pin',
          error: {
            name: 'IncorrectPassword',
            retryCount: 0
          }
        });
        assert.isTrue(needToCloseDialog);
    });

    ['fdn', 'pin2'].forEach(function(lockType) {
      test('if retryCount is 0 and the lockType is ' + lockType +
        ', we will ask users to put puk2', function() {
          this.sinon.stub(simPinDialog, '_initUI');
          var needToCloseDialog = simPinDialog._handleCardLockError({
            lockType: lockType,
            error: {
              name: 'IncorrectPassword',
              retryCount: 0
            }
          });
          assert.isFalse(needToCloseDialog);
          assert.isTrue(simPinDialog._initUI.calledWith('unlock_puk2'));
      });
    });

    test('if retryCount is 0 and the lockType is un-recognizable,' +
      'then we will just close the dialog', function() {
        var needToCloseDialog = simPinDialog._handleCardLockError({
          lockType: 'i_dont_know',
          error: {
            retryCount: 0
          }
        });
        assert.isTrue(needToCloseDialog);
    });
  });

  suite('_updateDoneButtonState > ', function() {
    test('in change_pin mode, but length of pinInput is less than 4',
      function() {
        simPinDialog._mode = 'change_pin';
        simPinDialog._elements.pinInput.value = '1';
        simPinDialog._updateDoneButtonState();
        assert.isTrue(simPinDialog._elements.dialogDone.disabled);
    });

    test('in change_pin mode, but length of newPinInput is less than 4',
      function() {
        simPinDialog._mode = 'change_pin';
        simPinDialog._elements.pinInput.value = '1234';
        simPinDialog._elements.newPinInput.value = '1';
        simPinDialog._updateDoneButtonState();
        assert.isTrue(simPinDialog._elements.dialogDone.disabled);
    });

    test('in change_pin mode, but length of confirmPinInput is less than 4',
      function() {
        simPinDialog._mode = 'change_pin';
        simPinDialog._elements.pinInput.value = '1234';
        simPinDialog._elements.newPinInput.value = '5678';
        simPinDialog._elements.confirmPinInput.value = '1';
        simPinDialog._updateDoneButtonState();
        assert.isTrue(simPinDialog._elements.dialogDone.disabled);
    });

    test('in change_pin mode, ' +
      'but length of confirmPinInput & newPinInput is different', function() {
        simPinDialog._mode = 'change_pin';
        simPinDialog._elements.pinInput.value = '1234';
        simPinDialog._elements.newPinInput.value = '5678';
        simPinDialog._elements.confirmPinInput.value = '567';
        simPinDialog._updateDoneButtonState();
        assert.isTrue(simPinDialog._elements.dialogDone.disabled);
    });

    test('in change_pin mode, ' +
      'and length of confirmPinInput & newPinInput is the same', function() {
        simPinDialog._mode = 'change_pin';
        simPinDialog._elements.pinInput.value = '1234';
        simPinDialog._elements.newPinInput.value = '5678';
        simPinDialog._elements.confirmPinInput.value = '5679';
        simPinDialog._updateDoneButtonState();
        assert.isFalse(simPinDialog._elements.dialogDone.disabled);
    });

    test('in pin mode, and length of pinInput is less than 4', function() {
      simPinDialog._mode = 'pin';
      simPinDialog._elements.pinInput.value = '1';
      simPinDialog._updateDoneButtonState();
      assert.isTrue(simPinDialog._elements.dialogDone.disabled);
    });

    test('in pin mode, but length of pinInput is >= 4', function() {
      simPinDialog._mode = 'pin';
      simPinDialog._elements.pinInput.value = '1234';
      simPinDialog._updateDoneButtonState();
      assert.isFalse(simPinDialog._elements.dialogDone.disabled);
    });

    test('in puk mode, and length of pukInput is less than 4', function() {
      simPinDialog._mode = 'puk';
      simPinDialog._elements.pukInput.value = '1';
      simPinDialog._updateDoneButtonState();
      assert.isTrue(simPinDialog._elements.dialogDone.disabled);
    });

    test('in puk mode, but length of pukInput is >= 4', function() {
      simPinDialog._mode = 'puk';
      simPinDialog._elements.pukInput.value = '1234';
      simPinDialog._updateDoneButtonState();
      assert.isFalse(simPinDialog._elements.dialogDone.disabled);
    });

    test('in unknown mode, but length of pukInput is >= 4', function() {
      this.sinon.stub(window.console, 'error');
      simPinDialog._mode = 'unknown_mode';
      simPinDialog._updateDoneButtonState();
      assert.isTrue(window.console.error.called);
    });
  });

  function createInput() {
    var input = document.createElement('input');
    input.type = 'text';
    return input;
  }

  function createButton() {
    var button = document.createElement('button');
    return button;
  }
});
