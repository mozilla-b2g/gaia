'use strict';

requireApp('settings/test/unit/mock_l10n.js');
requireApp('settings/test/unit/mock_navigator_settings.js');
requireApp('settings/test/unit/mock_settings.js');
requireApp('settings/test/unit/mocks_helper.js');
requireApp('settings/js/about.js');
requireApp('../../shared/js/screen_layout.js');

var mocksForAbout = ['Settings'];

mocksForAbout.forEach(function(mockName) {
  if (! window[mockName]) {
    window[mockName] = null;
  }
});

if (!window.getMobileConnection) {
  window.getMobileConnection = null;
}

suite('about >', function() {
  var realL10n, realNavigatorSettings, realGetMobileConnection;
  var updateStatusNode, systemStatus, generalInfo;
  var mocksHelper;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realGetMobileConnection = window.getMobileConnection;
    window.getMobileConnection = function() {
      return null;
    };
    realNavigatorSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    mocksHelper = new MocksHelper(mocksForAbout);
    mocksHelper.suiteSetup();
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    realL10n = null;

    navigator.mozSettings = realNavigatorSettings;
    realNavigatorSettings = null;
    window.getMobileConnection = realGetMobileConnection;
    realGetMobileConnection = null;
    mocksHelper.suiteTeardown();
  });

  setup(function() {
    mocksHelper.setup();

    var updateNodes =
      '<section id="root" role="region"></section>' +
      '<ul>' +
        '<li>' +
          '<label>' +
            '<button id="check-update-now">Check Now</button>' +
          '</label>' +
        '</li>' +
        '<li id="update-status" class="description">' +
          '<p class="general-information description">' +
            'Checking for update...</p>' +
          '<p class="system-update-status description"></p>' +
        '</li>' +
        '<li>' +
          '<label>' +
            '<button id="ftuLauncher" data-l10n-id="launch-ftu">' +
            'Launch FTU</button>' +
          '</label>' +
        '</li>' +
        '<li>' +
          '<small id="gaia-commit-hash"></small>' +
          '<a id="gaia-commit-date"></a>' +
        '</li>' +
      '</ul>';

    document.body.insertAdjacentHTML('beforeend', updateNodes);

    updateStatusNode = document.getElementById('update-status');
    systemStatus = updateStatusNode.querySelector('.system-update-status');
    generalInfo = updateStatusNode.querySelector('.general-information');

    About.init();
  });

  teardown(function() {
    mocksHelper.teardown();
    MockNavigatorSettings.mTeardown();
  });

  suite('checkForUpdates >', function() {
    var geckoUpdateSetting, appsUpdateSetting,
        geckoUpdateHandlers, appsUpdateHandlers;

    setup(function() {
      About.checkForUpdates();

      geckoUpdateSetting = 'gecko.updateStatus';
      appsUpdateSetting = 'apps.updateStatus';
      geckoUpdateHandlers =
        MockNavigatorSettings.mObservers[geckoUpdateSetting];
      appsUpdateHandlers =
        MockNavigatorSettings.mObservers[appsUpdateSetting];
    });

    test('triggers the updates', function() {
      var setting = 'gaia.system.checkForUpdates';
      assert.isTrue(MockNavigatorSettings.mSettings[setting]);
    });

    test('register handlers', function() {
      assert.isFunction(geckoUpdateHandlers[0]);
      assert.isFunction(appsUpdateHandlers[0]);
    });

    test('displays the checking updates text', function() {
      assert.isTrue(updateStatusNode.classList.contains('checking'));
      assert.isTrue(updateStatusNode.classList.contains('visible'));
      assert.notEqual(generalInfo.textContent.length, 0);
    });


    suite('getting response for system update >', function() {
      suite('successful >', function() {
        setup(function() {
          MockNavigatorSettings.mTriggerObservers(geckoUpdateSetting, {
            settingValue: 'check-complete'
          });
        });

        test('does not hide the status', function() {
          assert.isTrue(updateStatusNode.classList.contains('visible'));
        });

        test('does not hide the checking updates text', function() {
          assert.isTrue(updateStatusNode.classList.contains('checking'));
        });

        test('remove the handler', function() {
          var removedObservers = MockNavigatorSettings.mRemovedObservers;
          var removedObserver = removedObservers[geckoUpdateSetting][0];
          assert.isFunction(removedObserver);
          assert.equal(removedObserver, geckoUpdateHandlers[0]);
        });
      });


      test('no-updates', function() {
        MockNavigatorSettings.mTriggerObservers(geckoUpdateSetting, {
          settingValue: 'no-updates'
        });
        assert.equal(systemStatus.textContent, 'no-updates');
      });

      test('already-latest-version', function() {
        MockNavigatorSettings.mTriggerObservers(geckoUpdateSetting, {
          settingValue: 'already-latest-version'
        });
        assert.equal(systemStatus.textContent, 'already-latest-version');
      });

      test('retry-when-online', function() {
        MockNavigatorSettings.mTriggerObservers(geckoUpdateSetting, {
          settingValue: 'retry-when-online'
        });
        assert.equal(systemStatus.textContent, 'retry-when-online');
      });

      test('check-error', function() {
        var errors = ['check-error-http-200', 'check-error-http-403',
                      'check-error-http-404', 'check-error-http-500',
                      'check-error-2152398878'];
        for (var i = 0; i < errors.length; i++) {
          MockNavigatorSettings.mTriggerObservers(geckoUpdateSetting, {
            settingValue: errors[i]
          });
          assert.equal(systemStatus.textContent, errors[i]);
        }
      });
    });

    suite('getting response for app update >', function() {
      suite('successful >', function() {
        setup(function() {
          MockNavigatorSettings.mTriggerObservers(appsUpdateSetting, {
            settingValue: 'check-complete'
          });
        });

        test('does not hide the status', function() {
          assert.isTrue(updateStatusNode.classList.contains('visible'));
        });

        test('does not hide the checking updates text', function() {
          assert.isTrue(updateStatusNode.classList.contains('checking'));
        });

        test('remove the handler', function() {
          var removedObservers = MockNavigatorSettings.mRemovedObservers;
          var removedObserver = removedObservers[appsUpdateSetting][0];
          assert.isFunction(removedObserver);
          assert.equal(removedObserver, appsUpdateHandlers[0]);
        });
      });
    });

    suite('getting response for both updates >', function() {
      suite('both successful >', function() {
        setup(function() {
          MockNavigatorSettings.mTriggerObservers('gecko.updateStatus', {
            settingValue: 'check-complete'
          });
          MockNavigatorSettings.mTriggerObservers('apps.updateStatus', {
            settingValue: 'check-complete'
          });
        });

        test('hides the status', function() {
          assert.isFalse(updateStatusNode.classList.contains('visible'));
        });

        test('removes the text in the system description', function() {
          assert.equal(systemStatus.textContent.length, 0);
        });

        test('hide the checking updates text', function() {
          assert.isFalse(updateStatusNode.classList.contains('checking'));
        });
      });

      suite('not both successful >', function() {
        setup(function() {
          MockNavigatorSettings.mTriggerObservers('gecko.updateStatus', {
            settingValue: 'no-updates'
          });
          MockNavigatorSettings.mTriggerObservers('apps.updateStatus', {
            settingValue: 'check-complete'
          });
        });

        test('do not hide the status', function() {
          assert.isTrue(updateStatusNode.classList.contains('visible'));
        });

        test('hide the checking updates text', function() {
          assert.isFalse(updateStatusNode.classList.contains('checking'));
        });

        suite('starting an update again >', function() {
          setup(function() {
            About.checkForUpdates();
          });

          test('should remove the text', function() {
            assert.equal(systemStatus.textContent.length, 0);
          });
        });
      });
    });
  });
});
