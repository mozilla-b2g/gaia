'use strict';

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
requireApp('system/test/unit/mock_notification_screen.js');
requireApp('system/test/unit/mock_navigator_settings.js');
requireApp('system/test/unit/mock_navigator_wake_lock.js');
requireApp('system/test/unit/mock_l10n.js');

requireApp('system/test/unit/mocks_helper.js');

var mocksForUpdateManager = [
  'StatusBar',
  'SystemBanner',
  'NotificationScreen',
  'UtilityTray',
  'CustomDialog',
  'SystemUpdatable',
  'AppUpdatable',
  'SettingsListener'
];

mocksForUpdateManager.forEach(function(mockName) {
  if (! window[mockName]) {
    window[mockName] = null;
  }
});

suite('system/UpdateManager', function() {
  var realL10n;
  var realRequestWakeLock;
  var realNavigatorSettings;
  var realDispatchEvent;

  var apps;
  var updatableApps;
  var uAppWithDownloadAvailable;
  var appWithDownloadAvailable;
  var fakeNode;
  var fakeToaster;
  var fakeDialog;

  var tinyTimeout = 10;
  var lastDispatchedEvent = null;

  var mocksHelper;

  suiteSetup(function() {
    realNavigatorSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realRequestWakeLock = navigator.requestWakeLock;
    navigator.requestWakeLock = MockNavigatorWakeLock.requestWakeLock;

    realDispatchEvent = UpdateManager._dispatchEvent;
    UpdateManager._dispatchEvent = function fakeDispatch(type, value) {
      lastDispatchedEvent = {
        type: type,
        value: value
      };
    };

    mocksHelper = new MocksHelper(mocksForUpdateManager);
    mocksHelper.suiteSetup();

    UpdateManager.NOTIFICATION_BUFFERING_TIMEOUT = 0;
    UpdateManager.TOASTER_TIMEOUT = 0;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realNavigatorSettings;
    realNavigatorSettings = null;

    navigator.mozL10n = realL10n;
    navigator.requestWakeLock = realRequestWakeLock;
    realRequestWakeLock = null;

    UpdateManager._dispatchEvent = realDispatchEvent;

    mocksHelper.suiteTeardown();
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

    mocksHelper.setup();
  });

  teardown(function(done) {
    // We wait for the nextTick in order to let the UpdateManger's
    // timeouts finish (they are all set to 0)
    setTimeout(function() {
      UpdateManager.updatableApps = [];
      UpdateManager.updatesQueue = [];
      UpdateManager.downloadsQueue = [];
      UpdateManager._downloading = false;
      UpdateManager._uncompressing = false;
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

      mocksHelper.teardown();

      fakeNode.parentNode.removeChild(fakeNode);
      fakeToaster.parentNode.removeChild(fakeToaster);
      fakeDialog.parentNode.removeChild(fakeDialog);

      lastDispatchedEvent = null;
      MockNavigatorWakeLock.mTeardown();
      MockNavigatorSettings.mTeardown();

      done();
    });
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

    test('should not add downloadAvailable apps pending', function(done) {
      var pendingApp = new MockApp({
        installState: 'pending',
        downloadAvailable: true
      });
      MockAppsMgmt.mApps = [pendingApp];

      MockAppsMgmt.mNext = function() {
        assert.equal(UpdateManager.updatesQueue.length, 0);
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

      assert.equal(UpdateManager.startDownloads.name,
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
        MockAppsMgmt.mTriggerOninstall(installedApp);
      });

      test('should instantiate an updatable app', function() {
        var lastIndex = UpdateManager.updatableApps.length - 1;
        var lastUApp = UpdateManager.updatableApps[lastIndex];
        assert.equal(installedApp.mId, lastUApp.app.mId);
      });
    });

    suite('app uninstall', function() {
      var partialApp;

      setup(function() {
        UpdateManager.init();
        UpdateManager.updatableApps = updatableApps;
        UpdateManager.addToUpdatesQueue(uAppWithDownloadAvailable);

        partialApp = {
          origin: appWithDownloadAvailable.origin,
          manifestURL: appWithDownloadAvailable.manifestURL
        };
      });

      test('should remove the updatable app', function() {
        var initialLength = UpdateManager.updatableApps.length;
        MockAppsMgmt.mTriggerOnuninstall(partialApp);
        assert.equal(initialLength - 1, UpdateManager.updatableApps.length);
      });

      test('should remove from the update queue', function() {
        var initialLength = UpdateManager.updatesQueue.length;
        MockAppsMgmt.mTriggerOnuninstall(partialApp);
        assert.equal(initialLength - 1, UpdateManager.updatesQueue.length);
      });

      test('should call uninit on the updatable', function() {
        var lastIndex = UpdateManager.updatesQueue.length - 1;
        var updatableApp = UpdateManager.updatesQueue[lastIndex];
        MockAppsMgmt.mTriggerOnuninstall(partialApp);
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

      test('should not add or instanciate a system updatable if there is one',
      function() {
        var initialLength = UpdateManager.updatesQueue.length;

        UpdateManager.handleEvent(event);

        assert.equal(UpdateManager.updatesQueue.length, initialLength);
        assert.equal(MockSystemUpdatable.mInstancesCount, 1);
      });
    });
  });

  suite('UI', function() {
    setup(function() {
      MockAppsMgmt.mApps = [];
      UpdateManager.init();
      UpdateManager.updatableApps = updatableApps;
    });

    suite('downloading state', function() {
      test('should add the css class if downloading', function() {
        UpdateManager._downloading = true;
        UpdateManager.render();
        var css = UpdateManager.container.classList;
        assert.isTrue(css.contains('downloading'));
      });

      test('should remove the css class if not downloading', function() {
        UpdateManager._downloading = true;
        UpdateManager.render();

        UpdateManager._downloading = false;
        UpdateManager.render();
        var css = UpdateManager.container.classList;
        assert.isFalse(css.contains('downloading'));
      });

      test('should show the downloading progress if downloading', function() {
        UpdateManager._downloading = true;
        UpdateManager.render();
        assert.equal('downloadingUpdateMessage{"progress":"0.00 bytes"}',
                     UpdateManager.message.textContent);
      });

      test('should show the available message if not downloading', function() {
        UpdateManager.updatesQueue = updatableApps;
        UpdateManager.render();
        assert.equal('updateAvailableInfo{"n":3}',
                     UpdateManager.message.textContent);
      });
    });

    suite('progress display', function() {
      setup(function() {
        UpdateManager.updatesQueue = [uAppWithDownloadAvailable];

        var evt = document.createEvent('MouseEvents');
        evt.initEvent('click', true, true);
        UpdateManager.startDownloads(evt);

        UpdateManager.addToDownloadsQueue(uAppWithDownloadAvailable);

        UpdateManager.downloadProgressed(1234);
      });

      test('downloadedBytes should be reset by startDownloads', function() {
        var evt = document.createEvent('MouseEvents');
        evt.initEvent('click', true, true);
        UpdateManager.startDownloads(evt);

        assert.equal('downloadingUpdateMessage{"progress":"0.00 bytes"}',
                     UpdateManager.message.textContent);
      });

      test('should increment the downloadedBytes', function() {
        UpdateManager.downloadProgressed(100);
        assert.equal('downloadingUpdateMessage{"progress":"1.30 kB"}',
                     UpdateManager.message.textContent);
      });

      test('should not update if bytes <= 0', function() {
        UpdateManager.downloadProgressed(-100);
        assert.equal('downloadingUpdateMessage{"progress":"1.21 kB"}',
                     UpdateManager.message.textContent);
      });
    });

    suite('uncompress display', function() {
      var systemUpdatable;

      setup(function() {
        systemUpdatable = new MockSystemUpdatable(42);
      });

      suite('when we only have the system update', function() {
        setup(function() {
          UpdateManager.addToUpdatesQueue(systemUpdatable);
          UpdateManager.addToDownloadsQueue(systemUpdatable);
          UpdateManager.startedUncompressing();
        });

        test('should render in uncompressing mode', function() {
          assert.equal(UpdateManager.message.textContent,
                       'uncompressingMessage');
        });
      });

      suite('when we have various ongoing updates', function() {
        setup(function() {
          UpdateManager.addToUpdatableApps(uAppWithDownloadAvailable);
          UpdateManager.addToUpdatesQueue(uAppWithDownloadAvailable);
          UpdateManager.addToDownloadsQueue(uAppWithDownloadAvailable);

          UpdateManager.addToUpdatesQueue(systemUpdatable);
          UpdateManager.addToDownloadsQueue(systemUpdatable);

          UpdateManager.startedUncompressing();
        });

        test('should stay in downloading mode', function() {
          assert.include(UpdateManager.message.textContent,
                          'downloadingUpdateMessage');
        });

        suite('once the app updates are done', function() {
          setup(function() {
            UpdateManager.removeFromDownloadsQueue(uAppWithDownloadAvailable);
            UpdateManager.removeFromUpdatesQueue(uAppWithDownloadAvailable);
          });

          test('should render in uncompressing mode', function() {
            assert.equal(UpdateManager.message.textContent,
                         'uncompressingMessage');
          });
        });
      });
    });

    suite('container visibility', function() {
      suiteSetup(function() {
        UpdateManager.NOTIFICATION_BUFFERING_TIMEOUT = tinyTimeout;
        UpdateManager.TOASTER_TIMEOUT = tinyTimeout;
      });

      suiteTeardown(function() {
        UpdateManager.NOTIFICATION_BUFFERING_TIMEOUT = 0;
        UpdateManager.TOASTER_TIMEOUT = 0;
      });

      setup(function() {
        UpdateManager.addToUpdatesQueue(uAppWithDownloadAvailable);
      });

      teardown(function(done) {
        // wait for all actions to happen in UpdateManager before reseting
        setTimeout(function() {
          done();
        }, tinyTimeout * 2);
      });

      suite('displaying the container after a timeout', function() {
        setup(function() {
          var css = UpdateManager.container.classList;
          assert.isFalse(css.contains('displayed'));
        });

        test('should display after a timeout', function(done) {
          setTimeout(function() {
            var css = UpdateManager.container.classList;
            assert.isTrue(css.contains('displayed'));
            done();
          }, tinyTimeout * 2);
        });

        test('should not display if there are no more updates', function(done) {
          UpdateManager.updatesQueue.forEach(function(uApp) {
            UpdateManager.removeFromUpdatesQueue(uApp);
          });

          setTimeout(function() {
            var css = UpdateManager.container.classList;
            assert.isFalse(css.contains('displayed'));
            done();
          }, tinyTimeout * 2);
        });

        test('should display an updated count', function(done) {
          UpdateManager.addToUpdatesQueue(updatableApps[1]);
          setTimeout(function() {
            assert.equal('updateAvailableInfo{"n":2}',
                         UpdateManager.message.textContent);
            done();
          }, tinyTimeout * 2);
        });

        suite('update toaster', function() {
          test('should display after a timeout', function(done) {
            var css = UpdateManager.container.classList;
            assert.isFalse(css.contains('displayed'));
            setTimeout(function() {
              var css = UpdateManager.toaster.classList;
              assert.isTrue(css.contains('displayed'));
              assert.equal('updateAvailableInfo{"n":1}',
                           UpdateManager.message.textContent);
              done();
            }, tinyTimeout * 1.5);
          });

          test('should display an updated count', function(done) {
            UpdateManager.addToUpdatesQueue(updatableApps[1]);
            setTimeout(function() {
              assert.equal('updateAvailableInfo{"n":2}',
                           UpdateManager.message.textContent);
              done();
            }, tinyTimeout * 2);
          });

          test('should show the right message', function(done) {
            setTimeout(function() {
              assert.equal('updateAvailableInfo{"n":1}',
                           UpdateManager.toasterMessage.textContent);
              done();
            }, tinyTimeout * 2);
          });


          test('should hide after TOASTER_TIMEOUT', function(done) {
            UpdateManager.addToUpdatesQueue(updatableApps[1]);
            setTimeout(function() {
              setTimeout(function() {
                var css = UpdateManager.toaster.classList;
                assert.isFalse(css.contains('displayed'));
                done();
              }, tinyTimeout * 2);
            }, tinyTimeout * 2);
          });
        });

        test('should add a new statusbar notification', function(done) {
          var method1 = 'incExternalNotifications';
          setTimeout(function() {
            assert.ok(MockNotificationScreen.wasMethodCalled[method1]);
            done();
          }, tinyTimeout * 2);
        });
      });

      suite('no more updates', function() {
        setup(function() {
          UpdateManager.container.classList.add('displayed');
          UpdateManager.updatesQueue = [uAppWithDownloadAvailable];
          UpdateManager.removeFromUpdatesQueue(uAppWithDownloadAvailable);
        });

        test('should hide the container', function() {
          var css = UpdateManager.container.classList;
          assert.isFalse(css.contains('displayed'));
        });

        test('should decrease the external notifications count', function() {
          var method1 = 'decExternalNotifications';
          assert.ok(MockNotificationScreen.wasMethodCalled[method1]);
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
      suiteSetup(function() {
        UpdateManager.NOTIFICATION_BUFFERING_TIMEOUT = tinyTimeout;
        UpdateManager.TOASTER_TIMEOUT = tinyTimeout;
      });

      suiteTeardown(function() {
        UpdateManager.NOTIFICATION_BUFFERING_TIMEOUT = 0;
        UpdateManager.TOASTER_TIMEOUT = 0;
      });

      setup(function() {
        UpdateManager.init();
        UpdateManager.requestErrorBanner();
      });

      teardown(function(done) {
        // wait for all actions to happen in UpdateManager before reseting
        setTimeout(function() {
          done();
        }, tinyTimeout * 2);
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
      test('should handle 0', function() {
        assert.equal('0.00 bytes', UpdateManager._humanizeSize(0));
      });

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

    suite('start downloads', function() {
      var systemUpdatable, appUpdatable, evt;

      setup(function() {
        UpdateManager.init();

        systemUpdatable = new MockSystemUpdatable(5296345);

        appUpdatable = new MockAppUpdatable(new MockApp());
        appUpdatable.name = 'Angry birds';
        appUpdatable.size = '423459';

        UpdateManager.addToUpdatableApps(appUpdatable);
        UpdateManager.addToUpdatesQueue(appUpdatable);
        UpdateManager.addToUpdatesQueue(systemUpdatable);

        UpdateManager.container.click();

        evt = document.createEvent('MouseEvents');
        evt.initEvent('click', true, true);
      });

      test('should enable the download button', function() {
        var downloadButton = UpdateManager.downloadButton;
        assert.isFalse(downloadButton.disabled);
      });

      suite('with all the checkboxes checked', function() {
        setup(function() {
          UpdateManager.startDownloads(evt);
        });

        test('should download system updates', function() {
          assert.isTrue(systemUpdatable.mDownloadCalled);
        });

        test('should call download on checked app updatables', function() {
          assert.isTrue(appUpdatable.mDownloadCalled);
        });
      });

      suite('with no checkbox checked', function() {
        setup(function() {
          var dialog = UpdateManager.downloadDialogList;
          var checkboxes = dialog.querySelectorAll('input[type="checkbox"]');
          for (var i = 0; i < checkboxes.length; i++) {
            var checkbox = checkboxes[i];
            if (checkbox.checked) {
              checkbox.click();
            }
          }

          UpdateManager.startDownloads(evt);
        });

        test('the download button should be enabled', function() {
          assert.isFalse(UpdateManager.downloadButton.disabled);
        });

        test('should still download system updates', function() {
          assert.isTrue(systemUpdatable.mDownloadCalled);
        });

        test('should not call download on unchecked app updatables',
        function() {
          assert.isFalse(appUpdatable.mDownloadCalled);
        });
      });

      suite('with only app updates', function() {
        setup(function() {
          UpdateManager.removeFromUpdatesQueue(systemUpdatable);
          UpdateManager.container.click();
        });

        suite('unchecking all the checkboxes', function() {
          var dialog, downloadButton;

          setup(function() {
            dialog = UpdateManager.downloadDialogList;
            var checkboxes = dialog.querySelectorAll('input[type="checkbox"]');
            for (var i = 0; i < checkboxes.length; i++) {
              var checkbox = checkboxes[i];
              if (checkbox.checked) {
                checkboxes[i].click();
              }
            }

            downloadButton = UpdateManager.downloadButton;
          });

          test('should disable the download button', function() {
            assert.isTrue(downloadButton.disabled);
          });

          suite('then checking one back', function() {
            setup(function() {
              var checkbox = dialog.querySelector('input[type="checkbox"]');
              checkbox.click();
            });

            test('should enable the download button back', function() {
              assert.isFalse(downloadButton.disabled);
            });
          });
        });
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
          var css = UpdateManager.downloadDialog.classList;
          assert.isTrue(css.contains('visible'));
        });

        test('should set the title', function() {
          var title = fakeDialog.querySelector('h1');
          assert.equal('numberOfUpdates{"n":3}', title.textContent);
        });

        suite('update list rendering', function() {
          test('should create an item for each update', function() {
            assert.equal(3, UpdateManager.downloadDialogList.children.length);
          });

          test('should render system update item first with required',
          function() {
            var item = UpdateManager.downloadDialogList.children[0];

            assert.include(item.textContent, 'systemUpdate');
            assert.include(item.textContent, '5.05 MB');
            assert.include(item.textContent, 'required');
          });

          test('should render packaged app items alphabetically with checkbox',
            function() {
            var item = UpdateManager.downloadDialogList.children[1];

            assert.include(item.textContent, 'Angry birds');
            assert.include(item.textContent, '413.53 kB');

            var checkbox = item.querySelector('input');
            assert.equal(checkbox.type, 'checkbox');
            assert.isTrue(checkbox.checked);
            assert.equal(checkbox.dataset.position, '1');
          });

          test('should render hosted app items alphabetically with checkbox',
          function() {
            var item = UpdateManager.downloadDialogList.children[2];

            assert.include(item.textContent, 'Twitter');

            var checkbox = item.querySelector('input');
            assert.equal(checkbox.type, 'checkbox');
            assert.isTrue(checkbox.checked);
            assert.equal(checkbox.dataset.position, '2');
          });
        });
      });

      test('should handle cancellation', function() {
        UpdateManager.cancelPrompt();

        var css = UpdateManager.downloadDialog.classList;
        assert.isFalse(css.contains('visible'));
      });

      test('should handle confirmation', function() {
        var evt = document.createEvent('MouseEvents');
        evt.initEvent('click', true, true);

        UpdateManager.startDownloads(evt);
        var css = UpdateManager.downloadDialog.classList;
        assert.isFalse(css.contains('visible'));
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

      suite('when asked to check', function() {
        setup(function() {
          UpdateManager.checkForUpdates(true);
        });

        test('should dispatch force update event if asked for', function() {
          assert.equal('force-update-check', lastDispatchedEvent.type);
        });

        test('should set the setting back to false', function() {
          var setting = 'gaia.system.checkForUpdates';
          assert.isFalse(MockNavigatorSettings.mSettings[setting]);
        });
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

          var pendingApp = new MockApp({ installState: 'pending' }),
              uPendingApp = new MockAppUpdatable(pendingApp);

          UpdateManager.updatableApps = [updatableApp, uPendingApp];
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
          assert.equal('updateAvailableInfo{"n":1}',
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

        test('should not add a pending app to the array', function() {
          var updatableApp = UpdateManager.updatableApps[1];

          var initialLength = UpdateManager.updatesQueue.length;

          UpdateManager.addToUpdatesQueue(updatableApp);
          assert.equal(UpdateManager.updatesQueue.length, initialLength);
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
          assert.equal('updateAvailableInfo{"n":0}',
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

        suite('switching to downloading mode on first add', function() {
          setup(function() {
            UpdateManager.addToDownloadsQueue(updatableApp);
          });

          test('should add css class', function() {
            var css = UpdateManager.container.classList;
            assert.isTrue(css.contains('downloading'));
          });

          test('should ask for statusbar indicator', function() {
            var incMethod = 'incSystemDownloads';
            assert.ok(MockStatusBar.wasMethodCalled[incMethod]);
          });

          test('should request wifi wake lock', function() {
            assert.equal('wifi', MockNavigatorWakeLock.mLastWakeLock.topic);
            assert.isFalse(MockNavigatorWakeLock.mLastWakeLock.released);
          });
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
          UpdateManager.init();

          UpdateManager.addToUpdatableApps(updatableApp);
          UpdateManager.addToDownloadsQueue(updatableApp);
        });

        test('should remove if in downloadsQueue array', function() {
          var initialLength = UpdateManager.downloadsQueue.length;
          UpdateManager.removeFromDownloadsQueue(updatableApp);
          assert.equal(initialLength - 1, UpdateManager.downloadsQueue.length);
        });

        suite('should switch off downloading mode on last remove', function() {
          setup(function() {
            UpdateManager.removeFromDownloadsQueue(updatableApp);
          });

          test('should remove css class', function() {
            var css = UpdateManager.container.classList;
            assert.isFalse(css.contains('downloading'));
          });

          test('should remove statusbar indicator', function() {
            var decMethod = 'decSystemDownloads';
            assert.ok(MockStatusBar.wasMethodCalled[decMethod]);
          });

          test('should release the wifi wake lock', function() {
            assert.equal('wifi', MockNavigatorWakeLock.mLastWakeLock.topic);
            assert.isTrue(MockNavigatorWakeLock.mLastWakeLock.released);
          });
        });

        test('should not break if wifi unlock throws an exception',
             function() {
          MockNavigatorWakeLock.mThrowAtNextUnlock();
          UpdateManager.removeFromDownloadsQueue(updatableApp);
          assert.ok(true);
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
