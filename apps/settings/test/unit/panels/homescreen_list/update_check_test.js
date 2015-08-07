'use strict';

suite('homescreen_list > update_check', () => {
  var modules = [
    'shared_mocks/mock_l10n',
    'shared_mocks/mock_navigator_moz_settings',
    'panels/homescreen_list/update_check'
  ];

  const geckoUpdateSetting = 'gecko.updateStatus';
  const appsUpdateSetting = 'apps.updateStatus';
  var elements = {
    checkUpdateNow: document.createElement('button'),
    updateStatus: document.createElement('li'),
    systemStatus: document.createElement('span')
  };
  var realL10n;
  var realNavigatorSettings;
  var updateCheck;

  setup(done => {
    testRequire(modules, {}, (MockL10n, MockNavigatorSettings, UpdateCheck) => {
      realL10n = navigator.mozL10n;
      navigator.mozL10n = MockL10n;

      realNavigatorSettings = navigator.mozSettings;
      navigator.mozSettings = MockNavigatorSettings;

      updateCheck = UpdateCheck();
      updateCheck._elements = elements;
      done();
    });
  });

  teardown(() => {
    navigator.mozL10n = realL10n;
    realL10n = null;

    navigator.mozSettings = realNavigatorSettings;
    realNavigatorSettings = null;
  });

  suite('initiation', () => {
    setup(() => {
      this.sinon.stub(updateCheck, '_checkForUpdates');

      updateCheck.init(elements);
    });

    test('_checkForUpdates is called when initiate', () => {
      updateCheck._elements.checkUpdateNow.dispatchEvent(
        new CustomEvent('click'));
      assert.ok(updateCheck._checkForUpdates.called);
    });
  });

  suite('checkForUpdates >', () => {
    setup(() => {
      this.sinon.stub(updateCheck, '_onUpdateStatus');
      updateCheck._checkForUpdates();
    });

    test('triggers the updates', () => {
      var setting = 'gaia.system.checkForUpdates';
      assert.isTrue(navigator.mozSettings.mSettings[setting]);
    });

    test('register handlers', () => {
      assert.isFunction(updateCheck._checkStatus[geckoUpdateSetting].cb);
      assert.isFunction(updateCheck._checkStatus[appsUpdateSetting].cb);
    });

    test('displays the checking updates text', () => {
      assert.isTrue(updateCheck._elements.updateStatus
        .classList.contains('checking'));
      assert.isTrue(updateCheck._elements.updateStatus
        .classList.contains('visible'));
      assert.equal(updateCheck._elements.systemStatus.textContent.length, 0);
    });

    suite('getting response for system update >', () => {
      suite('successful >', () => {
        setup(() => {
          navigator.mozSettings.mTriggerObservers(geckoUpdateSetting, {
            settingValue: 'check-complete'
          });
        });

        test('does not hide the status', () => {
          assert.isTrue(updateCheck._elements.updateStatus.classList
            .contains('visible'));
        });

        test('does not hide the checking updates text', () => {
          assert.isTrue(updateCheck._elements.updateStatus.classList
            .contains('checking'));
        });
      });
    });

    suite('getting response for app update >', () => {
      suite('successful >', () => {
        setup(() => {
          navigator.mozSettings.mTriggerObservers(appsUpdateSetting, {
            settingValue: 'check-complete'
          });
        });

        test('does not hide the status', () => {
          assert.isTrue(updateCheck._elements.updateStatus.classList
            .contains('visible'));
        });

        test('does not hide the checking updates text', () => {
          assert.isTrue(updateCheck._elements.updateStatus.classList
            .contains('checking'));
        });
      });
    });
  });

  suite('onUpdateStatus >', () => {
    setup(() => {
      this.sinon.stub(updateCheck, '_statusCompleteUpdater');
    });

    teardown(() => {
      navigator.mozSettings.mTeardown();
    });

    test('system update _checkStatus value is updated', () => {
      updateCheck._onUpdateStatus(geckoUpdateSetting,
        {settingValue: 'check-complete'});

      assert.equal(updateCheck._checkStatus[geckoUpdateSetting].value,
        'check-complete');
    });

    test('app update _checkStatus value is updated', () => {
      updateCheck._onUpdateStatus(appsUpdateSetting,
        {settingValue: 'check-complete'});

      assert.equal(updateCheck._checkStatus[appsUpdateSetting].value,
        'check-complete');
    });

    test('no-updates', () => {
      updateCheck._onUpdateStatus(appsUpdateSetting,
        {settingValue: 'no-updates'});

      assert.equal(updateCheck._elements.systemStatus
        .getAttribute('data-l10n-id'), 'no-updates');
    });

    test('already-latest-version', () => {
      updateCheck._onUpdateStatus(appsUpdateSetting,
        {settingValue: 'already-latest-version'});

      assert.equal(updateCheck._elements.systemStatus
        .getAttribute('data-l10n-id'), 'already-latest-version');
    });

    test('retry-when-online', () => {
      updateCheck._onUpdateStatus(appsUpdateSetting,
        {settingValue: 'retry-when-online'});

      assert.equal(updateCheck._elements.systemStatus
        .getAttribute('data-l10n-id'), 'retry-when-online');
    });

    test('check-error', () => {
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

    test('remove the system update handler', () => {
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

  suite('_statusCompleteUpdater >', () => {
    suite('both successful >', () => {
      setup(() => {
        updateCheck._elements.updateStatus.classList
          .add('checking', 'visible');
        updateCheck._checkStatus[geckoUpdateSetting].value = 'check-complete';
        updateCheck._checkStatus[appsUpdateSetting].value = 'check-complete';
        updateCheck._statusCompleteUpdater();
      });

      test('hides the status', () => {
        assert.isFalse(updateCheck._elements.updateStatus.classList
          .contains('visible'));
      });

      test('removes the text in the system description', () => {
        assert.equal(updateCheck._elements.systemStatus.textContent.length, 0);
      });

      test('hide the checking updates text', () => {
        assert.isFalse(updateCheck._elements.updateStatus.classList
          .contains('checking'));
      });
    });

    suite('not both successful >', () => {
      setup(() => {
        updateCheck._elements.updateStatus.classList
          .add('checking', 'visible');
        updateCheck._checkStatus[geckoUpdateSetting].value = 'no-updates';
        updateCheck._checkStatus[appsUpdateSetting].value = 'check-complete';
        updateCheck._statusCompleteUpdater();
      });

      test('hide the status', () => {
        assert.isFalse(updateCheck._elements.updateStatus.classList
          .contains('visible'));
      });

      test('hide the checking updates text', () => {
        assert.isFalse(updateCheck._elements.updateStatus.classList
          .contains('checking'));
      });

      suite('starting an update again >', () => {
        setup(() => {
          updateCheck._statusCompleteUpdater();
        });

        test('should remove the text', () => {
          assert.equal(updateCheck._elements.systemStatus
            .textContent.length, 0);
        });
      });
    });
  });
});
