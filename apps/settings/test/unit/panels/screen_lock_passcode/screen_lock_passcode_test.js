/* global SettingsService */
suite('ScreenLockPasscode > ', function() {
  'use strict';

  var fakePanel;
  var realScreenLockPasscode;
  var screenLockPasscode;
  var realMozSettings;
  var realSettingsListener;
  var realSettingsService;

  suiteSetup(function(done) {
    var modules = [
      'shared_mocks/mock_navigator_moz_settings',
      'shared_mocks/mock_settings_listener',
      'unit/mock_settings_service',
      'panels/screen_lock_passcode/screen_lock_passcode'
    ];

    var maps = {
      'panels/screen_lock_passcode/screen_lock_passcode': {
        'modules/settings_service': 'unit/mock_settings_service'
      }
    };

    testRequire(modules, maps,
      function(MockNavigatorSettings, MockSettingsListener, MockSettingsService,
        ScreenLockPasscode) {
          realScreenLockPasscode = ScreenLockPasscode;

          realSettingsListener = window.SettingsListener;
          window.SettingsListener = MockSettingsListener;

          realSettingsService = window.navigator.SettingsService;
          window.SettingsService = MockSettingsService;

          realMozSettings = window.navigator.mozSettings;
          window.navigator.mozSettings = MockNavigatorSettings;

          done();
    });
  });

  suiteTeardown(function() {
    window.navigator.mozSettings = realMozSettings;
    window.SettingsListener = realSettingsListener;
    window.SettingsService = realSettingsService;
  });

  setup(function() {
    screenLockPasscode = realScreenLockPasscode();

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

    screenLockPasscode.onInit(fakePanel);
  });

  suite('when clicking on passcodeContainer', function() {
    setup(function() {
      this.sinon.stub(screenLockPasscode.passcodeInput, 'focus');
      screenLockPasscode.passcodeContainer.click();
    });

    test('we would focus passcodeInput', function() {
      assert.ok(screenLockPasscode.passcodeInput.focus.called);
    });
  });

  suite('_backToScreenLock > ', function() {
    setup(function() {
      this.sinon.stub(screenLockPasscode.passcodeInput, 'blur');
      this.sinon.stub(SettingsService, 'navigate');
      screenLockPasscode._backToScreenLock();
    });

    test('we would go back to screenLock panel', function() {
      assert.ok(SettingsService.navigate.calledWith('screenLock'));
    });

    test('we would blur focus on passcodeInput', function() {
      assert.ok(screenLockPasscode.passcodeInput.blur.called);
    });

    test('we would clean _passcodeBuffer', function() {
      assert.equal(screenLockPasscode._passcodeBuffer, '');
    });
  });

  suite('_checkPasscode > ', function() {
    suiteSetup(function() {
      screenLockPasscode._passcodeBuffer = '';
      screenLockPasscode._settings.passcode = '0000';
    });

    setup(function() {
      this.sinon.stub(screenLockPasscode, '_showErrorMessage');
      this.sinon.stub(screenLockPasscode, '_hideErrorMessage');
    });

    suite('passcode is different', function() {
      setup(function() {
        screenLockPasscode._settings.passcode = '0123';
        screenLockPasscode._passcodeBuffer = '0000';
        screenLockPasscode._checkPasscode();
      });
      test('we would show error message', function() {
        assert.ok(screenLockPasscode._showErrorMessage.called);
      });
    });

    suite('passcode is the same', function() {
      setup(function() {
        screenLockPasscode._settings.passcode = '0000';
        screenLockPasscode._passcodeBuffer = '0000';
        screenLockPasscode._checkPasscode();
      });
      test('we would hide error message', function() {
        assert.ok(screenLockPasscode._hideErrorMessage.called);
      });
    });
  });

  suite('handleEvent > ', function() {
    setup(function() {
      this.sinon.stub(screenLockPasscode, '_enableButton');
      this.sinon.stub(screenLockPasscode, '_showErrorMessage');
      this.sinon.stub(screenLockPasscode, '_showDialogInMode');
      this.sinon.stub(screenLockPasscode, '_updatePassCodeUI');
      this.sinon.stub(screenLockPasscode, '_backToScreenLock');
    });

    teardown(function() {
      window.navigator.mozSettings.mTeardown();
    });

    suite('create/new lock > ', function() {
      suite('with right passcode', function() {
        setup(function() {
          // we would add one more zero (charCode = 48)
          screenLockPasscode._passcodeBuffer = '0000000';
          screenLockPasscode._MODE = 'create';
          screenLockPasscode.handleEvent({
            target: screenLockPasscode.passcodeInput,
            charCode: 48,
            preventDefault: function() {}
          });
        });
        test('enable button', function() {
          assert.ok(screenLockPasscode._enableButton.called);
        });
      });

      suite('with wrong passcode', function() {
        setup(function() {
          // we would add one more one (charCode = 49)
          screenLockPasscode._passcodeBuffer = '0000000';
          screenLockPasscode._MODE = 'create';
          screenLockPasscode.handleEvent({
            target: screenLockPasscode.passcodeInput,
            charCode: 49,
            preventDefault: function() {}
          });
        });
        test('show error message, clean passcodeBuffer', function() {
          assert.ok(screenLockPasscode._showErrorMessage.called);
          assert.equal(screenLockPasscode._passcodeBuffer, '');
        });
      });
    });

    suite('confirm > ', function() {
      suite('with right passcode', function() {
        setup(function() {
          screenLockPasscode._settings.passcode = '0000';
          // we would add one more zero (charCode = 96)
          screenLockPasscode._passcodeBuffer = '000';
          screenLockPasscode._MODE = 'confirm';
          screenLockPasscode.handleEvent({
            target: screenLockPasscode.passcodeInput,
            charCode: 48,
            preventDefault: function() {}
          });
        });
        test('passcode is turned off', function() {
          assert.deepEqual(window.navigator.mozSettings.mSettings, {
            'lockscreen.passcode-lock.enabled': false
          });
        });
        test('we would back to screenLock', function() {
          assert.ok(screenLockPasscode._backToScreenLock.called);
        });
      });

      suite('with wrong passcode', function() {
        setup(function() {
          screenLockPasscode._settings.passcode = '0001';
          // we would add one more zero (charCode = 96)
          screenLockPasscode._passcodeBuffer = '000';
          screenLockPasscode._MODE = 'confirm';
          screenLockPasscode.handleEvent({
            target: screenLockPasscode.passcodeInput,
            charCode: 48,
            preventDefault: function() {}
          });
        });
        test('passcode is not turned off', function() {
          assert.deepEqual(window.navigator.mozSettings.mSettings, {});
        });
        test('we would reset passcodeBuffer', function() {
          assert.equal(screenLockPasscode._passcodeBuffer, '');
        });
      });
    });

    suite('confirmLock > ', function() {
      suite('with right passcode', function() {
        setup(function() {
          screenLockPasscode._settings.passcode = '0000';
          // we would add one more zero (charCode = 96)
          screenLockPasscode._passcodeBuffer = '000';
          screenLockPasscode._MODE = 'confirmLock';
          screenLockPasscode.handleEvent({
            target: screenLockPasscode.passcodeInput,
            charCode: 48,
            preventDefault: function() {}
          });
        });
        test('passcode and lockscreen are turned off', function() {
          assert.deepEqual(window.navigator.mozSettings.mSettings, {
            'lockscreen.enabled': false,
            'lockscreen.passcode-lock.enabled': false
          });
        });
        test('we would back to screenLock', function() {
          assert.ok(screenLockPasscode._backToScreenLock.called);
        });
      });

      suite('with wrong passcode', function() {
        setup(function() {
          screenLockPasscode._settings.passcode = '0001';
          // we would add one more zero (charCode = 96)
          screenLockPasscode._passcodeBuffer = '000';
          screenLockPasscode._MODE = 'confirmLock';
          screenLockPasscode.handleEvent({
            target: screenLockPasscode.passcodeInput,
            charCode: 48,
            preventDefault: function() {}
          });
        });
        test('passcode and lockscreen are not turned off', function() {
          assert.deepEqual(window.navigator.mozSettings.mSettings, {});
        });
        test('we would reset passcodeBuffer', function() {
          assert.equal(screenLockPasscode._passcodeBuffer, '');
        });
      });
    });

    suite('edit > ', function() {
      suite('with right passcode', function() {
        setup(function() {
          screenLockPasscode._settings.passcode = '0000';
          // we would add one more zero (charCode = 96)
          screenLockPasscode._passcodeBuffer = '000';
          screenLockPasscode._MODE = 'edit';
          screenLockPasscode.handleEvent({
            target: screenLockPasscode.passcodeInput,
            charCode: 48,
            preventDefault: function() {}
          });
        });
        test('we would do a lot', function() {
          assert.ok(screenLockPasscode._updatePassCodeUI.called);
          assert.ok(screenLockPasscode._showDialogInMode.calledWith('new'));
          assert.equal(screenLockPasscode._passcodeBuffer, '');
        });
      });

      suite('with wrong passcode', function() {
        setup(function() {
          screenLockPasscode._settings.passcode = '0001';
          // we would add one more zero (charCode = 96)
          screenLockPasscode._passcodeBuffer = '000';
          screenLockPasscode._MODE = 'edit';
          screenLockPasscode.handleEvent({
            target: screenLockPasscode.passcodeInput,
            charCode: 48,
            preventDefault: function() {}
          });
        });
        test('we would reset passcodeBuffer', function() {
          assert.equal(screenLockPasscode._passcodeBuffer, '');
        });
      });
    });

    suite('Disable buttons', function() {
      setup(function() {
        screenLockPasscode.createPasscodeButton.disabled = false;
        screenLockPasscode.changePasscodeButton.disabled = false;
      });
      test('we would enable and disabled the buttons', function() {
        screenLockPasscode._disablePasscodeButtons(true);
        assert.isTrue(screenLockPasscode.createPasscodeButton.disabled);
        assert.isTrue(screenLockPasscode.changePasscodeButton.disabled);

        screenLockPasscode._disablePasscodeButtons(false);
        assert.isFalse(screenLockPasscode.createPasscodeButton.disabled);
        assert.isFalse(screenLockPasscode.changePasscodeButton.disabled);
      });
    });
  });
});
