requireApp('system/js/updatable.js');

requireApp('system/test/unit/mock_app.js');
requireApp('system/test/unit/mock_update_manager.js');
requireApp('system/test/unit/mock_window_manager.js');
requireApp('system/test/unit/mock_apps_mgmt.js');
requireApp('system/test/unit/mock_chrome_event.js');
requireApp('system/test/unit/mock_custom_dialog.js');

// We're going to swap those with mock objects
// so we need to make sure they are defined.
if (!this.CustomDialog) {
  this.CustomDialog = null;
}
if (!this.UpdateManager) {
  this.UpdateManager = null;
}
if (!this.WindowManager) {
  this.WindowManager = null;
}

suite('system/Updatable', function() {
  var subject;
  var mockApp;

  var realUpdateManager;
  var realWindowManager;
  var realDispatchEvent;
  var realCustomDialog;
  var realL10n;

  var lastDispatchedEvent = null;
  var fakeDispatchEvent;

  suiteSetup(function() {
    realUpdateManager = window.UpdateManager;
    window.UpdateManager = MockUpdateManager;

    realWindowManager = window.WindowManager;
    window.WindowManager = MockWindowManager;

    realCustomDialog = window.CustomDialog;
    window.CustomDialog = MockCustomDialog;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      get: function get(key) {
        return key;
      }
    };
  });

  suiteTeardown(function() {
    window.UpdateManager = realUpdateManager;
    window.WindowManager = realWindowManager;
    window.CustomDialog = realCustomDialog;

    navigator.mozL10n = realL10n;
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
  });

  teardown(function() {
    MockUpdateManager.mTeardown();
    MockAppsMgmt.mTeardown();
    MockCustomDialog.mTearDown();
    MockWindowManager.mTearDown();

    subject._dispatchEvent = realDispatchEvent;
    lastDispatchedEvent = null;
  });

  suite('init', function() {
    test('should keep a reference to the app', function() {
      assert.equal(mockApp, subject.app);
    });
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
      test('should give system update size', function() {
        subject = new SystemUpdatable(433567);
        assert.equal(433567, subject.size);
      });

      test('should give packaged app update size', function() {
        assert.equal(42, subject.size);
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

        mockApp.updateManifest = {
          size: 45678
        };
        mockApp.mTriggerDownloadAvailable();
        assert.equal(45678, subject.size);
      });
    });
  });

  suite('actions', function() {
    suite('download', function() {
      setup(function() {
        subject.download();
      });

      test('should add self to active downloads', function() {
        assert.isNotNull(MockUpdateManager.mLastDownloadsAdd);
        assert.equal(MockUpdateManager.mLastDownloadsAdd.app.mId,
                     mockApp.mId);
      });

      test('should call download on the app', function() {
        assert.isTrue(mockApp.mDownloadCalled);
      });

      test('should send download message for system updates', function() {
        subject = new SystemUpdatable(42);
        subject._dispatchEvent = fakeDispatchEvent;
        subject.download();
        assert.equal('update-available-result', lastDispatchedEvent.type);
        assert.equal('download', lastDispatchedEvent.value);
      });

      test('should add system updates to active downloads too', function() {
        MockUpdateManager.mLastDownloadsAdd = null;
        subject = new SystemUpdatable(42);
        subject.download();
        assert.isNotNull(MockUpdateManager.mLastDownloadsAdd);
        assert.equal(subject, MockUpdateManager.mLastDownloadsAdd);
      });
    });

    suite('cancel download', function() {
      setup(function() {
        subject.cancelDownload();
      });

      test('should remove self from active downloads', function() {
        assert.isNotNull(MockUpdateManager.mLastDownloadsRemoval);
        assert.equal(MockUpdateManager.mLastDownloadsRemoval.app.mId,
                     mockApp.mId);
      });

      test('should call cancelDownload on the app', function() {
        assert.isTrue(mockApp.mCancelCalled);
      });
    });
  });

  suite('events', function() {
    suite('apps events', function() {
      suite('ondownloadavailable', function() {
        setup(function() {
          mockApp.mTriggerDownloadAvailable();
        });

        test('should add self to the available downloads', function() {
          assert.isNotNull(MockUpdateManager.mLastUpdatesAdd);
          assert.equal(MockUpdateManager.mLastUpdatesAdd.app.mId,
                       mockApp.mId);
        });
      });

      suite('ondownloadsuccess', function() {
        test('should not remove self from active downloads when not updating', function() {
          mockApp.mTriggerDownloadSuccess();
          assert.isNull(MockUpdateManager.mLastDownloadsRemoval);
        });

        test('should remove self from active downloads after downloading', function() {
          subject.download();
          mockApp.mTriggerDownloadSuccess();
          assert.isNotNull(MockUpdateManager.mLastDownloadsRemoval);
          assert.equal(MockUpdateManager.mLastDownloadsRemoval.app.mId,
                       mockApp.mId);
        });

        suite('application of the download', function() {
          test('should apply if the app is not in foreground', function() {
            subject.download();
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

            subject.download();
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
            subject.download();
            mockApp.mTriggerDownloadSuccess();
            assert.equal('https://testapp.gaiamobile.org',
                         MockWindowManager.mLastKilledOrigin);
          });
        });
      });

      suite('ondownloaderror', function() {
        setup(function() {
          subject.download();
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
      });

      suite('ondownloadapplied', function() {
        setup(function() {
          subject.download();
          mockApp.mTriggerDownloadApplied();
        });

        test('should remove self from available downloads', function() {
          mockApp.mTriggerDownloadSuccess();
          assert.isNotNull(MockUpdateManager.mLastUpdatesRemoval);
          assert.equal(MockUpdateManager.mLastUpdatesRemoval.app.mId,
                       mockApp.mId);
        });
      });
    });

    suite('system update events', function() {
      setup(function() {
        subject = new SystemUpdatable(42);
        subject._dispatchEvent = fakeDispatchEvent;
      });

      suite('update-downloaded', function() {
        setup(function() {
          var event = new MockChromeEvent({
            type: 'update-downloaded'
          });
          subject.handleEvent(event);
        });

        testSystemApplyPrompt();
      });

      suite('update-prompt-apply', function() {
        setup(function() {
          var event = new MockChromeEvent({
            type: 'update-prompt-apply'
          });
          subject.handleEvent(event);
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
      });
    });
  });


  function testSystemApplyPrompt() {
    test('apply prompt shown', function() {
      assert.isTrue(MockCustomDialog.mShown);
      assert.equal('updateReady', MockCustomDialog.mShowedTitle);
      assert.equal('wantToInstall', MockCustomDialog.mShowedMsg);

      assert.equal('later', MockCustomDialog.mShowedCancel.title);
      assert.equal('installNow', MockCustomDialog.mShowedConfirm.title);
    });

    test('apply prompt cancel callback', function() {
      assert.equal(subject.declineInstall.name,
                   MockCustomDialog.mShowedCancel.callback.name);

      subject.declineInstall();
      assert.isFalse(MockCustomDialog.mShown);

      assert.equal('update-prompt-apply-result', lastDispatchedEvent.type);
      assert.equal('wait', lastDispatchedEvent.value);
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
