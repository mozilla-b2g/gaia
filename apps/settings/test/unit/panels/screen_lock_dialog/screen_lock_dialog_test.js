/* global SettingsService */
mocha.globals([
  'MockNavigatorSettings',
  'MockLock',
  'MockSettingsListener',
  'SettingsListener',
  'SettingsService'
]);

suite('ScreenLockDialog > ', function() {
  'use strict';

  var fakePanel;
  var screenLockDialog;
  var realMozSettings;
  var realSettingsListener;
  var realSettingsService;

  suiteSetup(function(done) {
    var modules = [
      'shared_mocks/mock_navigator_moz_settings',
      'shared_mocks/mock_settings_listener',
      'unit/mock_settings_service',
      'panels/screen_lock_dialog/screen_lock_dialog'
    ];

    var maps = {
      'panels/screen_lock_dialog/screen_lock_dialog': {
        'modules/settings_service': 'unit/mock_settings_service'
      }
    };

    testRequire(modules, maps,
      function(MockNavigatorSettings, MockSettingsListener, MockSettingsService,
        ScreenLockDialog) {
          screenLockDialog = ScreenLockDialog();

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

          screenLockDialog.onInit(fakePanel);
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
      this.sinon.stub(screenLockDialog.passcodeInput, 'focus');
      screenLockDialog.passcodeContainer.click();
    });

    test('we would focus passcodeInput', function() {
      assert.ok(screenLockDialog.passcodeInput.focus.called);
    });
  });

  suite('_backToScreenLock > ', function() {
    setup(function() {
      this.sinon.stub(screenLockDialog.passcodeInput, 'blur');
      this.sinon.stub(SettingsService, 'navigate');
      screenLockDialog._backToScreenLock();
    });

    test('we would go back to screenLock panel', function() {
      assert.ok(SettingsService.navigate.calledWith('screenLock'));
    });

    test('we would blur focus on passcodeInput', function() {
      assert.ok(screenLockDialog.passcodeInput.blur.called);
    });

    test('we would clean _passcodeBuffer', function() {
      assert.equal(screenLockDialog._passcodeBuffer, '');
    });
  });

  suite('_checkPasscode > ', function() {
    suiteSetup(function() {
      screenLockDialog._passcodeBuffer = '';
      screenLockDialog._settings.passcode = '0000';
    });

    setup(function() {
      this.sinon.stub(screenLockDialog, '_showErrorMessage');
      this.sinon.stub(screenLockDialog, '_hideErrorMessage');
    });

    suite('passcode is different', function() {
      setup(function() {
        screenLockDialog._settings.passcode = '0123';
        screenLockDialog._passcodeBuffer = '0000';
        screenLockDialog._checkPasscode();
      });
      test('we would show error message', function() {
        assert.ok(screenLockDialog._showErrorMessage.called);
      });
    });

    suite('passcode is the same', function() {
      setup(function() {
        screenLockDialog._settings.passcode = '0000';
        screenLockDialog._passcodeBuffer = '0000';
        screenLockDialog._checkPasscode();
      });
      test('we would hide error message', function() {
        assert.ok(screenLockDialog._hideErrorMessage.called);
      });
    });
  });

  suite('handleEvent > ', function() {
    setup(function() {
      this.sinon.stub(screenLockDialog, '_enableButton');
      this.sinon.stub(screenLockDialog, '_showErrorMessage');
      this.sinon.stub(screenLockDialog, '_showDialogInMode');
      this.sinon.stub(screenLockDialog, '_updatePassCodeUI');
      this.sinon.stub(screenLockDialog, '_backToScreenLock');
    });

    suite('create/new lock > ', function() {
      suite('with right passcode', function() {
        setup(function() {
          // we would add one more zero (charCode = 96)
          screenLockDialog._passcodeBuffer = '0000000';
          screenLockDialog._MODE = 'create';
          screenLockDialog.handleEvent({
            target: screenLockDialog.passcodeInput,
            charCode: 48,
            preventDefault: function() {}
          });
        });
        test('enable button', function() {
          assert.ok(screenLockDialog._enableButton.called);
        });
      });

      suite('with wrong passcode', function() {
        setup(function() {
          // we would add one more zero (charCode = 96)
          screenLockDialog._passcodeBuffer = '0000000';
          screenLockDialog._MODE = 'create';
          screenLockDialog.handleEvent({
            target: screenLockDialog.passcodeInput,
            charCode: 49,
            preventDefault: function() {}
          });
        });
        test('show error message, clean passcodeBuffer', function() {
          assert.ok(screenLockDialog._showErrorMessage.called);
          assert.equal(screenLockDialog._passcodeBuffer, '');
        });
      });
    });

    suite('confirm > ', function() {
      suite('with right passcode', function() {
        setup(function() {
          screenLockDialog._settings.passcode = '0000';
          // we would add one more zero (charCode = 96)
          screenLockDialog._passcodeBuffer = '000';
          screenLockDialog._MODE = 'confirm';
          screenLockDialog.handleEvent({
            target: screenLockDialog.passcodeInput,
            charCode: 48,
            preventDefault: function() {}
          });
        });
        test('we would back to screenLock', function() {
          assert.ok(screenLockDialog._backToScreenLock.called);
        });
      });

      suite('with wrong passcode', function() {
        setup(function() {
          screenLockDialog._settings.passcode = '0001';
          // we would add one more zero (charCode = 96)
          screenLockDialog._passcodeBuffer = '000';
          screenLockDialog._MODE = 'confirm';
          screenLockDialog.handleEvent({
            target: screenLockDialog.passcodeInput,
            charCode: 48,
            preventDefault: function() {}
          });
        });
        test('we would reset passcodeBuffer', function() {
          assert.equal(screenLockDialog._passcodeBuffer, '');
        });
      });
    });

    suite('confirmLock > ', function() {
      suite('with right passcode', function() {
        setup(function() {
          screenLockDialog._settings.passcode = '0000';
          // we would add one more zero (charCode = 96)
          screenLockDialog._passcodeBuffer = '000';
          screenLockDialog._MODE = 'confirmLock';
          screenLockDialog.handleEvent({
            target: screenLockDialog.passcodeInput,
            charCode: 48,
            preventDefault: function() {}
          });
        });
        test('we would back to screenLock', function() {
          assert.ok(screenLockDialog._backToScreenLock.called);
        });
      });

      suite('with wrong passcode', function() {
        setup(function() {
          screenLockDialog._settings.passcode = '0001';
          // we would add one more zero (charCode = 96)
          screenLockDialog._passcodeBuffer = '000';
          screenLockDialog._MODE = 'confirmLock';
          screenLockDialog.handleEvent({
            target: screenLockDialog.passcodeInput,
            charCode: 48,
            preventDefault: function() {}
          });
        });
        test('we would reset passcodeBuffer', function() {
          assert.equal(screenLockDialog._passcodeBuffer, '');
        });
      });
    });

    suite('edit > ', function() {
      suite('with right passcode', function() {
        setup(function() {
          screenLockDialog._settings.passcode = '0000';
          // we would add one more zero (charCode = 96)
          screenLockDialog._passcodeBuffer = '000';
          screenLockDialog._MODE = 'edit';
          screenLockDialog.handleEvent({
            target: screenLockDialog.passcodeInput,
            charCode: 48,
            preventDefault: function() {}
          });
        });
        test('we would do a lot', function() {
          assert.ok(screenLockDialog._updatePassCodeUI.called);
          assert.ok(screenLockDialog._showDialogInMode.calledWith('new'));
          assert.equal(screenLockDialog._passcodeBuffer, '');
        });
      });

      suite('with wrong passcode', function() {
        setup(function() {
          screenLockDialog._settings.passcode = '0001';
          // we would add one more zero (charCode = 96)
          screenLockDialog._passcodeBuffer = '000';
          screenLockDialog._MODE = 'edit';
          screenLockDialog.handleEvent({
            target: screenLockDialog.passcodeInput,
            charCode: 48,
            preventDefault: function() {}
          });
        });
        test('we would reset passcodeBuffer', function() {
          assert.equal(screenLockDialog._passcodeBuffer, '');
        });
      });
    });
  });
});
