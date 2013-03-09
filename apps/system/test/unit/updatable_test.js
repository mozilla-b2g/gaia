'use strict';

requireApp('system/js/updatable.js');

requireApp('system/test/unit/mock_app.js');
requireApp('system/test/unit/mock_asyncStorage.js');
requireApp('system/test/unit/mock_update_manager.js');
requireApp('system/test/unit/mock_window_manager.js');
requireApp('system/test/unit/mock_apps_mgmt.js');
requireApp('system/test/unit/mock_chrome_event.js');
requireApp('system/test/unit/mock_custom_dialog.js');
requireApp('system/test/unit/mock_utility_tray.js');
requireApp('system/test/unit/mock_manifest_helper.js');
requireApp('system/test/unit/mocks_helper.js');


var mocksForUpdatable = [
  'CustomDialog',
  'UpdateManager',
  'WindowManager',
  'UtilityTray',
  'ManifestHelper',
  'asyncStorage'
];

mocksForUpdatable.forEach(function(mockName) {
  if (!window[mockName]) {
    window[mockName] = null;
  }
});

suite('system/Updatable', function() {
  var subject;
  var mockApp;

  var realDispatchEvent;
  var realL10n;

  var mocksHelper;

  var lastDispatchedEvent = null;
  var fakeDispatchEvent;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      get: function get(key) {
        return key;
      }
    };

    mocksHelper = new MocksHelper(mocksForUpdatable);
    mocksHelper.suiteSetup();
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    mocksHelper.suiteTeardown();
  });

  setup(function() {
    mockApp = new MockApp();
    subject = new AppUpdatable(mockApp);
    subject._mgmt = MockAppsMgmt;

    fakeDispatchEvent = function(type, value) {
      lastDispatchedEvent = {
        type: type,
        value: value
      };
    };
    subject._dispatchEvent = fakeDispatchEvent;

    mocksHelper.setup();
  });

  teardown(function() {
    MockAppsMgmt.mTeardown();
    mocksHelper.teardown();

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
      var systemUpdatable = new SystemUpdatable();
      assert.equal(MockUpdateManager.mCheckForUpdatesCalledWith, true);
    });

    downloadAvailableSuite('app has a download available', function() {
      mockApp.downloadAvailable = true;
      subject = new AppUpdatable(mockApp);
    });

/*
// These tests are currently failing and have been temporarily disabled as per
// Bug 838993. They should be fixed and re-enabled as soon as possible as per
// Bug 840500.
    test('should apply update if downloaded', function() {
      mockApp.readyToApplyDownload = true;
      subject = new AppUpdatable(mockApp);
      // We cannot test for this._mgmt methods because it's created in
      // a constructor, so we check if the window is killed because
      // WindowManager.kill() is also called in applyUpdate() method
      assert.equal(MockWindowManager.mLastKilledOrigin, subject.app.origin);
    });
*/
  });

  suite('infos', function() {
    suite('name', function() {
      test('should give a name for system updates', function() {
        subject = new SystemUpdatable(42);
        assert.equal('systemUpdate', subject.name);
      });

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
            MockWindowManager.mDisplayedApp =
              'http://homescreen.gaiamobile.org';
            mockApp.mTriggerDownloadSuccess();
            assert.isNotNull(MockAppsMgmt.mLastAppApplied);
            assert.equal(MockAppsMgmt.mLastAppApplied.mId, mockApp.mId);
          });

          test('should wait for appwillclose if it is', function() {
            var origin = 'http://testapp.gaiamobile.org';
            mockApp.origin = origin;
            MockWindowManager.mDisplayedApp = origin;

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
            mockApp.mTriggerDownloadAvailable();
            mockApp.mTriggerDownloadSuccess();
            assert.equal('https://testapp.gaiamobile.org',
                         MockWindowManager.mLastKilledOrigin);
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
      setup(function() {
        subject = new SystemUpdatable(42);
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
    test('apply prompt shown', function() {
      assert.isTrue(MockCustomDialog.mShown);
      assert.equal('systemUpdateReady', MockCustomDialog.mShowedTitle);
      assert.equal('wantToInstall', MockCustomDialog.mShowedMsg);

      assert.equal('later', MockCustomDialog.mShowedCancel.title);
      assert.equal('installNow', MockCustomDialog.mShowedConfirm.title);
    });

    test('utility tray hidden', function() {
      assert.isFalse(MockUtilityTray.mShown);
    });

    test('apply prompt cancel callback', function() {
      assert.equal(subject.declineInstall.name,
                   MockCustomDialog.mShowedCancel.callback.name);

      subject.declineInstall();
      assert.isFalse(MockCustomDialog.mShown);

      assert.equal('update-prompt-apply-result', lastDispatchedEvent.type);
      assert.equal('wait', lastDispatchedEvent.value);
    });

    test('canceling should remove from downloads queue', function() {
      subject.declineInstall();

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
  }
});
