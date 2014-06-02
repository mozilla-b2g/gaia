suite('ScreenLock > ', function() {
  'use strict';

  var realScreenLock;
  var screenLock;
  var fakePanel;
  var realSettingsListener;

  suiteSetup(function(done) {
    var modules = [
      'shared_mocks/mock_settings_listener',
      'panels/screen_lock/screen_lock'
    ];

    var maps = {
      'panels/screen_lock/screen_lock': {
        'modules/settings_service': 'unit/mock_settings_service'
      }
    };

    testRequire(modules, maps, function(MockSettingsListener, ScreenLock) {
      realSettingsListener = window.SettingsListener;
      window.SettingsListener = MockSettingsListener;

      realScreenLock = ScreenLock;
      done();
    });
  });

  suiteTeardown(function() {
    window.SettingsListener = realSettingsListener;
  });

  setup(function() {
    // make sure our screenLock instnace is new when running each test !
    screenLock = realScreenLock();

    fakePanel = document.createElement('div');
    sinon.stub(fakePanel, 'querySelector', function() {
      return document.createElement('div');
    });

    screenLock.onInit(fakePanel);
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
