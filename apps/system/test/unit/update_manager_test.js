requireApp('system/js/update_manager.js');

requireApp('system/test/unit/mock_app.js');
requireApp('system/test/unit/mock_updatable.js');
requireApp('system/test/unit/mock_apps_mgmt.js');
requireApp('system/test/unit/mock_custom_dialog.js');
requireApp('system/test/unit/mock_utility_tray.js');
requireApp('system/test/unit/mock_system_banner.js');
requireApp('system/test/unit/mock_chrome_event.js');
requireApp('system/test/unit/mock_settings_listener.js');
requireApp('system/test/unit/mock_statusbar.js');


// We're going to swap those with mock objects
// so we need to make sure they are defined.
if (!this.AppUpdatable) {
  this.AppUpdatable = null;
}
if (!this.SytemUpdatable) {
  this.SystemUpdatable = null;
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
if (!this.StatusBar) {
  this.StatusBar = null;
}

suite('system/UpdateManager', function() {
  var realAppUpdatable;
  var realSystemUpdatable;
  var realL10n;
  var realCustomDialog;
  var realUtilityTray;
  var realSystemBanner;
  var realSettingsListener;
  var realStatusBar;
  var realDispatchEvent;

  var apps;
  var updatableApps;
  var uAppWithDownloadAvailable;
  var appWithDownloadAvailable;
  var fakeNode;
  var fakeToaster;
  var fakeDialog;

  var tinyTimeout = 5;
  var lastDispatchedEvent = null;

  suiteSetup(function() {
    realAppUpdatable = window.AppUpdatable;
    window.AppUpdatable = MockAppUpdatable;

    realSystemUpdatable = window.SystemUpdatable;
    window.SystemUpdatable = MockSystemUpdatable;

    realCustomDialog = window.CustomDialog;
    window.CustomDialog = MockCustomDialog;

    realUtilityTray = window.UtilityTray;
    window.UtilityTray = MockUtilityTray;

    realSystemBanner = window.SystemBanner;
    window.SystemBanner = MockSystemBanner;

    realSettingsListener = window.SettingsListener;
    window.SettingsListener = MockSettingsListener;

    realStatusBar = window.StatusBar;
    window.StatusBar = MockStatusBar;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      get: function get(key, params) {
        if (params)
          return key + JSON.stringify(params);

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
    window.AppUpdatable = realAppUpdatable;
    window.SystemUpdatable = realSystemUpdatable;
    window.CustomDialog = realCustomDialog;
    window.UtilityTray = realUtilityTray;
    window.SystemBanner = realSystemBanner;
    window.SettingsListener = realSettingsListener;
    window.StatusBar = realStatusBar;

    navigator.mozL10n = realL10n;
    UpdateManager._dispatchEvent = realDispatchEvent;
  });

  setup(function() {
    UpdateManager._mgmt = MockAppsMgmt;

    apps = [new MockApp(), new MockApp(), new MockApp()];
    updatableApps = apps.map(function(app) {
      return new AppUpdatable(app);
    });
    MockAppsMgmt.mApps = apps;

    uAppWithDownloadAvailable = updatableApps[2];
    appWithDownloadAvailable = apps[2];
    appWithDownloadAvailable.downloadAvailable = true;

    fakeNode = document.createElement('div');
    fakeNode.id = 'update-manager-container';
    fakeNode.innerHTML = [
      '<div class="icon">',
      '</div>',
      '<div class="activity">',
      '</div>',
      '<div class="message">',
      '</div>'
    ].join('');

    fakeToaster = document.createElement('div');
    fakeToaster.id = 'update-manager-toaster';
    fakeToaster.innerHTML = [
      '<div class="icon">',
      '</div>',
      '<div class="message">',
      '</div>'
    ].join('');

    fakeDialog = document.createElement('form');
    fakeDialog.id = 'updates-download-dialog';
    fakeDialog.innerHTML = [
      '<section>',
        '<h1>',
          'Updates',
        '</h1>',
        '<ul>',
        '</ul>',
        '<menu>',
          '<button id="updates-later-button" type="reset">',
            'Later',
          '</button>',
          '<button id="updates-download-button" type="submit">',
            'Download',
          '</button>',
        '</menu>',
      '</section>'
    ].join('');

    document.body.appendChild(fakeNode);
    document.body.appendChild(fakeToaster);
    document.body.appendChild(fakeDialog);
  });

  teardown(function() {
    UpdateManager.updatableApps = [];
    UpdateManager.updatesQueue = [];
    UpdateManager.downloadsQueue = [];
    UpdateManager._downloading = false;
    UpdateManager.container = null;
    UpdateManager.message = null;
    UpdateManager.toaster = null;
    UpdateManager.toasterMessage = null;
    UpdateManager.laterButton = null;
    UpdateManager.downloadButton = null;
    UpdateManager.downloadDialog = null;
    UpdateManager.downloadDialogTitle = null;
    UpdateManager.downloadDialogList = null;

    MockAppsMgmt.mTeardown();
    MockCustomDialog.mTearDown();
    MockUtilityTray.mTearDown();
    MockSystemBanner.mTearDown();
    MockSettingsListener.mTearDown();
    MockStatusBar.mTearDown();

    fakeNode.parentNode.removeChild(fakeNode);
    fakeToaster.parentNode.removeChild(fakeToaster);
    fakeDialog.parentNode.removeChild(fakeDialog);

    lastDispatchedEvent = null;
  });

  suite('init', function() {
    test('should get all applications', function(done) {
      MockAppsMgmt.mNext = function() {
        assert.equal(3, UpdateManager.updatableApps.length);
        assert.equal(apps[0].mId, UpdateManager.updatableApps[0].app.mId);
        done();
      };
      UpdateManager.init();
    });

    test('should add apps with downloadAvailable on init', function(done) {
      MockAppsMgmt.mNext = function() {
        assert.equal(appWithDownloadAvailable.mId,
                     UpdateManager.updatesQueue[0].app.mId);
        done();
      };
      UpdateManager.init();
    });

    test('should bind dom elements', function() {
      UpdateManager.init();
      assert.equal('update-manager-container', UpdateManager.container.id);
      assert.equal('message', UpdateManager.message.className);

      assert.equal('update-manager-toaster', UpdateManager.toaster.id);
      assert.equal('message', UpdateManager.toasterMessage.className);

      assert.equal('updates-later-button', UpdateManager.laterButton.id);
      assert.equal('updates-download-button', UpdateManager.downloadButton.id);
      assert.equal('updates-download-dialog', UpdateManager.downloadDialog.id);
      assert.equal('H1', UpdateManager.downloadDialogTitle.tagName);
      assert.equal('UL', UpdateManager.downloadDialogList.tagName);
    });

    test('should bind to the click event', function() {
      UpdateManager.init();
      assert.equal(UpdateManager.containerClicked.name,
                   UpdateManager.container.onclick.name);

      assert.equal(UpdateManager.startAllDownloads.name,
                   UpdateManager.downloadButton.onclick.name);

      assert.equal(UpdateManager.cancelPrompt.name,
                   UpdateManager.laterButton.onclick.name);
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
        assert.equal(installedApp.mId, lastUApp.app.mId);
      });

      test('should add to the update queue if downloadAvailable', function() {
        var lastIndex = UpdateManager.updatesQueue.length - 1;
        var lastUApp = UpdateManager.updatesQueue[lastIndex];
        assert.equal(installedApp.mId, lastUApp.app.mId);
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
        var updatableApp = UpdateManager.updatesQueue[lastIndex];
        MockAppsMgmt.mTriggerOnuninstall();
        assert.isTrue(updatableApp.mUninitCalled);
      });
    });

    suite('system update available', function() {
      var event;

      setup(function() {
        UpdateManager.init();
        event = new MockChromeEvent({
          type: 'update-available',
          size: 42
        });
        UpdateManager.handleEvent(event);
      });

      test('should add a system updatable to the updates', function() {
        var lastIndex = UpdateManager.updatesQueue.length - 1;
        assert.equal(undefined, UpdateManager.updatesQueue[lastIndex].app);
      });

      test('should init the updatable with the download size', function() {
        var lastIndex = UpdateManager.updatesQueue.length - 1;
        assert.equal(42, UpdateManager.updatesQueue[lastIndex].size);
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
        UpdateManager.updatesQueue = updatableApps;
        UpdateManager.render();
        assert.equal('updatesAvailableMessage{"n":3}',
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
            assert.equal('updatesAvailableMessage{"n":2}',
                         UpdateManager.message.textContent);
            done();
          }, tinyTimeout * 2);
        });

        suite('update toaster', function() {
          test('should display after a timeout', function(done) {
            var css = UpdateManager.container.className;
            assert.equal(-1, css.indexOf('displayed'));
            setTimeout(function() {
              assert.include(UpdateManager.toaster.className, 'displayed');
              assert.equal('updatesAvailableMessage{"n":1}',
                           UpdateManager.message.textContent);
              done();
            }, tinyTimeout * 2);
          });

          test('should display an updated count', function(done) {
            UpdateManager.addToUpdatesQueue(updatableApps[1]);
            setTimeout(function() {
              assert.equal('updatesAvailableMessage{"n":2}',
                           UpdateManager.message.textContent);
              done();
            }, tinyTimeout * 2);
          });

          test('should show the right message', function(done) {
            setTimeout(function() {
              assert.equal('updatesAvailableMessage{"n":1}',
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

        test('should show a new statusbar notification', function(done) {
          MockStatusBar.notificationsCount = 2;
          assert.equal('2', MockStatusBar.notificationsCount);
          setTimeout(function() {
            assert.equal('3', MockStatusBar.notificationsCount);
            assert.equal(true, MockStatusBar.mNotificationUnread);
            done();
          }, tinyTimeout * 2);
        });
      });

      suite('no more updates', function() {
        setup(function() {
          MockStatusBar.notificationsCount = 1;
          UpdateManager.container.classList.add('displayed');
          UpdateManager.updatesQueue = [uAppWithDownloadAvailable];
          UpdateManager.removeFromUpdatesQueue(uAppWithDownloadAvailable);
        });

        test('should hide the container', function() {
          var css = UpdateManager.container.className;
          assert.equal(-1, css.indexOf('displayed'));
        });

        test('should hide the statusbar notification', function() {
          assert.equal(0, MockStatusBar.notificationsCount);
        });

        test('should not put the status bar count to -1', function() {
          MockStatusBar.notificationsCount = 0;
          UpdateManager.updatesQueue = [uAppWithDownloadAvailable];
          UpdateManager.removeFromUpdatesQueue(uAppWithDownloadAvailable);
          assert.equal(0, MockStatusBar.notificationsCount);
        });
      });
    });

    suite('after downloads', function() {
      test('should check if new updates where found', function() {
        var uApp = updatableApps[0];

        UpdateManager.updatableApps = updatableApps;
        UpdateManager.downloadsQueue = [uApp];

        UpdateManager.removeFromDownloadsQueue(uApp);
        assert.equal(uAppWithDownloadAvailable.app.mId,
                     UpdateManager.updatesQueue[0].app.mId);
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

    suite('humanizeSize', function() {
      test('should handle bytes size', function() {
        assert.equal('42.00 bytes', UpdateManager._humanizeSize(42));
      });

      test('should handle kilobytes size', function() {
        assert.equal('1.00 kB', UpdateManager._humanizeSize(1024));
      });

      test('should handle megabytes size', function() {
        assert.equal('4.67 MB', UpdateManager._humanizeSize(4901024));
      });

      test('should handle gigabytes size', function() {
        assert.equal('3.73 GB', UpdateManager._humanizeSize(4000901024));
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

        var evt = document.createEvent('MouseEvents');
        evt.initEvent('click', true, true);
        UpdateManager.startAllDownloads(evt);
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
        MockUtilityTray.show();
        var systemUpdatable = new MockSystemUpdatable(5296345);
        var appUpdatable = new MockAppUpdatable(new MockApp());
        appUpdatable.name = 'Angry birds';
        appUpdatable.size = '423459';
        var hostedAppUpdatable = new MockAppUpdatable(new MockApp());
        hostedAppUpdatable.name = 'Twitter';
        UpdateManager.updatesQueue = [hostedAppUpdatable, appUpdatable,
                                      systemUpdatable];
        UpdateManager.containerClicked();
      });

      suite('download prompt', function() {
        test('should hide the utility tray', function() {
          assert.isFalse(MockUtilityTray.mShown);
        });

        test('should show the download dialog', function() {
          assert.equal('visible', UpdateManager.downloadDialog.className);
        });

        test('should set the title', function() {
          var title = fakeDialog.querySelector('h1');
          assert.equal('updates{"n":3}', title.textContent);
        });

        suite('update list rendering', function() {
          test('should create an item for each update', function() {
            assert.equal(3, UpdateManager.downloadDialogList.children.length);
          });

          test('should render system update item first', function() {
            var item = UpdateManager.downloadDialogList.children[0];
            assert.equal('systemUpdate<span>5.05 MB</span>', item.innerHTML);
          });

          test('should render packaged app items alphabetically', function() {
            var item = UpdateManager.downloadDialogList.children[1];
            assert.equal('Angry birds<span>413.53 kB</span>', item.innerHTML);
          });

          test('should render hosted app items alphabetically', function() {
            var item = UpdateManager.downloadDialogList.children[2];
            assert.equal('Twitter', item.innerHTML);
          });
        });
      });

      test('should handle cancellation', function() {
        UpdateManager.cancelPrompt();
        assert.equal('', UpdateManager.downloadDialog.className);
      });

      test('should handle confirmation', function() {
        var evt = document.createEvent('MouseEvents');
        evt.initEvent('click', true, true);

        UpdateManager.startAllDownloads(evt);
        assert.equal('', UpdateManager.downloadDialog.className);
        assert.isTrue(MockUtilityTray.mShown);
        assert.isTrue(evt.defaultPrevented);
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
          var updatableApp = new MockAppUpdatable(installedApp);
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
          assert.equal('updatesAvailableMessage{"n":1}',
                       UpdateManager.message.textContent);
        });

        test('should not add app if not in updatableApps array', function() {
          var updatableApp = new MockAppUpdatable(new MockApp);
          var initialLength = UpdateManager.updatesQueue.length;
          UpdateManager.addToUpdatesQueue(updatableApp);
          assert.equal(initialLength, UpdateManager.updatesQueue.length);
        });

        test('should add a system update to the array', function() {
          var systemUpdate = new MockSystemUpdatable(42);

          var initialLength = UpdateManager.updatesQueue.length;
          UpdateManager.addToUpdatesQueue(systemUpdate);
          assert.equal(initialLength + 1, UpdateManager.updatesQueue.length);
        });

        test('should not add more than on system update', function() {
          var systemUpdate = new MockSystemUpdatable(42);

          UpdateManager.updatesQueue.push(new MockSystemUpdatable(42));
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
          updatableApp = new MockAppUpdatable(installedApp);
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
          assert.equal('updatesAvailableMessage{"n":0}',
                       UpdateManager.message.textContent);
        });

        test('should remove system updates too', function() {
          var systemUpdate = new MockSystemUpdatable(42);
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
          updatableApp = new MockAppUpdatable(installedApp);
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
          UpdateManager.addToDownloadsQueue(new MockSystemUpdatable(42));
          assert.equal(initialLength + 1, UpdateManager.downloadsQueue.length);
        });

        test('should not add more than one system updates', function() {
          var initialLength = UpdateManager.downloadsQueue.length;
          UpdateManager.addToDownloadsQueue(new MockSystemUpdatable(42));
          UpdateManager.addToDownloadsQueue(new MockSystemUpdatable(42));
          assert.equal(initialLength + 1, UpdateManager.downloadsQueue.length);
        });

        test('should switch to downloading mode at first add', function() {
          assert.isFalse(UpdateManager._downloading);
          UpdateManager.addToDownloadsQueue(updatableApp);
          assert.isTrue(UpdateManager._downloading);
          assert.include(UpdateManager.container.className, 'downloading');
        });

        test('should not add app if not in updatableApps array', function() {
          var updatableApp = new MockAppUpdatable(new MockApp);
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
          updatableApp = new MockAppUpdatable(installedApp);
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
          var systemUpdate = new MockSystemUpdatable();
          UpdateManager.downloadsQueue.push(systemUpdate);

          var initialLength = UpdateManager.downloadsQueue.length;
          UpdateManager.removeFromDownloadsQueue(systemUpdate);
          assert.equal(initialLength - 1, UpdateManager.downloadsQueue.length);
        });
      });
    });
  });
});
