suite('ScreenLock > ', function() {
  'use strict';

  var screenLock;
  var fakePanel;
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

        fakePanel = document.createElement('div');
        sinon.stub(fakePanel, 'querySelector', function() {
          return document.createElement('div');
        });

        screenLock.onInit(fakePanel);
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
        screenLock.passcodeEnable.click();
        assert.ok(screenLock._showDialog.calledWith('confirm'));
      });
      test('show create if passcodeEnabled is false', function() {
        screenLock._settings.passcodeEnabled = false;
        screenLock.passcodeEnable.click();
        assert.ok(screenLock._showDialog.calledWith('create'));
      });
    });
    suite('when lockscreenEnable is clicked', function() {
      test('show confirmLock if passcode and lockscreen both are enabled',
        function() {
          screenLock._settings.passcodeEnabled = true;
          screenLock._settings.lockscreenEnabled = true;
          screenLock.lockscreenEnable.click();
          assert.ok(screenLock._showDialog.calledWith('confirmLock'));
        });
      test('won\'t show confirmLock if one of them are disabled', function() {
          screenLock._settings.passcodeEnabled = true;
          screenLock._settings.lockscreenEnabled = false;
          screenLock.lockscreenEnable.click();
          assert.isFalse(screenLock._showDialog.called);
        });
    });
    suite('click on passcodeEditButton', function() {
      test('show edit directly', function() {
        screenLock.passcodeEditButton.click();
        assert.ok(screenLock._showDialog.calledWith('edit'));
      });
    });
  });
});
