/* global SettingsService */
suite('ScreenLockPasscode > ', function() {
  'use strict';

  var fakePanel;
  var realScreenLockPasscode;
  var screenLockPasscode;
  var realMozSettings;
  var realSettingsListener;
  var realSettingsService;
  var PasscodeHelper;

  suiteSetup(function(done) {
    navigator.addIdleObserver = sinon.spy();

    var modules = [
      'shared_mocks/mock_navigator_moz_settings',
      'shared_mocks/mock_settings_listener',
      'unit/mock_settings_service',
      'panels/screen_lock_passcode/screen_lock_passcode',
      'shared/passcode_helper'
    ];

    var maps = {
      '*': {
        'modules/settings_service': 'unit/mock_settings_service',
        'shared/passcode_helper': 'MockPasscodeHelper'
      }
    };
    var MockPasscodeHelper = {
      set: function() {},
      check: function() {}
    };
    define('MockPasscodeHelper', function() {
      return MockPasscodeHelper;
    });
    var requireCtx = testRequire([], maps, function() {});

    requireCtx(modules,
      function(MockNavigatorSettings, MockSettingsListener, MockSettingsService,
        ScreenLockPasscode, MockPasscodeHelper) {
          realScreenLockPasscode = ScreenLockPasscode;

          realSettingsListener = window.SettingsListener;
          window.SettingsListener = MockSettingsListener;

          realSettingsService = window.navigator.SettingsService;
          window.SettingsService = MockSettingsService;

          realMozSettings = window.navigator.mozSettings;
          window.navigator.mozSettings = MockNavigatorSettings;

          PasscodeHelper = MockPasscodeHelper;
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
    });

    setup(function() {
      this.sinon.stub(screenLockPasscode, '_showErrorMessage');
      this.sinon.stub(screenLockPasscode, '_hideErrorMessage');
    });

    suite('passcode is different', function() {
      setup(function() {
        this.sinon.stub(PasscodeHelper, 'check').returns(
          Promise.resolve(false)
        );
        // enter passcode 0000
        screenLockPasscode._passcodeBuffer = '0000';
      });
      test('we would show error message', function(done) {
        screenLockPasscode._checkPasscode().then(() => {
          assert.ok(screenLockPasscode._showErrorMessage.called);
        }).then(done, done);

      });
    });

    suite('passcode is the same', function() {
      setup(function() {
        this.sinon.stub(PasscodeHelper, 'check').returns(
          Promise.resolve(true)
        );
        // enter passcode 0000
        screenLockPasscode._passcodeBuffer = '0000';
      });
      test('we would hide error message', function(done) {
        screenLockPasscode._checkPasscode().then(() => {
          assert.ok(screenLockPasscode._hideErrorMessage.called);
        }).then(done, done);
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

    suite('basic check > ', function() {
      suite('only accepts events from the keypad', function() {
        var fakeEvent;
        setup(function() {
          fakeEvent = {
            target: screenLockPasscode.passcodeInput,
            preventDefault: sinon.spy()
          };
        });

        test('numbers', function() {
          fakeEvent.keyCode = 0;
          screenLockPasscode.handleEvent(fakeEvent);
          assert.ok(fakeEvent.preventDefault.called);
        });

        test('backspace', function() {
          fakeEvent.keyCode = 8;
          screenLockPasscode.handleEvent(fakeEvent);
          assert.ok(fakeEvent.preventDefault.called);
        });

        test('others', function() {
          fakeEvent.keyCode = 100;
          screenLockPasscode.handleEvent(fakeEvent);
          assert.ok(fakeEvent.preventDefault.notCalled);
        });
      });
    });

    suite('create/new lock > ', function() {
      suite('with right passcode', function() {
        setup(function(done) {
          // we would add one more zero (charCode = 48)
          screenLockPasscode._passcodeBuffer = '0000000';
          screenLockPasscode._MODE = 'create';
          screenLockPasscode.handleEvent({
            target: screenLockPasscode.passcodeInput,
            charCode: 48,
            keyCode: 0,
            preventDefault: function() {}
          }).then(done, done);
        });
        test('enable button', function() {
          assert.ok(screenLockPasscode._enableButton.called);
        });
      });

      suite('with wrong passcode', function() {
        setup(function(done) {
          // we would add one more one (charCode = 49)
          screenLockPasscode._passcodeBuffer = '0000000';
          screenLockPasscode._MODE = 'create';
          screenLockPasscode.handleEvent({
            target: screenLockPasscode.passcodeInput,
            charCode: 49,
            keyCode: 0,
            preventDefault: function() {}
          }).then(done, done);
        });
        test('show error message, clean passcodeBuffer', function() {
          assert.ok(screenLockPasscode._showErrorMessage.called);
          assert.equal(screenLockPasscode._passcodeBuffer, '');
        });
      });
    });

    suite('confirm > ', function() {
      suite('with right passcode', function() {
        setup(function(done) {
          this.sinon.stub(PasscodeHelper, 'check').returns(
            Promise.resolve(true)
          );
          // we would add one more zero (charCode = 96)
          screenLockPasscode._passcodeBuffer = '000';
          screenLockPasscode._MODE = 'confirm';
          screenLockPasscode.handleEvent({
            target: screenLockPasscode.passcodeInput,
            charCode: 48,
            keyCode: 0,
            preventDefault: function () {}
          }).then(done, done);
        });
        test('passcode is turned off', function() {
          var settingsObj = window.navigator.mozSettings.mSettings;
          assert.notOk(settingsObj['lockscreen.passcode-lock.enabled']);
        });
        test('we would back to screenLock', function() {
          assert.ok(screenLockPasscode._backToScreenLock.called);
        });
      });

      suite('with wrong passcode', function() {
        setup(function(done) {
          this.sinon.stub(PasscodeHelper, 'check').returns(
            Promise.resolve(false)
          );
          // we would add one more zero (charCode = 96)
          screenLockPasscode._passcodeBuffer = '000';
          screenLockPasscode._MODE = 'confirm';
          screenLockPasscode.handleEvent({
            target: screenLockPasscode.passcodeInput,
            charCode: 48,
            keyCode: 0,
            preventDefault: function() {}
          }).then(done, done);
        });
        test('passcode is not turned off', function() {
          var settingsObj = window.navigator.mozSettings.mSettings;
          assert.notOk(settingsObj['lockscreen.passcode-lock.enabled']);
        });
        test('we would reset passcodeBuffer', function() {
          assert.equal(screenLockPasscode._passcodeBuffer, '');
        });
      });
    });

    suite('confirmLock > ', function() {
      suite('with right passcode', function() {
        setup(function(done) {
          this.sinon.stub(PasscodeHelper, 'check').returns(
            Promise.resolve(true)
          );
          // we would add one more zero (charCode = 96)
          screenLockPasscode._passcodeBuffer = '000';
          screenLockPasscode._MODE = 'confirmLock';
          screenLockPasscode.handleEvent({
            target: screenLockPasscode.passcodeInput,
            charCode: 48,
            keyCode: 0,
            preventDefault: function() {}
          }).then(done, done);
        });
        test('passcode and lockscreen are turned off', function() {
          var settingsObj = window.navigator.mozSettings.mSettings;
          assert.notOk(settingsObj['lockscreen.enabled']);
          assert.notOk(settingsObj['lockscreen.passcode-lock.enabled']);
        });
        test('we would back to screenLock', function() {
          assert.ok(screenLockPasscode._backToScreenLock.called);
        });
      });

      suite('with wrong passcode', function() {
        setup(function(done) {
          this.sinon.stub(PasscodeHelper, 'check').returns(
            Promise.resolve(false)
          );
          // we would add one more zero (charCode = 96)
          screenLockPasscode._passcodeBuffer = '000';
          screenLockPasscode._MODE = 'confirmLock';
          screenLockPasscode.handleEvent({
            target: screenLockPasscode.passcodeInput,
            charCode: 48,
            keyCode: 0,
            preventDefault: function () {}
          }).then(done, done);
        });
        test('passcode and lockscreen are not turned off', function() {
          var settingsObj = window.navigator.mozSettings.mSettings;
          assert.notOk(settingsObj['lockscreen.enabled']);
          assert.notOk(settingsObj['lockscreen.passcode-lock.enabled']);
        });
        test('we would reset passcodeBuffer', function() {
          assert.equal(screenLockPasscode._passcodeBuffer, '');
        });
      });
    });

    suite('edit > ', function() {
      suite('with right passcode', function() {
        setup(function(done) {
          this.sinon.stub(PasscodeHelper, 'check').returns(
            Promise.resolve(true)
          );
          // we would add one more zero (charCode = 96)
          screenLockPasscode._passcodeBuffer = '000';
          screenLockPasscode._MODE = 'edit';
          screenLockPasscode.handleEvent({
            target: screenLockPasscode.passcodeInput,
            charCode: 48,
            keyCode: 0,
            preventDefault: function () {}
          }).then(done, done);
        });
        test('we would do a lot', function() {
          assert.ok(screenLockPasscode._updatePassCodeUI.called);
          assert.ok(screenLockPasscode._showDialogInMode.calledWith('new'));
          assert.equal(screenLockPasscode._passcodeBuffer, '');
        });
      });

      suite('with wrong passcode', function() {
        setup(function(done) {
          this.sinon.stub(PasscodeHelper, 'check').returns(
            Promise.resolve(false)
          );
          // we would add one more zero (charCode = 96)
          screenLockPasscode._passcodeBuffer = '000';
          screenLockPasscode._MODE = 'edit';
          screenLockPasscode.handleEvent({
            target: screenLockPasscode.passcodeInput,
            charCode: 48,
            keyCode: 0,
            preventDefault: function () {}
          }).then(done, done);
        });
        test('we would reset passcodeBuffer', function() {
          assert.equal(screenLockPasscode._passcodeBuffer, '');
        });
      });
    });
  });

  suite('onBeforeShow > ', function() {
    setup(function() {
      this.sinon.stub(screenLockPasscode, '_showDialogInMode');
    });

    suite('if users left panel by home', function() {
      setup(function() {
        screenLockPasscode._leftApp = true;
        screenLockPasscode.onBeforeShow('create');
      });

      test('we would not re-show dialog again', function() {
        assert.isFalse(screenLockPasscode._showDialogInMode.called);
      });
    });

    suite('if users left panel by back button', function() {
      setup(function() {
        screenLockPasscode._leftApp = false;
        screenLockPasscode.onBeforeShow('create');
      });

      test('we would re-show dialog again', function() {
        assert.isTrue(screenLockPasscode._showDialogInMode.called);
      });
    });
  });

  suite('onHide > ', function() {
    var realDocumentHidden = document.hidden;

    setup(function() {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: function() {
          return false;
        }
      });
      this.sinon.stub(screenLockPasscode, '_updatePassCodeUI');
      screenLockPasscode._MODE = 'edit';
      screenLockPasscode._leftApp = false;
      screenLockPasscode.onHide();
    });

    teardown(function() {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: function() {
          return realDocumentHidden;
        }
      });
    });

    test('when editing passcode, we would clear passcode buffer everytime ' +
      'when going back to previous panel', function() {
        assert.isTrue(screenLockPasscode._updatePassCodeUI.called);
        assert.equal(screenLockPasscode._passcodeBuffer, '');
      });
  });
});
