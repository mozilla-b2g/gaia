requireApp('system/test/unit/mock_app.js');
requireApp('system/test/unit/mock_chrome_event.js');
requireApp('system/test/unit/mock_statusbar.js');
requireApp('system/test/unit/mock_app.js');
requireApp('system/test/unit/mock_system_banner.js');
requireApp('system/test/unit/mock_notification_screen.js');

requireApp('system/js/app_install_manager.js');

// prevent Mocha to choke on "leaks" that are not leaks
if (!window.StatusBar) {
  window.StatusBar = null;
}

if (!window.SystemBanner) {
  window.SystemBanner = null;
}

if (!window.NotificationScreen) {
  window.NotificationScreen = null;
}

suite('system/AppInstallManager', function() {
  var realL10n;
  var realDispatchResponse;
  var realStatusBar;
  var realSystemBanner;
  var realNotificationScreen;

  var fakeDialog, fakeNotif;
  var fakeCancelDialog;

  var lastL10nParams = null;
  var lastDispatchedResponse = null;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      get: function get(key, params) {
        lastL10nParams = params;
        return key;
      }
    };

    realDispatchResponse = AppInstallManager.dispatchResponse;
    AppInstallManager.dispatchResponse = function fakeDispatch(id, type) {
      lastDispatchedResponse = {
        id: id,
        type: type
      };
    };

    realStatusBar = window.StatusBar;
    window.StatusBar = MockStatusBar;

    realSystemBanner = window.SystemBanner;
    window.SystemBanner = MockSystemBanner;

    realNotificationScreen = window.NotificationScreen;
    window.NotificationScreen = MockNotificationScreen;
  });

  suiteTeardown(function() {
    AppInstallManager.dialog = null;
    AppInstallManager.msg = null;
    AppInstallManager.size = null;
    AppInstallManager.authorName = null;
    AppInstallManager.authorUrl = null;
    AppInstallManager.installButton = null;
    AppInstallManager.cancelButton = null;
    AppInstallManager.installCallback = null;
    AppInstallManager.cancelCallback = null;

    navigator.mozL10n = realL10n;
    AppInstallManager.dispatchResponse = realDispatchResponse;

    window.StatusBar = realStatusBar;
    realStatusBar = null;

    window.SystemBanner = realSystemBanner;
    realSystemBanner = null;

    window.NotificationScreen = realNotificationScreen;
    realNotificationScreen = null;
  });

  setup(function() {
    fakeDialog = document.createElement('form');
    fakeDialog.id = 'app-install-dialog';
    fakeDialog.innerHTML = [
      '<section>',
        '<h1 id="app-install-message"></h1>',
        '<table>',
          '<tr>',
            '<th data-l10n-id="size">Size</th>',
            '<td id="app-install-size"></td>',
          '</tr>',
          '<tr>',
            '<th data-l10n-id="author">Author</th>',
            '<td>',
              '<span id="app-install-author-name"></span>',
              '<br /><span id="app-install-author-url"></span>',
            '</td>',
          '</tr>',
        '</table>',
        '<menu>',
          '<button id="app-install-cancel-button" type="reset"' +
          ' data-l10n-id="cancel">Cancel</button>',
          '<button id="app-install-install-button" type="submit"' +
          ' data-l10n-id="install">Install</button>',
        '</menu>',
      '</section>'
    ].join('');

    fakeCancelDialog = document.createElement('form');
    fakeCancelDialog.id = 'app-install-cancel-dialog';
    fakeCancelDialog.innerHTML = [
      '<form id="app-install-cancel-dialog" data-type="confirm" ' +
      'role="dialog" data-z-index-level="app-install-dialog">',
        '<section>',
          '<h1 data-l10n-id="cancel-install">Cancel Install</h1>',
          '<p>',
            '<small data-l10n-id="cancelling-will-not-refund">Cancelling ' +
            'will not refund a purchase. Refunds for paid content are ' +
            'provided by the original seller.</small>',
            '<small data-l10n-id="apps-can-be-installed-later">Apps can be ' +
            'installed later from the original installation source.</small>',
          '</p>',
          '<p data-l10n-id="are-you-sure-you-want-to-cancel">' +
          'Are you sure you want to cancel this install?</p>',
          '<menu>',
            '<button id="app-install-confirm-cancel-button" type="reset" ' +
            'data-l10n-id="cancel-install">Cancel Install</button>',
            '<button id="app-install-resume-button" type="submit" ' +
            'data-l10n-id="resume">Resume</button>',
          '</menu>',
        '</section>',
      '</form>'
    ].join('');

    fakeNotif = document.createElement('div');
    fakeNotif.id = 'install-manager-notification-container';

    document.body.appendChild(fakeDialog);
    document.body.appendChild(fakeCancelDialog);
    document.body.appendChild(fakeNotif);
    AppInstallManager.init();
  });

  teardown(function() {
    fakeDialog.parentNode.removeChild(fakeDialog);
    fakeCancelDialog.parentNode.removeChild(fakeCancelDialog);
    fakeNotif.parentNode.removeChild(fakeNotif);
    lastDispatchedResponse = null;
    lastL10nParams = null;

    MockStatusBar.mTearDown();
  });

  suite('init', function() {
    test('should bind dom elements', function() {
      assert.equal('app-install-dialog', AppInstallManager.dialog.id);
      assert.equal('app-install-message', AppInstallManager.msg.id);
      assert.equal('app-install-size', AppInstallManager.size.id);
      assert.equal('app-install-author-name', AppInstallManager.authorName.id);
      assert.equal('app-install-author-url', AppInstallManager.authorUrl.id);
      assert.equal('app-install-install-button',
        AppInstallManager.installButton.id);
      assert.equal('app-install-cancel-button',
        AppInstallManager.cancelButton.id);
      assert.equal('app-install-cancel-dialog',
        AppInstallManager.cancelDialog.id);
      assert.equal('app-install-confirm-cancel-button',
        AppInstallManager.confirmCancelButton.id);
      assert.equal('app-install-resume-button',
        AppInstallManager.resumeButton.id);
    });

    test('should bind to the click event', function() {
      assert.equal(AppInstallManager.handleInstall.name,
                   AppInstallManager.installButton.onclick.name);
      assert.equal(AppInstallManager.showCancelDialog.name,
                   AppInstallManager.cancelButton.onclick.name);
      assert.equal(AppInstallManager.handleCancel.name,
                   AppInstallManager.confirmCancelButton.onclick.name);
      assert.equal(AppInstallManager.hideCancelDialog.name,
                   AppInstallManager.resumeButton.onclick.name);
    });
  });

  suite('events', function() {
    suite('webapps-ask-install', function() {
      setup(function() {
        var evt = new MockChromeEvent({
          type: 'webapps-ask-install',
          id: 42,
          app: {
            manifest: {
              name: 'Fake app',
              size: 5245678,
              developer: {
                name: 'Fake dev',
                url: 'http://fakesoftware.com'
              }
            }
          }
        });

        AppInstallManager.handleAppInstallPrompt(evt.detail);
      });

      test('should display the dialog', function() {
        assert.equal('visible', AppInstallManager.dialog.className);
      });

      test('should fill the message with app name', function() {
        assert.equal('install-app', AppInstallManager.msg.textContent);
        assert.deepEqual({'name': 'Fake app'}, lastL10nParams);
      });

      test('should use the mini manifest if no manifest', function() {
        var evt = new MockChromeEvent({
          type: 'webapps-ask-install',
          id: 42,
          app: {
            updateManifest: {
              name: 'Fake app',
              size: 5245678,
              developer: {
                name: 'Fake dev',
                url: 'http://fakesoftware.com'
              }
            }
          }
        });

        AppInstallManager.handleAppInstallPrompt(evt.detail);

        assert.equal('install-app', AppInstallManager.msg.textContent);
        assert.deepEqual({'name': 'Fake app'}, lastL10nParams);
      });

      test('should fill the developer infos', function() {
        assert.equal('Fake dev', AppInstallManager.authorName.textContent);
        assert.equal('http://fakesoftware.com',
          AppInstallManager.authorUrl.textContent);
      });

      test('should tell if the developer is unknown', function() {
        var evt = new MockChromeEvent({
          type: 'webapps-ask-install',
          id: 42,
          app: {
            updateManifest: {
              name: 'Fake app',
              size: 5245678
            }
          }
        });

        AppInstallManager.handleAppInstallPrompt(evt.detail);
        assert.equal('unknown', AppInstallManager.authorName.textContent);
        assert.equal('', AppInstallManager.authorUrl.textContent);
      });

      suite('install size', function() {
        test('should display the package size', function() {
          assert.equal('5.00 MB', AppInstallManager.size.textContent);
        });

        test('should tell if the size is unknown', function() {
          var evt = new MockChromeEvent({
            type: 'webapps-ask-install',
            id: 42,
            app: {
              manifest: {
                name: 'Fake app',
                developer: {
                  name: 'Fake dev',
                  url: 'http://fakesoftware.com'
                }
              }
            }
          });

          AppInstallManager.handleAppInstallPrompt(evt.detail);
          assert.equal('unknown', AppInstallManager.size.textContent);
        });
      });

      suite('callbacks', function() {
        suite('install', function() {
          var defaultPrevented = false;
          setup(function() {
            AppInstallManager.handleInstall({preventDefault: function() {
              defaultPrevented = true;
            }});
          });

          test('should dispatch a webapps-install-granted with the right id',
            function() {
            assert.equal(42, lastDispatchedResponse.id);
            assert.equal('webapps-install-granted',
              lastDispatchedResponse.type);
          });

          test('should prevent the default to avoid form submission',
            function() {
            assert.isTrue(defaultPrevented);
          });

          test('should hide the dialog', function() {
            assert.equal('', AppInstallManager.dialog.className);
          });

          test('should remove the callback', function() {
            assert.equal(null, AppInstallManager.installCallback);
          });
        });

        suite('show cancel dialog', function() {
          setup(function() {
            AppInstallManager.showCancelDialog();
          });

          test('should show cancel dialog and hide dialog', function() {
            assert.equal('visible', AppInstallManager.cancelDialog.className);
            assert.equal('', AppInstallManager.dialog.className);
          });
        });

        suite('hide cancel dialog', function() {
          setup(function() {
            AppInstallManager.hideCancelDialog();
          });

          test('should hide cancel dialog and show dialog', function() {
            assert.equal('', AppInstallManager.cancelDialog.className);
            assert.equal('visible', AppInstallManager.dialog.className);
          });
        });

        suite('confirm cancel', function() {
          setup(function() {
            AppInstallManager.handleCancel();
          });

          test('should dispatch a webapps-install-denied', function() {
            assert.equal(42, lastDispatchedResponse.id);
            assert.equal('webapps-install-denied', lastDispatchedResponse.type);
          });

          test('should hide the dialog', function() {
            assert.equal('', AppInstallManager.cancelDialog.className);
          });

          test('should remove the callback', function() {
            assert.equal(null, AppInstallManager.cancelCallback);
          });
        });
      });
    });
  });

  suite('duringInstall', function() {
    var mockApp, e;

    setup(function() {
      realSystemBanner = SystemBanner;
      SystemBanner = MockSystemBanner;
      e = new CustomEvent('applicationinstall', { detail: {} });
    });

    teardown(function() {
      SystemBanner.mTearDown;
      SystemBanner = realSystemBanner;
    });

    function dispatchEvent() {
        e.detail.application = mockApp;
        window.dispatchEvent(e);
    }

    suite('hosted app without cache', function() {
      setup(function() {
        mockApp = new MockApp({
          manifest: {
            name: 'Fake hosted app',
            developer: {
              name: 'Fake dev',
              url: 'http://fakesoftware.com'
            }
          },
          updateManifest: null,
          installState: 'installed'
        });
        dispatchEvent();
      });

      test('should not show the icon', function() {
        assert.isUndefined(MockStatusBar.wasMethodCalled['incSystemDownloads']);
      });

      test('should not add a notification', function() {
        assert.equal(fakeNotif.childElementCount, 0);
      });

    });

    suite('hosted app with cache', function() {
      setup(function() {
        mockApp = new MockApp({
          manifest: {
            name: 'Fake hosted app with cache',
            developer: {
              name: 'Fake dev',
              url: 'http://fakesoftware.com'
            }
          },
          updateManifest: null,
          installState: 'pending'
        });

        dispatchEvent();
      });

      test('should show the icon', function() {
        assert.ok(MockStatusBar.wasMethodCalled['incSystemDownloads']);
      });

      test('should remove the icon if we get downloadsuccess', function() {
        mockApp.mTriggerDownloadSuccess();
        assert.ok(MockStatusBar.wasMethodCalled['decSystemDownloads']);
      });

      test('should remove the icon and display error if we get downloaderror', function() {
        mockApp.mTriggerDownloadError();
        assert.ok(MockStatusBar.wasMethodCalled['decSystemDownloads']);
        assert.equal(MockSystemBanner.mMessage, 'Fake hosted app with cache download-stopped');
      });

      test('should add a notification', function() {
        assert.equal(fakeNotif.childElementCount, 1);
      });

      test('notification should have a message', function() {
        assert.equal(fakeNotif.querySelector('.message').textContent,
          'downloadingAppMessage');
        assert.equal(fakeNotif.querySelector('progress').textContent,
          'downloadingAppProgressNoMax');
      });

      test('notification progress should be indeterminate', function() {
        assert.equal(fakeNotif.querySelector('progress').position, -1);
      });

      test('should remove the notif if we get downloadsuccess', function() {
        mockApp.mTriggerDownloadSuccess();
        assert.equal(fakeNotif.childElementCount, 0);
      });

      test('should remove the notif if we get downloaderror', function() {
        mockApp.mTriggerDownloadError();
        assert.equal(fakeNotif.childElementCount, 0);
      });

      test('should keep the progress indeterminate on progress', function() {
        mockApp.mTriggerDownloadProgress(NaN);

        var progressNode = fakeNotif.querySelector('progress');
        assert.equal(progressNode.position, -1);
        assert.equal(progressNode.textContent, 'downloadingAppProgressIndeterminate');
      });

    });

    suite('packaged app', function() {
      setup(function() {
        mockApp = new MockApp({
          manifest: null,
          updateManifest: {
            name: 'Fake packaged app',
            size: 5245678,
            developer: {
              name: 'Fake dev',
              url: 'http://fakesoftware.com'
            }
          },
          installState: 'pending'
        });

        dispatchEvent();
      });

      test('should show the icon', function() {
        assert.ok(MockStatusBar.wasMethodCalled['incSystemDownloads']);
      });

      test('should remove the icon if we get downloadsuccess', function() {
        mockApp.mTriggerDownloadSuccess();
        assert.ok(MockStatusBar.wasMethodCalled['decSystemDownloads']);
      });

      test('should remove the icon and display error if we get downloaderror', function() {
        mockApp.mTriggerDownloadError();
        assert.ok(MockStatusBar.wasMethodCalled['decSystemDownloads']);
        assert.equal(MockSystemBanner.mMessage, 'Fake packaged app download-stopped');
      });

      test('should add a notification', function() {
        var method = 'incExternalNotifications';
        assert.equal(fakeNotif.childElementCount, 1);
        assert.ok(MockNotificationScreen.wasMethodCalled[method]);
      });

      test('notification should have a message', function() {
        assert.equal(fakeNotif.querySelector('.message').textContent,
          'downloadingAppMessage');
      });

      test('notification progress should have a max and a value', function() {
        assert.equal(fakeNotif.querySelector('progress').max,
          mockApp.updateManifest.size);
        assert.equal(fakeNotif.querySelector('progress').value, 0);
      });

      test('notification progress should not be indeterminate', function() {
        assert.notEqual(fakeNotif.querySelector('progress').position, -1);
      });

      test('should remove the notif if we get downloadsuccess', function() {
        var method = 'decExternalNotifications';
        mockApp.mTriggerDownloadSuccess();
        assert.equal(fakeNotif.childElementCount, 0);
        assert.ok(MockNotificationScreen.wasMethodCalled[method]);
      });

      test('should remove the notif if we get downloaderror', function() {
        mockApp.mTriggerDownloadError();
        assert.equal(fakeNotif.childElementCount, 0);
      });

      test('should update the progress notification on progress', function() {
        var newprogress = 10,
            size = mockApp.updateManifest.size,
            ratio = newprogress / size;
        mockApp.mTriggerDownloadProgress(newprogress);

        var progressNode = fakeNotif.querySelector('progress');
        assert.equal(progressNode.position, ratio);
        assert.equal(progressNode.textContent, 'downloadingAppProgress');
      });

      test('should update the progress text content if we do not have the actual progress', function (){
        mockApp.mTriggerDownloadProgress(NaN);

        var progressNode = fakeNotif.querySelector('progress');
        assert.equal(progressNode.textContent, 'downloadingAppProgressIndeterminate');
      });
    });
  });

  suite('humanizeSize', function() {
    test('should handle bytes size', function() {
      assert.equal('42.00 bytes', AppInstallManager.humanizeSize(42));
    });

    test('should handle kilobytes size', function() {
      assert.equal('1.00 kB', AppInstallManager.humanizeSize(1024));
    });

    test('should handle megabytes size', function() {
      assert.equal('4.67 MB', AppInstallManager.humanizeSize(4901024));
    });

    test('should handle gigabytes size', function() {
      assert.equal('3.73 GB', AppInstallManager.humanizeSize(4000901024));
    });

    test('should handle 0', function() {
      assert.equal('0.00 bytes', AppInstallManager.humanizeSize(0));
    });
  });
});
