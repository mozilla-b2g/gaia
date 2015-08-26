suite('ScreenLock > ', function() {
  'use strict';

  var screenLock;
  var modules = [
    'shared_mocks/mock_settings_listener',
    'panels/screen_lock/screen_lock',
    'MockDialogService'
  ];

  var maps = {
    '*': {
      'shared/settings_listener': 'shared_mocks/mock_settings_listener',
      'modules/dialog_service': 'MockDialogService'
    }
  };

  setup(function(done) {
    define('MockDialogService', function() {
      return {
        show: function() {}
      };
    });

    testRequire(modules, maps, function(MockSettingsListener, ScreenLock,
      MockDialogService) {
        screenLock = ScreenLock();
        screenLock.onInit({
          panel: document.createElement('div'),
          lockscreenEnable: document.createElement('div'),
          passcodeEnable: document.createElement('div'),
          passcodeEditButton: document.createElement('div')
        });
        done();
    });
  });

  suite('navigation > ', function() {
    setup(function() {
      this.sinon.stub(screenLock, '_showDialog');
    });
    suite('when passcodeEnable is clicked', function() {
      test('show confirm if passcodeEnabled is true', function() {
        screenLock._settings.passcodeEnabled = true;
        screenLock._elements.passcodeEnable.click();
        assert.ok(screenLock._showDialog.calledWith('confirm'));
      });
      test('show create if passcodeEnabled is false', function() {
        screenLock._settings.passcodeEnabled = false;
        screenLock._elements.passcodeEnable.click();
        assert.ok(screenLock._showDialog.calledWith('create'));
      });
    });
    suite('when lockscreenEnable is clicked', function() {
      test('show confirmLock if passcode and lockscreen both are enabled',
        function() {
          screenLock._settings.passcodeEnabled = true;
          screenLock._settings.lockscreenEnabled = true;
          screenLock._elements.lockscreenEnable.click();
          assert.ok(screenLock._showDialog.calledWith('confirmLock'));
        });
      test('won\'t show confirmLock if one of them are disabled', function() {
          screenLock._settings.passcodeEnabled = true;
          screenLock._settings.lockscreenEnabled = false;
          screenLock._elements.lockscreenEnable.click();
          assert.isFalse(screenLock._showDialog.called);
        });
    });
    suite('click on passcodeEditButton', function() {
      test('show edit directly', function() {
        screenLock._elements.passcodeEditButton.click();
        assert.ok(screenLock._showDialog.calledWith('edit'));
      });
    });
  });
});
