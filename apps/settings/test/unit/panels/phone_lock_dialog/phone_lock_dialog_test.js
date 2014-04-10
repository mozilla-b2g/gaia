mocha.globals([
  'MockNavigatorSettings',
  'MockLock',
  'MockSettingsListener',
  'SettingsListener',
  'SettingsService'
]);

suite('PhoneLockDialog > ', function() {
  'use strict';

  var fakePanel;
  var phoneLockDialog;
  var realMozSettings;
  var realSettingsListener;
  var realSettingsService;

  suiteSetup(function(done) {
    var modules = [
      'shared_mocks/mock_navigator_moz_settings',
      'shared_mocks/mock_settings_listener',
      'unit/mock_settings_service',
      'panels/phone_lock_dialog/phone_lock_dialog'
    ];

    var maps = {
      'panels/phone_lock_dialog/phone_lock_dialog': {
        'modules/settings_service': 'unit/mock_settings_service'
      }
    };

    testRequire(modules, maps,
      function(MockNavigatorSettings, MockSettingsListener, MockSettingsService,
        PhoneLockDialog) {
          phoneLockDialog = PhoneLockDialog();

          // fake all related DOM elements
          fakePanel = document.createElement('div');
          sinon.stub(fakePanel, 'querySelector', function(sel) {
            if (sel.match(/-input$/)) {
              return document.createElement('input');
            } else {
              return document.createElement('div');
            }
          });
          sinon.stub(fakePanel, 'querySelectorAll', function() {
            return document.createElement('div');
          });

          realSettingsListener = window.SettingsListener;
          window.SettingsListener = MockSettingsListener;

          realSettingsService = window.navigator.SettingsService;
          window.SettingsService = MockSettingsService;

          realMozSettings = window.navigator.mozSettings;
          window.navigator.mozSettings = MockNavigatorSettings;

          phoneLockDialog.onInit(fakePanel);
          done();
    });
  });

  suiteTeardown(function() {
    window.navigator.mozSettings = realMozSettings;
    window.SettingsListener = realSettingsListener;
    window.SettingsService = realSettingsService;
  });

  suite('when clicking on passcodeContainer', function() {
    setup(function() {
      this.sinon.stub(phoneLockDialog.passcodeInput, 'focus');
      phoneLockDialog.passcodeContainer.click();
    });

    test('we would focus passcodeInput', function() {
      assert.ok(phoneLockDialog.passcodeInput.focus.called);
    });
  });

  suite('backToPhoneLock > ', function() {
    setup(function() {
      this.sinon.stub(phoneLockDialog.passcodeInput, 'blur');
      phoneLockDialog.backToPhoneLock();
    });

    test('we would go back to phoneLock panel', function() {
      assert.equal(window.SettingsService.getLastNavigation().panelId,
        'phoneLock');
    });

    test('we would blur focus on passcodeInput', function() {
      assert.ok(phoneLockDialog.passcodeInput.blur.called);
    });

    test('we would clean _passcodeBuffer', function() {
      assert.equal(phoneLockDialog._passcodeBuffer, '');
    });
  });

  suite('checkPasscode > ', function() {
    suiteSetup(function() {
      phoneLockDialog._passcodeBuffer = '';
      phoneLockDialog.settings.passcode = '0000';
    });

    setup(function() {
      this.sinon.stub(phoneLockDialog, 'showErrorMessage');
      this.sinon.stub(phoneLockDialog, 'hideErrorMessage');
    });

    suite('passcode is different', function() {
      setup(function() {
        phoneLockDialog.settings.passcode = '0123';
        phoneLockDialog._passcodeBuffer = '0000';
        phoneLockDialog.checkPasscode();
      });
      test('we would show error message', function() {
        assert.ok(phoneLockDialog.showErrorMessage.called);
      });
    });

    suite('passcode is the same', function() {
      setup(function() {
        phoneLockDialog.settings.passcode = '0000';
        phoneLockDialog._passcodeBuffer = '0000';
        phoneLockDialog.checkPasscode();
      });
      test('we would hide error message', function() {
        assert.ok(phoneLockDialog.hideErrorMessage.called);
      });
    });
  });

  suite('handleEvent > ', function() {
    setup(function() {
      this.sinon.stub(phoneLockDialog, 'enableButton');
      this.sinon.stub(phoneLockDialog, 'showErrorMessage');
      this.sinon.stub(phoneLockDialog, 'showDialogInMode');
      this.sinon.stub(phoneLockDialog, 'updatePassCodeUI');
      this.sinon.stub(phoneLockDialog, 'backToPhoneLock');
    });

    suite('create/new lock > ', function() {
      suite('with right passcode', function() {
        setup(function() {
          // we would add one more zero (charCode = 96)
          phoneLockDialog._passcodeBuffer = '0000000';
          phoneLockDialog.MODE = 'create';
          phoneLockDialog.handleEvent({
            target: phoneLockDialog.passcodeInput,
            charCode: 48,
            preventDefault: function() {}
          });
        });
        test('enable button', function() {
          assert.ok(phoneLockDialog.enableButton.called);
        });
      });

      suite('with wrong passcode', function() {
        setup(function() {
          // we would add one more zero (charCode = 96)
          phoneLockDialog._passcodeBuffer = '0000000';
          phoneLockDialog.MODE = 'create';
          phoneLockDialog.handleEvent({
            target: phoneLockDialog.passcodeInput,
            charCode: 49,
            preventDefault: function() {}
          });
        });
        test('show error message, clean passcodeBuffer', function() {
          assert.ok(phoneLockDialog.showErrorMessage.called);
          assert.equal(phoneLockDialog._passcodeBuffer, '');
        });
      });
    });

    suite('confirm > ', function() {
      suite('with right passcode', function() {
        setup(function() {
          phoneLockDialog.settings.passcode = '0000';
          // we would add one more zero (charCode = 96)
          phoneLockDialog._passcodeBuffer = '000';
          phoneLockDialog.MODE = 'confirm';
          phoneLockDialog.handleEvent({
            target: phoneLockDialog.passcodeInput,
            charCode: 48,
            preventDefault: function() {}
          });
        });
        test('we would back to phoneLock', function() {
          assert.ok(phoneLockDialog.backToPhoneLock.called);
        });
      });

      suite('with wrong passcode', function() {
        setup(function() {
          phoneLockDialog.settings.passcode = '0001';
          // we would add one more zero (charCode = 96)
          phoneLockDialog._passcodeBuffer = '000';
          phoneLockDialog.MODE = 'confirm';
          phoneLockDialog.handleEvent({
            target: phoneLockDialog.passcodeInput,
            charCode: 48,
            preventDefault: function() {}
          });
        });
        test('we would reset passcodeBuffer', function() {
          assert.equal(phoneLockDialog._passcodeBuffer, '');
        });
      });
    });

    suite('confirmLock > ', function() {
      suite('with right passcode', function() {
        setup(function() {
          phoneLockDialog.settings.passcode = '0000';
          // we would add one more zero (charCode = 96)
          phoneLockDialog._passcodeBuffer = '000';
          phoneLockDialog.MODE = 'confirmLock';
          phoneLockDialog.handleEvent({
            target: phoneLockDialog.passcodeInput,
            charCode: 48,
            preventDefault: function() {}
          });
        });
        test('we would back to phoneLock', function() {
          assert.ok(phoneLockDialog.backToPhoneLock.called);
        });
      });

      suite('with wrong passcode', function() {
        setup(function() {
          phoneLockDialog.settings.passcode = '0001';
          // we would add one more zero (charCode = 96)
          phoneLockDialog._passcodeBuffer = '000';
          phoneLockDialog.MODE = 'confirmLock';
          phoneLockDialog.handleEvent({
            target: phoneLockDialog.passcodeInput,
            charCode: 48,
            preventDefault: function() {}
          });
        });
        test('we would reset passcodeBuffer', function() {
          assert.equal(phoneLockDialog._passcodeBuffer, '');
        });
      });
    });

    suite('edit > ', function() {
      suite('with right passcode', function() {
        setup(function() {
          phoneLockDialog.settings.passcode = '0000';
          // we would add one more zero (charCode = 96)
          phoneLockDialog._passcodeBuffer = '000';
          phoneLockDialog.MODE = 'edit';
          phoneLockDialog.handleEvent({
            target: phoneLockDialog.passcodeInput,
            charCode: 48,
            preventDefault: function() {}
          });
        });
        test('we would do a lot', function() {
          assert.ok(phoneLockDialog.updatePassCodeUI.called);
          assert.ok(phoneLockDialog.showDialogInMode.calledWith('new'));
          assert.equal(phoneLockDialog._passcodeBuffer, '');
        });
      });

      suite('with wrong passcode', function() {
        setup(function() {
          phoneLockDialog.settings.passcode = '0001';
          // we would add one more zero (charCode = 96)
          phoneLockDialog._passcodeBuffer = '000';
          phoneLockDialog.MODE = 'edit';
          phoneLockDialog.handleEvent({
            target: phoneLockDialog.passcodeInput,
            charCode: 48,
            preventDefault: function() {}
          });
        });
        test('we would reset passcodeBuffer', function() {
          assert.equal(phoneLockDialog._passcodeBuffer, '');
        });
      });
    });
  });
});
