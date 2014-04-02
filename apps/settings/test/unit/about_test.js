/* global MockL10n, MockNavigatorMozMobileConnections,
          MockNavigatorMozIccManager, MockNavigatorSettings, MocksHelper,
          About */

'use strict';

requireApp('settings/test/unit/mock_l10n.js');
requireApp('settings/test/unit/mock_navigator_settings.js');
requireApp('settings/test/unit/mock_settings.js');
requireApp('settings/test/unit/mocks_helper.js');
requireApp('settings/js/about.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');

var mocksForAbout = [
  'Settings',
  'NavigatorMozMobileConnections',
  'NavigatorMozIccManager'
];

mocksForAbout.forEach(function(mockName) {
  if (! window[mockName]) {
    window[mockName] = null;
  }
});

suite('about >', function() {
  var realL10n, realNavigatorSettings, realMobileConnections, realIccManager;
  var updateStatusNode, systemStatus, generalInfo;
  var mocksHelper;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;
    realMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
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
    navigator.mozMobileConnections = realMobileConnections;
    realMobileConnections = null;
    navigator.mozIccManager = realIccManager;
    realIccManager = null;
    mocksHelper.suiteTeardown();
  });

  setup(function() {
    mocksHelper.setup();

    var updateNodes =
      '<section id="root" role="region"></section>' +
      '<ul>' +
        '<li id="deviceinfo-phone-num">' +
          '<small id="deviceInfo-msisdns"></small>' +
        '</li>' +
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

  suite('loadHardwareInfo >', function() {
    var deviceInfoPhoneNum;
    var iccIds = ['12345', '22345'];
    var sandbox = sinon.sandbox.create();

    setup(function() {
      deviceInfoPhoneNum = document.getElementById('deviceinfo-phone-num');
      MockNavigatorMozIccManager.addIcc(iccIds[0]);
      MockNavigatorMozMobileConnections[0].iccId = iccIds[0];
    });

    teardown(function() {
      sandbox.restore();
    });

    suite('single sim', function() {
      test('the list item should be hidden when without iccinfo',
        function() {
          MockNavigatorMozIccManager.getIccById(iccIds[0]).iccInfo = null;
          About.loadHardwareInfo();
          assert.isTrue(deviceInfoPhoneNum.hidden);
      });

      test('should show unknown phone number when no msisdn and mdn',
        function() {
          MockNavigatorMozIccManager.getIccById(iccIds[0]).iccInfo = {};
          sandbox.spy(MockL10n, 'localize');
          About.loadHardwareInfo();
          var span =
            deviceInfoPhoneNum.querySelector('#deviceInfo-msisdns span');
          sinon.assert.calledWith(MockL10n.localize, span,
            'unknown-phoneNumber');
      });

      test('should show correct value when with mdn', function() {
        MockNavigatorMozIccManager.getIccById(iccIds[0]).iccInfo =
          { mdn: 'mdn' };
        About.loadHardwareInfo();
        var span = deviceInfoPhoneNum.querySelector('#deviceInfo-msisdns span');
        assert.equal(span.textContent, 'mdn');
      });

      test('should show correct value when with msisdn', function() {
        MockNavigatorMozIccManager.getIccById(iccIds[0]).iccInfo =
          { msisdn: 'msisdn' };
        About.loadHardwareInfo();
        var span = deviceInfoPhoneNum.querySelector('#deviceInfo-msisdns span');
        assert.equal(span.textContent, 'msisdn');
      });
    });

    suite('multiple sim', function() {
      setup(function() {
        MockNavigatorMozIccManager.addIcc(iccIds[1]);
        MockNavigatorMozMobileConnections.mAddMobileConnection();
        MockNavigatorMozMobileConnections[1].iccId = iccIds[1];
        MockNavigatorMozIccManager.getIccById(iccIds[0]).iccInfo =
          { mdn: 'mdn1' };
        MockNavigatorMozIccManager.getIccById(iccIds[1]).iccInfo =
          { mdn: 'mdn2' };
      });

      test('the list item should be hidden when without iccinfo',
        function() {
          MockNavigatorMozIccManager.getIccById(iccIds[0]).iccInfo = null;
          MockNavigatorMozIccManager.getIccById(iccIds[1]).iccInfo = null;
          About.loadHardwareInfo();
          assert.isTrue(deviceInfoPhoneNum.hidden);
      });

      test('should show the list item when there are iccinfos', function() {
        MockNavigatorMozIccManager.getIccById(iccIds[0]).iccInfo = null;
        MockNavigatorMozIccManager.getIccById(iccIds[1]).iccInfo = {};
        About.loadHardwareInfo();
        assert.isFalse(deviceInfoPhoneNum.hidden);
      });

      test('should show unknown phone number when no msisdn and mdn',
        function() {
          MockNavigatorMozIccManager.getIccById(iccIds[0]).iccInfo = {};
          MockNavigatorMozIccManager.getIccById(iccIds[1]).iccInfo = {};
          sandbox.spy(MockL10n, 'localize');
          About.loadHardwareInfo();
          var spans =
            deviceInfoPhoneNum.querySelectorAll('#deviceInfo-msisdns span');

          assert.deepEqual(MockL10n.localize.args[0], [
            spans[0], 'unknown-phoneNumber-sim', { index: 1 }
          ]);
          assert.deepEqual(MockL10n.localize.args[1], [
            spans[1], 'unknown-phoneNumber-sim', { index: 2 }
          ]);
      });

      test('should show correct sim indicator', function() {
        About.loadHardwareInfo();
        var spans =
          deviceInfoPhoneNum.querySelectorAll('#deviceInfo-msisdns span');
        assert.equal(spans[0].textContent, 'SIM 1: mdn1');
        assert.equal(spans[1].textContent, 'SIM 2: mdn2');
      });
    });
  });
});
