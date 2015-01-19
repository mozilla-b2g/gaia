'use strict';

/* global
   AppUpdatable,
   asyncStorage,
   MocksHelper,
   MockApp,
   MockAppsMgmt,
   MockChromeEvent,
   MockCustomDialog,
   MockNavigatorBattery,
   MockNavigatorSettings,
   MockService,
   MockUpdateManager,
   MockUtilityTray,
   SystemUpdatable
 */

requireApp('system/js/updatable.js');
requireApp('system/test/unit/mock_app.js');
requireApp('system/test/unit/mock_asyncStorage.js');
requireApp('system/test/unit/mock_update_manager.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_apps_mgmt.js');
requireApp('system/test/unit/mock_chrome_event.js');
requireApp('system/test/unit/mock_utility_tray.js');
requireApp('system/test/unit/mock_navigator_battery.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/shared/test/unit/mocks/mock_custom_dialog.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');

var mocksHelperForUpdatable = new MocksHelper([
  'CustomDialog',
  'UpdateManager',
  'AppWindowManager',
  'UtilityTray',
  'ManifestHelper',
  'asyncStorage',
  'Service'
]).init();

suite('system/Updatable', function() {
  var subject;
  var mockApp;

  var realDispatchEvent;
  var realL10n;
  var realMozApps;
  var realMozSettings;

  var lastDispatchedEvent = null;
  var fakeDispatchEvent;

  var MID_CHARGE = 50;
  var BATTERY_THRESHOLD_PLUGGED = 'app.update.battery-threshold.plugged';
  var BATTERY_THRESHOLD_UNPLUGGED = 'app.update.battery-threshold.unplugged';
  var SYSTEM_LOW_BATTERY_L10N_KEY = 'systemUpdateLowBatteryThreshold';

  mocksHelperForUpdatable.attachTestHelpers();
  suiteSetup(function() {
    realMozSettings = window.navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      get: function get(key) {
        return key;
      }
    };
    var getSpy = sinon.spy(navigator.mozL10n, 'get');
    getSpy.withArgs(SYSTEM_LOW_BATTERY_L10N_KEY);

    // we used to set subject._mgmt in setup
    // but now, this seems to work and feels cleaner
    realMozApps = navigator.mozApps;
    navigator.mozApps = { mgmt: MockAppsMgmt };
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    navigator.mozApps = realMozApps;
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    this.sinon.stub(MockService, 'request', function(action) {
      if (action === 'showCustomDialog') {
        MockCustomDialog.show(
          arguments[1],
          arguments[2],
          arguments[3],
          arguments[4]);
      } else {
        MockCustomDialog.hide(
          arguments[1],
          arguments[2],
          arguments[3],
          arguments[4]);
      }
    });
    mockApp = new MockApp();
    subject = new AppUpdatable(mockApp);

    MockNavigatorSettings.mSettings[BATTERY_THRESHOLD_UNPLUGGED] = 25;
    MockNavigatorSettings.mSettings[BATTERY_THRESHOLD_PLUGGED] = 10;

    navigator.mozL10n.get.withArgs(SYSTEM_LOW_BATTERY_L10N_KEY).reset();

    fakeDispatchEvent = function(type, value) {
      lastDispatchedEvent = {
        type: type,
        value: value
      };
    };
    subject._dispatchEvent = fakeDispatchEvent;

    var fakeScreen = document.createElement('div');
    fakeScreen.id = 'screen';
    document.body.appendChild(fakeScreen);
  });

  teardown(function() {
    MockAppsMgmt.mTeardown();

    subject._dispatchEvent = realDispatchEvent;
    lastDispatchedEvent = null;
  });

  function downloadAvailableSuite(name, setupFunc) {
    suite(name, function() {
      setup(setupFunc);

      test('should add self to the available downloads', function() {
        assert.isNotNull(MockUpdateManager.mLastUpdatesAdd);
        assert.equal(MockUpdateManager.mLastUpdatesAdd.app.mId,
                     mockApp.mId);
      });

      suite('first progress', function() {
        setup(function() {
          mockApp.mTriggerDownloadProgress(42);
        });

        test('should add self to active downloads', function() {
          assert.isNotNull(MockUpdateManager.mLastDownloadsAdd);
          assert.equal(MockUpdateManager.mLastDownloadsAdd.app.mId,
                      mockApp.mId);
        });

        test('should start with first progress value', function() {
          assert.equal(42, subject.progress);
        });
      });
    });
  }

  suite('init', function() {
    test('should keep a reference to the app', function() {
      assert.equal(mockApp, subject.app);
    });

    test('should handle fresh app with just an updateManifest', function() {
      var freshApp = new MockApp();
      freshApp.manifest = undefined;
      subject = new AppUpdatable(freshApp);
      assert.equal(freshApp, subject.app);
    });

    test('should add itself to updatable apps', function() {
      assert.equal(MockUpdateManager.mLastUpdatableAdd, subject);
    });

    test('should remember about the update on startup', function() {
      asyncStorage.mItems[SystemUpdatable.KNOWN_UPDATE_FLAG] = true;
      var systemUpdatable = new SystemUpdatable(); // jshint ignore:line
      assert.equal(MockUpdateManager.mCheckForUpdatesCalledWith, true);
    });

    downloadAvailableSuite('app has a download available', function() {
      mockApp.downloadAvailable = true;
      subject = new AppUpdatable(mockApp);
    });

    suite('applyDownload', function() {
      setup(function() {
        mockApp.readyToApplyDownload = true;
        subject = new AppUpdatable(mockApp);
      });

      test('should apply update if downloaded', function() {
        assert.equal(MockAppsMgmt.mLastAppApplied, mockApp);
      });

      test('should kill the app if downloaded', function() {
        assert.isTrue(MockService.request.calledWith('kill', mockApp.origin));
      });
    });

  });

  suite('infos', function() {
    suite('name', function() {
      test('should give a name for app updates', function() {
        assert.equal('Mock app', subject.name);
      });
    });

    suite('size', function() {
      test('should give packaged app update size', function() {
        assert.equal(null, subject.size);
      });

      test('should return null for hosted apps', function() {
        mockApp.updateManifest = null;
        subject = new AppUpdatable(mockApp);
        assert.isNull(subject.size);
      });

      test('should update size on download available', function() {
        mockApp.updateManifest = null;
        subject = new AppUpdatable(mockApp);
        assert.isNull(subject.size);

        mockApp.mTriggerDownloadAvailable(45678);
        assert.equal(45678, subject.size);
      });
    });
  });

  suite('actions', function() {
    suite('ask for download', function() {
      setup(function() {
        mockApp.mTriggerDownloadAvailable();
        subject.download();
      });

      test('should call download on the app', function() {
        assert.isTrue(mockApp.mDownloadCalled);
      });
    });

    suite('download system update', function() {
      setup(function() {
        subject = new SystemUpdatable(42);
        subject._dispatchEvent = fakeDispatchEvent;
        subject.progress = 42;
        subject.download();
      });

      test('should send download message for system updates', function() {
        assert.equal('update-available-result', lastDispatchedEvent.type);
        assert.equal('download', lastDispatchedEvent.value);
      });

      test('should add system updates to active downloads too', function() {
        assert.isNotNull(MockUpdateManager.mLastDownloadsAdd);
        assert.equal(subject, MockUpdateManager.mLastDownloadsAdd);
      });

      test('should start system updates with progress 0 too', function() {
        assert.equal(subject.progress, 0);
      });

      test('should do nothing if already downloading', function() {
        lastDispatchedEvent = null;
        subject.progress = 42;
        subject.download();

        assert.equal(subject.progress, 42);
        assert.isNull(lastDispatchedEvent);
      });
    });

    suite('cancel app update download', function() {
      setup(function() {
        subject.cancelDownload();
      });

      test('should call cancelDownload on the app', function() {
        assert.isTrue(mockApp.mCancelCalled);
      });
    });

    suite('cancel system update download', function() {
      setup(function() {
        asyncStorage.setItem(SystemUpdatable.KNOWN_UPDATE_FLAG, true);
        subject = new SystemUpdatable(42);
        subject.download();
        subject._dispatchEvent = fakeDispatchEvent;
        subject.cancelDownload();
      });

      test('should send cancel message', function() {
        assert.equal('update-download-cancel', lastDispatchedEvent.type);
      });

      test('should remove the downloading flag', function() {
        assert.isFalse(subject.downloading);
      });
    });
  });

  suite('events', function() {
    suite('apps events', function() {
      // This function checks that we release the callbacks properly
      // at the end of a download. Assumes subject.download() was called.
      function testCleanup() {
        test('should stop responding to progress', function() {
          mockApp.mTriggerDownloadProgress(42);
          assert.notEqual(subject.progress, 42);
        });

        test('should stop responding to error', function() {
          MockUpdateManager.mErrorBannerRequested = false;
          mockApp.mTriggerDownloadError();
          assert.isFalse(MockUpdateManager.mErrorBannerRequested);
        });

        test('progress should be reset', function() {
          assert.isNull(subject.progress);
        });
      }

      downloadAvailableSuite('ondownloadavailable', function() {
        mockApp.mTriggerDownloadAvailable();
      });

      suite('ondownloadavailable when not installed', function() {
        setup(function() {
          mockApp.installState = 'pending';
          mockApp.mTriggerDownloadAvailable();
        });

        test('should not add self to the available downloads', function() {
          assert.isNull(MockUpdateManager.mLastUpdatesAdd);
        });

        test('should not answer to progress', function() {
          mockApp.mTriggerDownloadSuccess();
          assert.isNull(MockUpdateManager.mLastDownloadsRemoval);
        });
      });

      suite('downloadavailable at init when not installed', function() {
        setup(function() {
          mockApp.installState = 'pending';
          subject = new AppUpdatable(mockApp);
          mockApp.mTriggerDownloadAvailable();
        });

        test('should not add self to the available downloads', function() {
          assert.isNull(MockUpdateManager.mLastUpdatesAdd);
        });

        test('should not answer to progress', function() {
          mockApp.mTriggerDownloadSuccess();
          assert.isNull(MockUpdateManager.mLastDownloadsRemoval);
        });
      });

      suite('ondownloadsuccess', function() {
        test('should remove self from active downloads', function() {
          mockApp.mTriggerDownloadAvailable();
          mockApp.mTriggerDownloadProgress(42);
          mockApp.mTriggerDownloadSuccess();
          assert.isNotNull(MockUpdateManager.mLastDownloadsRemoval);
          assert.equal(MockUpdateManager.mLastDownloadsRemoval.app.mId,
                       mockApp.mId);
        });

        test('should call downloaded of UpdateManager', function() {
          mockApp.mTriggerDownloadAvailable();
          mockApp.mTriggerDownloadProgress(42);
          mockApp.mTriggerDownloadSuccess();
          assert.isTrue(MockUpdateManager.mDownloadedCalled);
        });

        test('should not remove self if not downloading', function() {
          mockApp.mTriggerDownloadSuccess();
          assert.isNull(MockUpdateManager.mLastDownloadsRemoval);
        });

        test('should remove self from available downloads', function() {
          mockApp.mTriggerDownloadAvailable();
          mockApp.mTriggerDownloadProgress(42);
          mockApp.mTriggerDownloadSuccess();
          assert.isNotNull(MockUpdateManager.mLastUpdatesRemoval);
          assert.equal(MockUpdateManager.mLastUpdatesRemoval.app.mId,
                       mockApp.mId);
        });

        suite('application of the download', function() {
          test('should apply if the app is not in foreground', function() {
            mockApp.mTriggerDownloadAvailable();
            MockService.mockQueryWith('AppWindowManager.getActiveWindow',
              { origin: 'homescreen' });
            mockApp.mTriggerDownloadSuccess();
            assert.isNotNull(MockAppsMgmt.mLastAppApplied);
            assert.equal(MockAppsMgmt.mLastAppApplied.mId, mockApp.mId);
          });

          test('should wait for appwillclose if it is', function() {
            var origin = 'http://testapp.gaiamobile.org';
            mockApp.origin = origin;
            MockService.mockQueryWith('AppWindowManager.getActiveWindow',
              mockApp);

            mockApp.mTriggerDownloadAvailable();
            mockApp.mTriggerDownloadSuccess();
            assert.isNull(MockAppsMgmt.mLastAppApplied);

            var evt = document.createEvent('CustomEvent');
            evt.initCustomEvent('appwillclose', true, false,
                                { origin: origin });
            window.dispatchEvent(evt);

            assert.isNotNull(MockAppsMgmt.mLastAppApplied);
            assert.equal(MockAppsMgmt.mLastAppApplied.mId, mockApp.mId);
          });

          test('should kill the app before applying the update', function() {
            MockService.mockQueryWith('AppWindowManager.getActiveWindow',
              { origin: 'test' });
            mockApp.mTriggerDownloadAvailable();
            mockApp.mTriggerDownloadSuccess();
            assert.isTrue(MockService.request.calledWith('kill',
              'https://testapp.gaiamobile.org'));
          });
        });
      });

      suite('ondownloaderror', function() {
        setup(function() {
          mockApp.mTriggerDownloadAvailable();
          mockApp.mTriggerDownloadError();
        });

        test('should request error banner', function() {
          assert.isTrue(MockUpdateManager.mErrorBannerRequested);
        });

        test('should remove self from active downloads', function() {
          assert.isNotNull(MockUpdateManager.mLastDownloadsRemoval);
          assert.equal(MockUpdateManager.mLastDownloadsRemoval.app.mId,
                       mockApp.mId);
        });

        test('progress should be reset', function() {
          assert.isNull(subject.progress);
        });

        test('should still answer to progress events', function() {
          mockApp.mTriggerDownloadProgress(42);
          assert.equal(42, subject.progress);
        });
      });

      suite('ondownloaderror, downloadAvailable = false', function() {
        setup(function() {
          mockApp.mTriggerDownloadAvailable();
          mockApp.downloadAvailable = false;
          mockApp.mTriggerDownloadError();
        });

        test('should remove self from available updates', function() {
          assert.equal(MockUpdateManager.mLastUpdatesRemoval, subject);
        });
      });

      suite('onprogress', function() {
        setup(function() {
          mockApp.mTriggerDownloadAvailable();
        });

        test('should send progress to update manager', function() {
          mockApp.mTriggerDownloadProgress(1234);
          assert.equal(1234, MockUpdateManager.mProgressCalledWith);
        });

        test('should send progress delta to update manager', function() {
          mockApp.mTriggerDownloadProgress(1234);
          mockApp.mTriggerDownloadProgress(2234);
          assert.equal(1000, MockUpdateManager.mProgressCalledWith);
        });
      });

      suite('ondownloadapplied', function() {
        setup(function() {
          mockApp.mTriggerDownloadAvailable();
          mockApp.mTriggerDownloadApplied();
        });

        testCleanup();
      });
    });

    suite('system update events', function() {

      function forceBatteryThresholdToMidCharge() {
        return {
          then: function(callback) {
            callback(MID_CHARGE);
          }
        };
      }

      setup(function() {
        subject = new SystemUpdatable(42);
        sinon.stub(subject, 'getBatteryPercentageThreshold',
                   forceBatteryThresholdToMidCharge);
        subject._dispatchEvent = fakeDispatchEvent;
        subject.download();
      });

      suite('update-downloaded', function() {
        setup(function() {
          asyncStorage.setItem(SystemUpdatable.KNOWN_UPDATE_FLAG, true);
          var event = new MockChromeEvent({
            type: 'update-downloaded'
          });
          subject.handleEvent(event);
        });

        test('should reset the downloading flag', function() {
          assert.isFalse(subject.downloading);
        });

        test('should signal the UpdateManager', function() {
          assert.isTrue(MockUpdateManager.mDownloadedCalled);
        });

        test('should reset SystemUpdatable.KNOWN_UPDATE_FLAG', function() {
          assert.isUndefined(
            asyncStorage.mItems[SystemUpdatable.KNOWN_UPDATE_FLAG]);
        });

        testSystemApplyPrompt();
      });

      suite('update-prompt-apply', function() {
        setup(function() {
          asyncStorage.setItem(SystemUpdatable.KNOWN_UPDATE_FLAG, true);
          MockUtilityTray.show();
          var event = new MockChromeEvent({
            type: 'update-prompt-apply'
          });
          subject.handleEvent(event);
        });

        test('should reset SystemUpdatable.KNOWN_UPDATE_FLAG', function() {
          assert.isUndefined(
            asyncStorage.mItems[SystemUpdatable.KNOWN_UPDATE_FLAG]);
        });

        testSystemApplyPrompt();
      });

      suite('update-error', function() {
        setup(function() {
          subject = new SystemUpdatable(42);
          var event = new MockChromeEvent({
            type: 'update-error'
          });
          subject.handleEvent(event);
        });

        test('should request error banner', function() {
          assert.isTrue(MockUpdateManager.mErrorBannerRequested);
        });

        test('should remove self from active downloads', function() {
          assert.isNotNull(MockUpdateManager.mLastDownloadsRemoval);
          assert.equal(subject, MockUpdateManager.mLastDownloadsRemoval);
        });

        test('should remove the downloading flag', function() {
          assert.isFalse(subject.downloading);
        });
      });

      suite('update download events', function() {
        var event;
        setup(function() {
          subject = new SystemUpdatable(98734);
          subject.download();
        });

        suite('when the download starts', function() {
          setup(function() {
            event = new MockChromeEvent({
              type: 'update-download-started',
              total: 98734
            });
          });

          test('should clear paused flag', function() {
            subject.paused = true;
            subject.handleEvent(event);
            assert.isFalse(subject.paused);
          });
        });

        suite('when the download receives progress', function() {
          setup(function() {
            event = new MockChromeEvent({
              type: 'update-download-progress',
              progress: 1234,
              total: 98734
            });
          });

          test('should send progress to update manager', function() {
            subject.handleEvent(event);
            assert.equal(1234, MockUpdateManager.mProgressCalledWith);
          });

          test('should send progress delta to update manager', function() {
            subject.handleEvent(event);
            event.detail.progress = 2234;
            subject.handleEvent(event);
            assert.equal(1000, MockUpdateManager.mProgressCalledWith);
          });
        });

        suite('when the download is paused', function() {
          setup(function() {
            asyncStorage.setItem(SystemUpdatable.KNOWN_UPDATE_FLAG, true);
            event = new MockChromeEvent({
              type: 'update-download-stopped',
              paused: true
            });
            subject.handleEvent(event);
          });

          test('should set the paused flag', function() {
            assert.isTrue(subject.paused);
          });
          test('shouldn\'t signal "started uncompressing"', function() {
            assert.isFalse(MockUpdateManager.mStartedUncompressingCalled);
          });
          test('should not reset SystemUpdatable.KNOWN_UPDATE_FLAG',
              function() {
            assert.isTrue(
              asyncStorage.mItems[SystemUpdatable.KNOWN_UPDATE_FLAG]);
          });
        });

        suite('when the download is complete', function() {
          setup(function() {
            asyncStorage.setItem(SystemUpdatable.KNOWN_UPDATE_FLAG, true);
            event = new MockChromeEvent({
              type: 'update-download-stopped',
              paused: false
            });
            subject.handleEvent(event);
          });

          test('should clear the paused flag', function() {
            assert.isFalse(subject.paused);
          });

          test('should signal the UpdateManager', function() {
            assert.isTrue(MockUpdateManager.mStartedUncompressingCalled);
          });
          test('should not reset SystemUpdatable.KNOWN_UPDATE_FLAG',
              function() {
            assert.isTrue(
              asyncStorage.mItems[SystemUpdatable.KNOWN_UPDATE_FLAG]);
          });
        });

        suite('when an error occurs', function() {
          setup(function() {
            MockUpdateManager.mTeardown();
            subject = new SystemUpdatable(98734);
            subject._dispatchEvent =
              function errorDuringDispatch(type, result) {
                fakeDispatchEvent.call(subject, type, result);
                subject.handleEvent(new MockChromeEvent({
                  type: 'update-error'
                }));
              };
            subject.download();
            subject._dispatchEvent = fakeDispatchEvent;
          });

          test('should request error banner', function() {
            assert.isTrue(MockUpdateManager.mErrorBannerRequested);
          });

          test('should remove self from active downloads', function() {
            assert.isNotNull(MockUpdateManager.mLastDownloadsRemoval);
            assert.equal(subject, MockUpdateManager.mLastDownloadsRemoval);
            assert.equal(MockUpdateManager.mDownloads.length, 0);
          });

          test('should remove the downloading flag', function() {
            assert.isFalse(subject.downloading);
          });
        });
      });
    });
  });

  function testSystemApplyPrompt() {
    function testSystemApplyPromptBatteryOk() {
      test('apply prompt shown', function() {
        assert.isTrue(MockCustomDialog.mShown);
        assert.equal('systemUpdateReady', MockCustomDialog.mShowedTitle);
        assert.equal('wantToInstallNow', MockCustomDialog.mShowedMsg);

        assert.equal(
          'later',
          MockCustomDialog.mShowedCancel.title
        );
        assert.equal(
          'installNow',
          MockCustomDialog.mShowedConfirm.title);
      });
    }

    function testSystemApplyPromptBatteryNok(expectedThreshold) {
      test('battery prompt shown', function() {

        assert.isTrue(MockCustomDialog.mShown);
        assert.equal('systemUpdateReady', MockCustomDialog.mShowedTitle);

        assert.deepEqual(
          MockCustomDialog.mShowedMsg,
          {
            id: SYSTEM_LOW_BATTERY_L10N_KEY,
            args: { threshold: expectedThreshold }
          }
        );

        assert.equal('ok', MockCustomDialog.mShowedCancel.title);
      });

      test('battery prompt callback', function() {
        assert.equal(subject.declineInstallBattery.name,
                     MockCustomDialog.mShowedCancel.callback.name);

        subject.declineInstallBattery();
        assert.isFalse(MockCustomDialog.mShown);

        assert.equal('update-prompt-apply-result', lastDispatchedEvent.type);
        assert.equal('low-battery', lastDispatchedEvent.value);
      });
    }

    testSystemApplyPromptBatteryOk();

    test('utility tray hidden', function() {
      assert.isTrue(MockService.request.calledWith('UtilityTray:hide'));
    });

    test('apply prompt cancel callback', function() {
      assert.equal(subject.declineInstall.name,
                   MockCustomDialog.mShowedCancel.callback.name);

      subject.declineInstallWait();
      assert.isFalse(MockCustomDialog.mShown);

      assert.equal('update-prompt-apply-result', lastDispatchedEvent.type);
      assert.equal('wait', lastDispatchedEvent.value);
    });

    test('canceling should remove from downloads queue', function() {
      subject.declineInstallWait();

      assert.isNotNull(MockUpdateManager.mLastDownloadsRemoval);
      assert.equal(subject, MockUpdateManager.mLastDownloadsRemoval);
      assert.equal(MockUpdateManager.mDownloads.length, 0);
    });

    test('apply prompt confirm callback', function() {
      assert.equal(subject.acceptInstall.name,
                   MockCustomDialog.mShowedConfirm.callback.name);

      subject.acceptInstall();
      assert.isFalse(MockCustomDialog.mShown);

      assert.equal('update-prompt-apply-result', lastDispatchedEvent.type);
      assert.equal('restart', lastDispatchedEvent.value);
    });

    suite('battery level', function() {
      var realNavigatorBattery;

      setup(function() {
        realNavigatorBattery = window.navigator.battery;
        Object.defineProperty(window.navigator, 'battery', {
          configurable: true,
          value: MockNavigatorBattery
        });
      });

      teardown(function() {
        Object.defineProperty(window.navigator, 'battery', {
          configurable: true,
          value: realNavigatorBattery
        });
      });

      suite('get threshold depending on charging state', function() {
        setup(function() {
          subject.getBatteryPercentageThreshold =
            subject.constructor.prototype.getBatteryPercentageThreshold;
        });

        test('threshold while charging', function(done) {
          MockNavigatorBattery.charging = true;
          subject.getBatteryPercentageThreshold().then(
            function(threshold) {
              assert.equal(
                threshold,
                MockNavigatorSettings.mSettings[BATTERY_THRESHOLD_PLUGGED]
              );
              done();
            },
            function() {
              assert.ok(false);
              done();
            }
          );
        });

        test('threshold while not charging', function(done) {
          MockNavigatorBattery.charging = false;
          subject.getBatteryPercentageThreshold().then(
            function(threshold) {
              assert.equal(
                threshold,
                MockNavigatorSettings.mSettings[BATTERY_THRESHOLD_UNPLUGGED]
              );
              done();
            },
            function() {
              assert.ok(false);
              done();
            }
          );
        });

        test('threshold has a default value if not defined', function(done) {
          delete MockNavigatorSettings.mSettings[BATTERY_THRESHOLD_PLUGGED];
          delete MockNavigatorSettings.mSettings[BATTERY_THRESHOLD_UNPLUGGED];
          subject.getBatteryPercentageThreshold().then(
            function(threshold) {
              assert.equal(
                threshold,
                subject.BATTERY_FALLBACK_THRESHOLD
              );
              done();
            },
            function() {
              assert.ok(false);
              done();
            }
          );
        });

        test('threshold has a default value if over the range. ',
          function(done) {
            MockNavigatorSettings.mSettings[BATTERY_THRESHOLD_PLUGGED] = 105;
            MockNavigatorSettings.mSettings[BATTERY_THRESHOLD_UNPLUGGED] = 105;
            subject.getBatteryPercentageThreshold().then(
              function(threshold) {
                assert.equal(
                  threshold,
                  subject.BATTERY_FALLBACK_THRESHOLD
                );
                done();
              },
              function() {
                assert.ok(false);
                done();
              }
            );
          }
        );

        test('threshold has a default value if under the range. ',
          function(done) {
            MockNavigatorSettings.mSettings[BATTERY_THRESHOLD_PLUGGED] = -10;
            MockNavigatorSettings.mSettings[BATTERY_THRESHOLD_UNPLUGGED] = -10;
            subject.getBatteryPercentageThreshold().then(
              function(threshold) {
                assert.equal(
                  threshold,
                  subject.BATTERY_FALLBACK_THRESHOLD
                );
                done();
              },
              function() {
                assert.ok(false);
                done();
              }
            );
          }
        );

        test('threshold has a default even if Settings fails', function(done) {
          // Current MockSettings can not be forced to fail, so preparing our
          // own stub.
          navigator.mozSettings = {
            createLock: function() {
              return {
                get: function(key) {
                  var fakedFailingRequest = {};
                  setTimeout(function() {
                    fakedFailingRequest.onerror('error');
                  });
                  return fakedFailingRequest;
                }
              };
            }
          };
          subject.getBatteryPercentageThreshold().then(
            function(threshold) {
              assert.equal(
                threshold,
                subject.BATTERY_FALLBACK_THRESHOLD
              );
              done();
            },
            function() {
              assert.ok(false);
              done();
            }
          );
          navigator.mozSettings = MockNavigatorSettings;
        });
      });

      suite('low battery', function() {
        var event;
        setup(function() {
          asyncStorage.setItem(SystemUpdatable.KNOWN_UPDATE_FLAG, true);
          MockUtilityTray.show();
          MockNavigatorBattery.level = 0.1;
          event = new MockChromeEvent({
            type: 'update-prompt-apply'
          });
        });

        suite('ota update package', function() {
          setup(function() {
            event.detail.isOSUpdate = false;
            subject.handleEvent(event);
          });

          testSystemApplyPromptBatteryOk();
        });

        suite('fota update package', function() {
          setup(function() {
            event.detail.isOSUpdate = true;
            subject.handleEvent(event);
          });

          testSystemApplyPromptBatteryNok(MID_CHARGE);
        });
      });

      suite('high battery', function() {
        var event;
        setup(function() {
          asyncStorage.setItem(SystemUpdatable.KNOWN_UPDATE_FLAG, true);
          MockUtilityTray.show();
          MockNavigatorBattery.level = 0.9;
          event = new MockChromeEvent({
            type: 'update-prompt-apply'
          });
          subject.handleEvent(event);
        });

        suite('ota update package', function() {
          setup(function() {
            event.detail.isOSUpdate = false;
            subject.handleEvent(event);
          });

          testSystemApplyPromptBatteryOk();
        });

        suite('fota update package', function() {
          setup(function() {
            event.detail.isOSUpdate = true;
            subject.handleEvent(event);
          });

          testSystemApplyPromptBatteryOk();
        });
      });
    });
  }
});
