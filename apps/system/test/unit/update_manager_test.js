requireApp('system/js/update_manager.js');

requireApp('system/test/unit/mock_app.js');
requireApp('system/test/unit/mock_updatable.js');
requireApp('system/test/unit/mock_apps_mgmt.js');
requireApp('system/test/unit/mock_custom_dialog.js');
requireApp('system/test/unit/mock_utility_tray.js');
requireApp('system/test/unit/mock_system_banner.js');
requireApp('system/test/unit/mock_chrome_event.js');
requireApp('system/test/unit/mock_settings_listener.js');


// We're going to swap those with mock objects
// so we need to make sure they are defined.
if (!this.Updatable) {
  this.Updatable = null;
}
if (!this.CustomDialog) {
  this.CustomDialog = null;
}
if (!this.UtilityTray) {
  this.UtilityTray = null;
}
if (!this.SystemBanner) {
  this.SystemBanner = null;
}
if (!this.SettingsListener) {
  this.SettingsListener = null;
}

suite('system/UpdateManager', function() {
  var realUpdatableApp;
  var realL10n;
  var realCustomDialog;
  var realUtilityTray;
  var realSystemBanner;
  var realSettingsListener;
  var realDispatchEvent;

  var apps;
  var updatableApps;
  var uAppWithDownloadAvailable;
  var appWithDownloadAvailable;
  var fakeNode;
  var fakeToaster;

  var tinyTimeout = 5;
  var lastDispatchedEvent = null;

  suiteSetup(function() {
    realUpdatableApp = window.Updatable;
    window.Updatable = MockUpdatable;

    realCustomDialog = window.CustomDialog;
    window.CustomDialog = MockCustomDialog;

    realUtilityTray = window.UtilityTray;
    window.UtilityTray = MockUtilityTray;

    realSystemBanner = window.SystemBanner;
    window.SystemBanner = MockSystemBanner;

    realSettingsListener = window.SettingsListener;
    window.SettingsListener = MockSettingsListener;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      get: function get(key, params) {
        return key;
      }
    };

    realDispatchEvent = UpdateManager._dispatchEvent;
    UpdateManager._dispatchEvent = function fakeDispatch(type, value) {
      lastDispatchedEvent = {
        type: type,
        value: value
      };
    };
  });

  suiteTeardown(function() {
    window.Updatable = realUpdatableApp;
    window.CustomDialog = realCustomDialog;
    window.UtilityTray = realUtilityTray;
    window.SystemBanner = realSystemBanner;
    window.SettingsListener = realSettingsListener;

    navigator.mozL10n = realL10n;
    UpdateManager._dispatchEvent = realDispatchEvent;
  });

  setup(function() {
    UpdateManager._mgmt = MockAppsMgmt;

    apps = [new MockApp(), new MockApp(), new MockApp()];
    updatableApps = apps.map(function(app) {
      return new Updatable(app);
    });
    MockAppsMgmt.mApps = apps;

    uAppWithDownloadAvailable = updatableApps[2];
    appWithDownloadAvailable = apps[2];
    appWithDownloadAvailable.downloadAvailable = true;

    fakeNode = document.createElement('div');
    fakeNode.id = 'update-manager-container';
    fakeNode.innerHTML = [
      '<div class="count">',
      '</div>',
      '<div class="activity">',
      '</div>',
      '<div class="message">',
      '</div>'
    ].join('');

    fakeToaster = document.createElement('div');
    fakeToaster.id = 'update-manager-toaster';
    fakeToaster.innerHTML = [
      '<div class="count">',
      '</div>',
      '<div class="message">',
      '</div>'
    ].join('');

    document.body.appendChild(fakeNode);
    document.body.appendChild(fakeToaster);
  });

  teardown(function() {
    UpdateManager.updatableApps = [];
    UpdateManager.updatesQueue = [];
    UpdateManager.downloadsQueue = [];
    UpdateManager._downloading = false;
    UpdateManager.container = null;
    UpdateManager.count = null;
    UpdateManager.message = null;
    UpdateManager.toaster = null;
    UpdateManager.toasterCount = null;
    UpdateManager.toasterMessage = null;

    MockAppsMgmt.mTeardown();
    MockCustomDialog.mTearDown();
    MockUtilityTray.mTearDown();
    MockSystemBanner.mTearDown();
    MockSettingsListener.mTearDown();

    fakeNode.parentNode.removeChild(fakeNode);
    fakeToaster.parentNode.removeChild(fakeToaster);

    lastDispatchedEvent = null;
  });

  suite('init', function() {
    test('should get all applications', function(done) {
      MockAppsMgmt.mNext = function() {
        assert.equal(3, UpdateManager.updatableApps.length);
        assert.equal(apps[0].mId, UpdateManager.updatableApps[0].target.mId);
        done();
      };
      UpdateManager.init();
    });

    test('should add apps with downloadAvailable on init', function(done) {
      MockAppsMgmt.mNext = function() {
        assert.equal(appWithDownloadAvailable.mId,
                     UpdateManager.updatesQueue[0].target.mId);
        done();
      };
      UpdateManager.init();
    });

    test('should bind dom elements', function() {
      UpdateManager.init();
      assert.equal('update-manager-container', UpdateManager.container.id);
      assert.equal('count', UpdateManager.count.className);
      assert.equal('message', UpdateManager.message.className);

      assert.equal('update-manager-toaster', UpdateManager.toaster.id);
      assert.equal('count', UpdateManager.toasterCount.className);
      assert.equal('message', UpdateManager.toasterMessage.className);
    });

    test('should bind to the click event', function() {
      UpdateManager.init();
      assert.equal(UpdateManager.containerClicked.name,
                   UpdateManager.container.onclick.name);
    });
  });

  suite('events', function() {
    suite('app install', function() {
      var installedApp;

      setup(function() {
        UpdateManager.init();

        installedApp = new MockApp();
        installedApp.downloadAvailable = true;
        MockAppsMgmt.mLastApp = installedApp;
        MockAppsMgmt.mTriggerOninstall();
      });

      test('should instantiate an updatable app', function() {
        var lastIndex = UpdateManager.updatableApps.length - 1;
        var lastUApp = UpdateManager.updatableApps[lastIndex];
        assert.equal(installedApp.mId, lastUApp.target.mId);
      });

      test('should add to the update queue if downloadAvailable', function() {
        var lastIndex = UpdateManager.updatesQueue.length - 1;
        var lastUApp = UpdateManager.updatesQueue[lastIndex];
        assert.equal(installedApp.mId, lastUApp.target.mId);
      });
    });

    suite('app uninstall', function() {
      var installedApp;

      setup(function() {
        UpdateManager.init();

        installedApp = new MockApp();
        installedApp.downloadAvailable = true;
        MockAppsMgmt.mLastApp = installedApp;
        MockAppsMgmt.mTriggerOninstall();
      });

      test('should remove the updatable app', function() {
        var initialLength = UpdateManager.updatableApps.length;
        MockAppsMgmt.mTriggerOnuninstall();
        assert.equal(initialLength - 1, UpdateManager.updatableApps.length);
      });

      test('should remove from the update queue', function() {
        var initialLength = UpdateManager.updatesQueue.length;
        MockAppsMgmt.mTriggerOnuninstall();
        assert.equal(initialLength - 1, UpdateManager.updatesQueue.length);
      });

      test('should call uninit on the updatable', function() {
        var lastIndex = UpdateManager.updatesQueue.length - 1;
        var updatableApp = UpdateManager.updatesQueue[lastIndex]
        MockAppsMgmt.mTriggerOnuninstall();
        assert.isTrue(updatableApp.mUninitCalled);
      });
    });

    suite('system update available', function() {
      var event;

      setup(function() {
        UpdateManager.init();
        event = new MockChromeEvent({
          type: 'update-available'
        });
        UpdateManager.handleEvent(event);
      });

      test('should add a system updatable to the updates', function() {
        var lastIndex = UpdateManager.updatesQueue.length - 1;
        assert.equal('system', UpdateManager.updatesQueue[lastIndex].target);
      });

      test('should not add a system updatable if there is one', function() {
        var initialLength = UpdateManager.updatesQueue.length;
        UpdateManager.handleEvent(event);
        assert.equal(initialLength, UpdateManager.updatesQueue.length);
      });
    });
  });

  suite('UI', function() {
    setup(function() {
      MockAppsMgmt.mApps = [];
      UpdateManager.init();
      UpdateManager.updatableApps = updatableApps;
      UpdateManager.NOTIFICATION_BUFFERING_TIMEOUT = tinyTimeout;
      UpdateManager.TOASTER_TIMEOUT = tinyTimeout;
    });

    test('should update the count', function() {
      UpdateManager.updatesQueue = updatableApps;
      UpdateManager.render();
      assert.equal('3', UpdateManager.count.textContent);
    });

    suite('downloading state', function() {
      test('should add the css class if downloading', function() {
        UpdateManager._downloading = true;
        UpdateManager.render();
        assert.include(UpdateManager.container.className, 'downloading');
      });

      test('should remove the css class if not downloading', function() {
        UpdateManager._downloading = true;
        UpdateManager.render();

        UpdateManager._downloading = false;
        UpdateManager.render();
        assert.equal(-1,
                     UpdateManager.container.className.indexOf('downloading'));
      });

      test('should show the downloading message if downloading', function() {
        UpdateManager._downloading = true;
        UpdateManager.render();
        assert.equal('downloadingMessage', UpdateManager.message.textContent);
      });

      test('should show the available message if not downloading', function() {
        UpdateManager.render();
        assert.equal('updatesAvailableMessage',
                     UpdateManager.message.textContent);
      });
    });

    suite('container visibility', function() {
      setup(function() {
        UpdateManager.addToUpdatesQueue(uAppWithDownloadAvailable);
      });

      suite('displaying the container after a timeout', function() {
        setup(function() {
          assert.equal(-1,
                       UpdateManager.container.className.indexOf('displayed'));
        });

        test('should display after a timeout', function(done) {
          setTimeout(function() {
            assert.include(UpdateManager.container.className, 'displayed');
            done();
          }, tinyTimeout * 2);
        });

        test('should not display if there are no more updates', function(done) {
          UpdateManager.updatesQueue.forEach(function(uApp) {
            UpdateManager.removeFromUpdatesQueue(uApp);
          });

          setTimeout(function() {
            var css = UpdateManager.container.className;
            assert.equal(-1, css.indexOf('displayed'));
            done();
          }, tinyTimeout * 2);
        });

        test('should display an updated count', function(done) {
          UpdateManager.addToUpdatesQueue(updatableApps[1]);
          setTimeout(function() {
            assert.equal('2', UpdateManager.count.textContent);
            done();
          }, tinyTimeout * 2);
        });

        suite('update toaster', function() {
          test('should display after a timeout', function(done) {
            var css = UpdateManager.container.className;
            assert.equal(-1, css.indexOf('displayed'));
            setTimeout(function() {
              assert.include(UpdateManager.toaster.className, 'displayed');
              assert.equal('1', UpdateManager.toasterCount.textContent);
              done();
            }, tinyTimeout * 2);
          });

          test('should display an updated count', function(done) {
            UpdateManager.addToUpdatesQueue(updatableApps[1]);
            setTimeout(function() {
              assert.equal('2', UpdateManager.toasterCount.textContent);
              done();
            }, tinyTimeout * 2);
          });

          test('should show the right message', function(done) {
            setTimeout(function() {
              assert.equal('updatesAvailableMessage',
                           UpdateManager.toasterMessage.textContent);
              done();
            }, tinyTimeout * 2);
          });


          test('should hide after TOASTER_TIMEOUT', function(done) {
            UpdateManager.addToUpdatesQueue(updatableApps[1]);
            setTimeout(function() {
              setTimeout(function() {
                var css = UpdateManager.toaster.className;
                assert.equal(-1, css.indexOf('displayed'));
                done();
              }, tinyTimeout * 2);
            }, tinyTimeout * 2);
          });
        });
      });

      test('should hide the container', function() {
        UpdateManager.updatesQueue = [uAppWithDownloadAvailable];
        UpdateManager.container.classList.add('displayed');
        UpdateManager.removeFromUpdatesQueue(uAppWithDownloadAvailable);
        var css = UpdateManager.container.className;
        assert.equal(-1, css.indexOf('displayed'));
      });
    });

    suite('after downloads', function() {
      test('should check if new updates where found', function() {
        var uApp = updatableApps[0];

        UpdateManager.updatableApps = updatableApps;
        UpdateManager.downloadsQueue = [uApp];

        UpdateManager.removeFromDownloadsQueue(uApp);
        assert.equal(uAppWithDownloadAvailable.target.mId,
                     UpdateManager.updatesQueue[0].target.mId);
      });
    });

    suite('error banner requests', function() {
      setup(function() {
        UpdateManager.NOTIFICATION_BUFFERING_TIMEOUT = tinyTimeout;
        UpdateManager.init();
        UpdateManager.requestErrorBanner();
      });

      test('should wait before showing the system banner', function(done) {
        assert.equal(0, MockSystemBanner.mShowCount);

        setTimeout(function() {
          done();
        }, tinyTimeout * 2);
      });

      test('should show after NOTIFICATION_BUFFERING_TIMEOUT', function(done) {
        setTimeout(function() {
          assert.equal(1, MockSystemBanner.mShowCount);
          assert.equal('downloadError', MockSystemBanner.mMessage);
          done();
        }, tinyTimeout * 2);
      });

      test('should show only once if called multiple time', function(done) {
        UpdateManager.requestErrorBanner();
        setTimeout(function() {
          assert.equal(1, MockSystemBanner.mShowCount);
          done();
        }, tinyTimeout * 2);
      });
    });
  });

  suite('actions', function() {
    setup(function() {
      UpdateManager.init();
    });

    suite('start all downloads', function() {
      test('should call download on all the updatables', function() {
        UpdateManager.updatableApps = updatableApps;
        UpdateManager.updatesQueue = [uAppWithDownloadAvailable];
        UpdateManager.init();

        UpdateManager.startAllDownloads();
        assert.isTrue(uAppWithDownloadAvailable.mDownloadCalled);
      });
    });

    suite('cancel all downloads', function() {
      test('should call cancelDownload on all the updatables', function() {
        UpdateManager.updatableApps = updatableApps;
        UpdateManager.downloadsQueue = [uAppWithDownloadAvailable];

        UpdateManager.cancelAllDownloads();
        assert.isTrue(uAppWithDownloadAvailable.mCancelCalled);
      });
    });

    suite('download prompt', function() {
      setup(function() {
        UpdateManager._downloading = false;
        MockUtilityTray.show();
        UpdateManager.containerClicked();
      });

      test('should show the download prompt', function() {
        assert.isTrue(MockCustomDialog.mShown);
        assert.isFalse(MockUtilityTray.mShown);

        assert.equal('downloadAll', MockCustomDialog.mShowedTitle);
        assert.equal('wantToDownloadAll', MockCustomDialog.mShowedMsg);

        assert.equal('later', MockCustomDialog.mShowedCancel.title);
        assert.equal('download', MockCustomDialog.mShowedConfirm.title);
      });

      test('should handle cancellation', function() {
        assert.equal('um_cancelPrompt',
                     MockCustomDialog.mShowedCancel.callback.name);

        UpdateManager.cancelPrompt();
        assert.isFalse(MockCustomDialog.mShown);
      });

      test('should handle confirmation', function() {
        assert.equal('um_startAllDownloads',
                     MockCustomDialog.mShowedConfirm.callback.name);

        UpdateManager.startAllDownloads();
        assert.isFalse(MockCustomDialog.mShown);
        assert.isTrue(MockUtilityTray.mShown);
      });
    });

    suite('cancel prompt', function() {
      setup(function() {
        UpdateManager._downloading = true;
        MockUtilityTray.show();
        UpdateManager.containerClicked();
      });

      test('should show the cancel', function() {
        assert.isTrue(MockCustomDialog.mShown);
        assert.isFalse(MockUtilityTray.mShown);

        assert.equal('cancelAllDownloads', MockCustomDialog.mShowedTitle);
        assert.equal('wantToCancelAll', MockCustomDialog.mShowedMsg);

        assert.equal('no', MockCustomDialog.mShowedCancel.title);
        assert.equal('yes', MockCustomDialog.mShowedConfirm.title);
      });

      test('should handle cancellation', function() {
        assert.equal('um_cancelPrompt',
                     MockCustomDialog.mShowedCancel.callback.name);

        UpdateManager.cancelPrompt();
        assert.isFalse(MockCustomDialog.mShown);
      });

      test('should handle confirmation', function() {
        assert.equal('um_cancelAllDownloads',
                     MockCustomDialog.mShowedConfirm.callback.name);

        UpdateManager.cancelAllDownloads();
        assert.isFalse(MockCustomDialog.mShown);
      });
    });

    suite('check for updates', function() {
      setup(function() {
        UpdateManager.init();
      });

      test('should observe the setting', function() {
        assert.equal('gaia.system.checkForUpdates', MockSettingsListener.mName);
        assert.equal(false, MockSettingsListener.mDefaultValue);
        assert.equal(UpdateManager.checkForUpdates.name,
                     MockSettingsListener.mCallback.name);
      });

      test('should dispatch force update event if asked for', function() {
        UpdateManager.checkForUpdates(true);
        assert.equal('force-update-check', lastDispatchedEvent.type);
      });

      test('should not dispatch force update event if not asked', function() {
        UpdateManager.checkForUpdates(false);
        assert.isNull(lastDispatchedEvent);
      });
    });
  });

  suite('queues support', function() {
    suite('updates queue', function() {
      suite('addToUpdatesQueue', function() {
        setup(function() {
          var installedApp = new MockApp();
          var updatableApp = new MockUpdatable(installedApp);
          UpdateManager.updatableApps = [updatableApp];
          UpdateManager.init();
        });

        test('should add the updatable app to the array', function() {
          var updatableApp = UpdateManager.updatableApps[0];

          var initialLength = UpdateManager.updatesQueue.length;
          UpdateManager.addToUpdatesQueue(updatableApp);
          assert.equal(initialLength + 1, UpdateManager.updatesQueue.length);
        });

        test('should render', function() {
          var updatableApp = UpdateManager.updatableApps[0];

          UpdateManager.addToUpdatesQueue(updatableApp);
          assert.equal('1', UpdateManager.count.textContent);
        });

        test('should not add app if not in updatableApps array', function() {
          var updatableApp = new MockUpdatable(new MockApp);
          var initialLength = UpdateManager.updatesQueue.length;
          UpdateManager.addToUpdatesQueue(updatableApp);
          assert.equal(initialLength, UpdateManager.updatesQueue.length);
        });

        test('should add a system update to the array', function() {
          var systemUpdate = new MockUpdatable('system');

          var initialLength = UpdateManager.updatesQueue.length;
          UpdateManager.addToUpdatesQueue(systemUpdate);
          assert.equal(initialLength + 1, UpdateManager.updatesQueue.length);
        });

        test('should not add more than on system update', function() {
          var systemUpdate = new MockUpdatable('system');

          UpdateManager.updatesQueue.push(new MockUpdatable('system'));
          var initialLength = UpdateManager.updatesQueue.length;
          UpdateManager.addToUpdatesQueue(systemUpdate);
          assert.equal(initialLength, UpdateManager.updatesQueue.length);
        });

        test('should not add if app already in the array', function() {
          var updatableApp = UpdateManager.updatableApps[0];
          UpdateManager.addToUpdatesQueue(updatableApp);

          var initialLength = UpdateManager.updatesQueue.length;
          UpdateManager.addToUpdatesQueue(updatableApp);
          assert.equal(initialLength, UpdateManager.updatesQueue.length);
        });

        test('should not add if downloading', function() {
          UpdateManager._downloading = true;
          var updatableApp = UpdateManager.updatableApps[0];

          var initialLength = UpdateManager.updatesQueue.length;
          UpdateManager.addToUpdatesQueue(updatableApp);
          assert.equal(initialLength, UpdateManager.updatesQueue.length);
        });
      });

      suite('removeFromUpdatesQueue', function() {
        var updatableApp;

        setup(function() {
          var installedApp = new MockApp();
          updatableApp = new MockUpdatable(installedApp);
          UpdateManager.updatableApps = [updatableApp];
          UpdateManager.updatesQueue = [updatableApp];
          UpdateManager.init();
        });

        test('should remove if in updatesQueue array', function() {
          var initialLength = UpdateManager.updatesQueue.length;
          UpdateManager.removeFromUpdatesQueue(updatableApp);
          assert.equal(initialLength - 1, UpdateManager.updatesQueue.length);
        });

        test('should render', function() {
          UpdateManager.removeFromUpdatesQueue(updatableApp);
          assert.equal('0', UpdateManager.count.textContent);
        });

        test('should remove system updates too', function() {
          var systemUpdate = new MockUpdatable('system');
          UpdateManager.updatesQueue.push(systemUpdate);

          var initialLength = UpdateManager.updatesQueue.length;
          UpdateManager.removeFromUpdatesQueue(systemUpdate);
          assert.equal(initialLength - 1, UpdateManager.updatesQueue.length);
        });
      });
    });

    suite('downloads queue', function() {
      suite('addToDownloadsQueue', function() {
        var updatableApp;

        setup(function() {
          var installedApp = new MockApp();
          updatableApp = new MockUpdatable(installedApp);
          UpdateManager.updatableApps = [updatableApp];
          UpdateManager.init();
        });

        test('should add the updatable to the array', function() {
          var initialLength = UpdateManager.downloadsQueue.length;
          UpdateManager.addToDownloadsQueue(updatableApp);
          assert.equal(initialLength + 1, UpdateManager.downloadsQueue.length);
        });

        test('should add system updates too', function() {
          var initialLength = UpdateManager.downloadsQueue.length;
          UpdateManager.addToDownloadsQueue(new MockUpdatable('system'));
          assert.equal(initialLength + 1, UpdateManager.downloadsQueue.length);
        });

        test('should not add more than one system updates', function() {
          var initialLength = UpdateManager.downloadsQueue.length;
          UpdateManager.addToDownloadsQueue(new MockUpdatable('system'));
          UpdateManager.addToDownloadsQueue(new MockUpdatable('system'));
          assert.equal(initialLength + 1, UpdateManager.downloadsQueue.length);
        });

        test('should switch to downloading mode at first add', function() {
          assert.isFalse(UpdateManager._downloading);
          UpdateManager.addToDownloadsQueue(updatableApp);
          assert.isTrue(UpdateManager._downloading);
          assert.include(UpdateManager.container.className, 'downloading');
        });

        test('should not add app if not in updatableApps array', function() {
          var updatableApp = new MockUpdatable(new MockApp);
          var initialLength = UpdateManager.downloadsQueue.length;
          UpdateManager.addToDownloadsQueue(updatableApp);
          assert.equal(initialLength, UpdateManager.downloadsQueue.length);
        });

        test('should not add if already in the array', function() {
          UpdateManager.addToDownloadsQueue(updatableApp);

          var initialLength = UpdateManager.downloadsQueue.length;
          UpdateManager.addToDownloadsQueue(updatableApp);
          assert.equal(initialLength, UpdateManager.downloadsQueue.length);
        });
      });

      suite('removeFromDownloadsQueue', function() {
        var updatableApp;

        setup(function() {
          var installedApp = new MockApp();
          updatableApp = new MockUpdatable(installedApp);
          UpdateManager.updatableApps = [updatableApp];
          UpdateManager.downloadsQueue = [updatableApp];
          UpdateManager._downloading = true;
          UpdateManager.init();
        });

        test('should remove if in downloadsQueue array', function() {
          var initialLength = UpdateManager.downloadsQueue.length;
          UpdateManager.removeFromDownloadsQueue(updatableApp);
          assert.equal(initialLength - 1, UpdateManager.downloadsQueue.length);
        });

        test('should switch off downloading mode on last remove', function() {
          assert.isTrue(UpdateManager._downloading);
          UpdateManager.removeFromDownloadsQueue(updatableApp);
          assert.isFalse(UpdateManager._downloading);
          var css = UpdateManager.container.className;
          assert.equal(-1, css.indexOf('downloading'));
        });

        test('should remove system updates too', function() {
          var systemUpdate = new MockUpdatable('system');
          UpdateManager.downloadsQueue.push(systemUpdate);

          var initialLength = UpdateManager.downloadsQueue.length;
          UpdateManager.removeFromDownloadsQueue(systemUpdate);
          assert.equal(initialLength - 1, UpdateManager.downloadsQueue.length);
        });
      });
    });
  });
});
