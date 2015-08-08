'use strict';

suite('about > update_check', function() {
  var updateCheck;
  var realNavigatorSettings;
  var geckoUpdateSetting = 'gecko.updateStatus';
  var appsUpdateSetting = 'apps.updateStatus';

  var modules = [
    'shared_mocks/mock_navigator_moz_settings',
    'panels/about/update_check'
  ];
  var maps = {};

  var elements = {
    updateStatus: document.createElement('li'),
    checkUpdateNow: document.createElement('button'),
    lastUpdateDate: document.createElement('small'),
    systemStatus: document.createElement('li'),
    generalInfo: document.createElement('p')
  };

  setup(function(done) {
    testRequire(modules, maps,
      function(MockNavigatorSettings, module) {
        realNavigatorSettings = navigator.mozSettings;
        navigator.mozSettings = MockNavigatorSettings;

        updateCheck = module();
        updateCheck._elements = elements;
        done();
    });
  });

  suiteTeardown(function() {
    navigator.mozSettings = realNavigatorSettings;
    realNavigatorSettings = null;
  });

  suite('initiation', function() {
    setup(function() {
      this.sinon.stub(updateCheck, '_loadLastUpdated');
      this.sinon.stub(updateCheck, '_checkForUpdates');

      updateCheck.init(elements);
    });

    test('_loadHardwareInfo and _loadLastUpdated are called while initiate',
      function() {
        assert.ok(updateCheck._loadLastUpdated.called);
    });

    test('_checkForUpdates is called when initiate', function() {
      updateCheck._elements.checkUpdateNow.dispatchEvent(
        new CustomEvent('click'));
      assert.ok(updateCheck._checkForUpdates.called);
    });
  });

  suite('checkForUpdates >', function() {
    setup(function() {
      this.sinon.stub(updateCheck, '_onUpdateStatus');
      updateCheck._checkForUpdates();
    });

    test('triggers the updates', function() {
      var setting = 'gaia.system.checkForUpdates';
      assert.isTrue(navigator.mozSettings.mSettings[setting]);
    });

    test('register handlers', function() {
      assert.isFunction(updateCheck._checkStatus[geckoUpdateSetting].cb);
      assert.isFunction(updateCheck._checkStatus[appsUpdateSetting].cb);
    });

    test('displays the checking updates text', function() {
      assert.isTrue(updateCheck._elements.updateStatus
        .classList.contains('checking'));
      assert.isTrue(updateCheck._elements.updateStatus
        .classList.contains('visible'));
      assert.equal(updateCheck._elements.systemStatus.textContent.length, 0);
    });

    suite('getting response for system update >', function() {
      suite('successful >', function() {
        setup(function() {
          navigator.mozSettings.mTriggerObservers(geckoUpdateSetting, {
            settingValue: 'check-complete'
          });
        });

        test('does not hide the status', function() {
          assert.isTrue(updateCheck._elements.updateStatus.classList
            .contains('visible'));
        });

        test('does not hide the checking updates text', function() {
          assert.isTrue(updateCheck._elements.updateStatus.classList
            .contains('checking'));
        });
      });
    });

    suite('getting response for app update >', function() {
      suite('successful >', function() {
        setup(function() {
          navigator.mozSettings.mTriggerObservers(appsUpdateSetting, {
            settingValue: 'check-complete'
          });
        });

        test('does not hide the status', function() {
          assert.isTrue(updateCheck._elements.updateStatus.classList
            .contains('visible'));
        });

        test('does not hide the checking updates text', function() {
          assert.isTrue(updateCheck._elements.updateStatus.classList
            .contains('checking'));
        });
      });
    });
  });

  suite('onUpdateStatus >', function() {
    setup(function() {
      this.sinon.stub(updateCheck, '_statusCompleteUpdater');
    });

    teardown(function() {
      navigator.mozSettings.mTeardown();
    });

    test('system update _checkStatus value is updated', function(){
      updateCheck._onUpdateStatus(geckoUpdateSetting,
        {settingValue: 'check-complete'});

      assert.equal(updateCheck._checkStatus[geckoUpdateSetting].value,
        'check-complete');
    });

    test('app update _checkStatus value is updated', function(){
      updateCheck._onUpdateStatus(appsUpdateSetting,
        {settingValue: 'check-complete'});

      assert.equal(updateCheck._checkStatus[appsUpdateSetting].value,
        'check-complete');
    });

    test('no-updates', function() {
      updateCheck._onUpdateStatus(appsUpdateSetting,
        {settingValue: 'no-updates'});

      assert.equal(updateCheck._elements.systemStatus
        .getAttribute('data-l10n-id'), 'no-updates');
    });

    test('already-latest-version', function() {
      updateCheck._onUpdateStatus(appsUpdateSetting,
        {settingValue: 'already-latest-version'});

      assert.equal(updateCheck._elements.systemStatus
        .getAttribute('data-l10n-id'), 'already-latest-version');
    });

    test('retry-when-online', function() {
      updateCheck._onUpdateStatus(appsUpdateSetting,
        {settingValue: 'retry-when-online'});

      assert.equal(updateCheck._elements.systemStatus
        .getAttribute('data-l10n-id'), 'retry-when-online');
    });

    test('check-error', function() {
      var errors = ['check-error-http-200', 'check-error-http-403',
                    'check-error-http-404', 'check-error-http-500',
                    'check-error-2152398878'];
      for (var i = 0; i < errors.length; i++) {
        updateCheck._onUpdateStatus(appsUpdateSetting,
          {settingValue: errors[i]});

        assert.equal(updateCheck._elements.systemStatus
          .getAttribute('data-l10n-id'), 'check-error');
      }
    });

    test('remove the system update handler', function() {
      this.sinon.spy(navigator.mozSettings, 'removeObserver');
      updateCheck._checkForUpdates();
      navigator.mozSettings.mTriggerObservers(geckoUpdateSetting, {
        settingValue: 'check-complete'
      });

      var removedObserver = navigator.mozSettings
        .mRemovedObservers[geckoUpdateSetting][0];
      assert.isFunction(removedObserver);
      assert.ok(navigator.mozSettings.removeObserver.calledWith(
        geckoUpdateSetting));
    });
  });

  suite('_statusCompleteUpdater >', function() {
    suite('both successful >', function() {
      setup(function() {
        updateCheck._elements.updateStatus.classList
          .add('checking', 'visible');
        updateCheck._checkStatus[geckoUpdateSetting].value = 'check-complete';
        updateCheck._checkStatus[appsUpdateSetting].value = 'check-complete';
        updateCheck._statusCompleteUpdater();
      });

      test('hides the status', function() {
        assert.isFalse(updateCheck._elements.updateStatus.classList
          .contains('visible'));
      });

      test('removes the text in the system description', function() {
        assert.equal(updateCheck._elements.systemStatus.textContent.length, 0);
      });

      test('hide the checking updates text', function() {
        assert.isFalse(updateCheck._elements.updateStatus.classList
          .contains('checking'));
      });
    });

    suite('not both successful >', function() {
      setup(function() {
        updateCheck._elements.updateStatus.classList
          .add('checking', 'visible');
        updateCheck._checkStatus[geckoUpdateSetting].value = 'no-updates';
        updateCheck._checkStatus[appsUpdateSetting].value = 'check-complete';
        updateCheck._statusCompleteUpdater();
      });

      test('hide the status', function() {
        assert.isFalse(updateCheck._elements.updateStatus.classList
          .contains('visible'));
      });

      test('hide the checking updates text', function() {
        assert.isFalse(updateCheck._elements.updateStatus.classList
          .contains('checking'));
      });

      suite('starting an update again >', function() {
        setup(function() {
          updateCheck._statusCompleteUpdater();
        });

        test('should remove the text', function() {
          assert.equal(updateCheck._elements.systemStatus
            .textContent.length, 0);
        });
      });
    });
  });
});
