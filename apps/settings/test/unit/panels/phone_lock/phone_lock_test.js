mocha.globals([
  'MockLock',
  'MockSettingsListener',
  'MockNavigatorSettings',
  'SettingsListener'
]);

suite('PhoneLock > ', function() {
  'use strict';

  var phoneLock;
  var fakePanel;
  var realSettingsListener;

  suiteSetup(function(done) {
    var modules = [
      'shared_mocks/mock_settings_listener',
      'panels/phone_lock/phone_lock'
    ];

    var maps = {
      'panels/phone_lock/phone_lock': {
        'modules/settings_service': 'unit/mock_settings_service'
      }
    };

    testRequire(modules, maps, function(MockSettingsListener, PhoneLock) {
        realSettingsListener = window.SettingsListener;
        window.SettingsListener = MockSettingsListener;

        phoneLock = PhoneLock();

        // try to mimic the environment
        fakePanel = document.createElement('div');
        sinon.stub(fakePanel, 'querySelector', function() {
          return document.createElement('div');
        });

        phoneLock.onInit(fakePanel);
        done();
    });
  });

  suiteTeardown(function() {
    window.SettingsListener = realSettingsListener;
  });

  suite('navigation > ', function() {
    setup(function() {
      this.sinon.stub(phoneLock, 'showDialog');
    });
    suite('when passcodeEnable is clicked', function() {
      test('show confirm if passcodeEnable is true', function() {
        phoneLock.settings.passcodeEnable = true;
        phoneLock.passcodeEnable.click();
        assert.ok(phoneLock.showDialog.calledWith('confirm'));
      });
      test('show create if passcodeEnable is false', function() {
        phoneLock.settings.passcodeEnable = false;
        phoneLock.passcodeEnable.click();
        assert.ok(phoneLock.showDialog.calledWith('create'));
      });
    });
    suite('when lockscreenEnable is clicked', function() {
      test('show confirmLock if passcode and lockscreen both are enabled',
        function() {
          phoneLock.settings.passcodeEnable = true;
          phoneLock.settings.lockscreenEnable = true;
          phoneLock.lockscreenEnable.click();
          assert.ok(phoneLock.showDialog.calledWith('confirmLock'));
        });
      test('won\'t show confirmLock if one of them are disabled', function() {
          phoneLock.settings.passcodeEnable = true;
          phoneLock.settings.lockscreenEnable = false;
          phoneLock.lockscreenEnable.click();
          assert.isFalse(phoneLock.showDialog.called);
        });
    });
    suite('click on passcodeEditButton', function() {
      test('show edit directly', function() {
        phoneLock.passcodeEditButton.click();
        assert.ok(phoneLock.showDialog.calledWith('edit'));
      });
    });
  });
});
