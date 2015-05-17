/* global InputWindowManager, inputWindowManager, Service */

'use strict';

requireApp('system/test/unit/mock_app.js');
requireApp('system/test/unit/mock_chrome_event.js');
requireApp('system/test/unit/mock_system_banner.js');
requireApp('system/test/unit/mock_notification_screen.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_utility_tray.js');
requireApp('system/test/unit/mock_modal_dialog.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/test/unit/mock_ftu_launcher.js');
require('/js/input_window_manager.js');
require('/js/service.js');

require('/shared/js/tagged.js');
require('/shared/js/homescreens/confirm_dialog_helper.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_manifest_helper.js');
require('/shared/test/unit/mocks/mock_navigator_wake_lock.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_keyboard_helper.js');

requireApp('system/js/app_install_manager.js');

var mocksForAppInstallManager = new MocksHelper([
  'SystemBanner',
  'NotificationScreen',
  'Applications',
  'UtilityTray',
  'ModalDialog',
  'ManifestHelper',
  'LazyLoader',
  'FtuLauncher',
  'KeyboardHelper'
]).init();

suite('system/AppInstallManager >', function() {
  var realL10n;
  var realDispatchResponse;
  var realRequestWakeLock;
  var realMozApps;

  var fakeDialog, fakeNotif;
  var fakeInstallCancelDialog, fakeDownloadCancelDialog;
  var fakeSetupDialog, fakeImeListDialog;

  var lastL10nParams = null;
  var lastDispatchedResponse = null;

  var realApplications;

  mocksForAppInstallManager.attachTestHelpers();
  suiteSetup(function() {
    realL10n = navigator.mozL10n;

    navigator.mozL10n = MockL10n;

    realApplications = window.applications;
    window.applications = MockApplications;

    realDispatchResponse = AppInstallManager.dispatchResponse;
    AppInstallManager.dispatchResponse = function fakeDispatch(id, type) {
      lastDispatchedResponse = {
        id: id,
        type: type
      };
    };

    realRequestWakeLock = navigator.requestWakeLock;
    navigator.requestWakeLock = MockNavigatorWakeLock.requestWakeLock;

    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;
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

    navigator.requestWakeLock = realRequestWakeLock;
    realRequestWakeLock = null;

    navigator.mozApps = realMozApps;
    realMozApps = null;
    window.applications = realApplications;
    realApplications = null;
  });

  setup(function() {
    this.sinon.stub(Service, 'request');
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

    fakeInstallCancelDialog = document.createElement('form');
    fakeInstallCancelDialog.id = 'app-install-cancel-dialog';
    fakeInstallCancelDialog.innerHTML = [
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
          'data-l10n-id="cancel-install-button">Cancel Install</button>',
          '<button id="app-install-resume-button" type="submit" ' +
          'data-l10n-id="resume">Resume</button>',
        '</menu>',
      '</section>'
    ].join('');

    fakeDownloadCancelDialog = document.createElement('form');
    fakeDownloadCancelDialog.id = 'app-download-cancel-dialog';
    fakeDownloadCancelDialog.innerHTML = [
      '<section>',
        '<h1></h1>',
        '<p data-l10n-id="app-download-can-be-restarted">' +
        'The download can be restarted later.</p>',
        '<menu>',
          '<button id="app-download-stop-button" class="danger confirm" ',
            'data-l10n-id="app-download-stop-button">Stop Download</button>',
          '<button id="app-download-continue-button" class="cancel" ',
            'type="reset" data-l10n-id="continue">Continue</button>',
        '</menu>',
      '</section>'
    ].join('');

    fakeNotif = document.createElement('div');
    fakeNotif.id = 'install-manager-notification-container';

    fakeSetupDialog = document.createElement('form');
    fakeSetupDialog.id = 'setup-installed-app-dialog';
    fakeSetupDialog.innerHTML = [
      '<section>',
        '<h1 id="setup-app-name"></h1>',
        '<p id="setup-app-description"></p>',
        '<menu>',
          '<button id="setup-cancel-button" type="button" ' +
          'data-l10n-id="later">Later</button>',
          '<button id="setup-confirm-button" type="button" ' +
          'data-l10n-id="setup">Setup</button>',
        '</menu>',
      '</section>'
    ].join('');

    fakeImeListDialog = document.createElement('form');
    fakeImeListDialog.id = 'ime-layout-dialog';
    fakeImeListDialog.innerHTML = [
      '<section>',
        '<h1 data-l10n-id="ime-addkeyboards">Add keyboards</h1>',
        '<ul id="ime-list">',
        '</ul>',
        '<menu>',
          '<button id="ime-cancel-button" type="button" ' +
          'data-l10n-id="cancel">Cancel</button>',
          '<button id="ime-confirm-button" type="button" ' +
          'data-l10n-id="confirm">Confirm</button>',
        '</menu>',
      '</section>'
    ].join('');

    document.body.appendChild(fakeDialog);
    document.body.appendChild(fakeInstallCancelDialog);
    document.body.appendChild(fakeDownloadCancelDialog);
    document.body.appendChild(fakeNotif);
    document.body.appendChild(fakeSetupDialog);
    document.body.appendChild(fakeImeListDialog);

    window.inputWindowManager =
      this.sinon.stub(Object.create(InputWindowManager.prototype));

    AppInstallManager.init();
  });

  teardown(function() {
    fakeDialog.parentNode.removeChild(fakeDialog);
    fakeInstallCancelDialog.parentNode.removeChild(fakeInstallCancelDialog);
    fakeDownloadCancelDialog.parentNode.removeChild(fakeDownloadCancelDialog);
    fakeNotif.parentNode.removeChild(fakeNotif);
    fakeSetupDialog.parentNode.removeChild(fakeSetupDialog);
    fakeImeListDialog.parentNode.removeChild(fakeImeListDialog);
    lastDispatchedResponse = null;
    lastL10nParams = null;

    MockNavigatorWakeLock.mTeardown();
  });

  function waitForEvent(evtName, done) {
    window.addEventListener(evtName, function wait() {
      window.removeEventListener(evtName, wait);
      done();
    });
  }

  suite('init >', function() {
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
        AppInstallManager.installCancelDialog.id);
      assert.equal('app-install-confirm-cancel-button',
        AppInstallManager.confirmCancelButton.id);
      assert.equal('app-install-resume-button',
        AppInstallManager.resumeButton.id);
      assert.equal('ime-layout-dialog',
        AppInstallManager.imeLayoutDialog.id);
      assert.equal('ime-list',
        AppInstallManager.imeList.id);
      assert.equal('ime-cancel-button',
        AppInstallManager.imeCancelButton.id);
      assert.equal('ime-confirm-button',
        AppInstallManager.imeConfirmButton.id);
      assert.equal('setup-cancel-button',
        AppInstallManager.setupCancelButton.id);
      assert.equal('setup-confirm-button',
        AppInstallManager.setupConfirmButton.id);
      assert.equal('setup-installed-app-dialog',
        AppInstallManager.setupInstalledAppDialog.id);
      assert.equal('setup-app-name',
        AppInstallManager.setupAppName.id);
      assert.equal('setup-app-description',
        AppInstallManager.setupAppDescription.id);
    });

    test('should bind to the click event', function() {
      assert.equal(AppInstallManager.handleInstall.name,
                   AppInstallManager.installButton.onclick.name);
      assert.equal(AppInstallManager.showInstallCancelDialog.name,
                   AppInstallManager.cancelButton.onclick.name);
      assert.equal(AppInstallManager.handleInstallCancel.name,
                   AppInstallManager.confirmCancelButton.onclick.name);
      assert.equal(AppInstallManager.hideInstallCancelDialog.name,
                   AppInstallManager.resumeButton.onclick.name);
      assert.equal(AppInstallManager.handleSetupCancelAction.name,
                   AppInstallManager.setupCancelButton.onclick.name);
      assert.equal(AppInstallManager.handleSetupConfirmAction.name,
                   AppInstallManager.setupConfirmButton.onclick.name);
      assert.equal(AppInstallManager.hideIMEList.name,
                   AppInstallManager.imeCancelButton.onclick.name);
      assert.equal(AppInstallManager.handleImeConfirmAction.name,
                   AppInstallManager.imeConfirmButton.onclick.name);

    });
  });

  suite('events >', function() {
    suite('webapps-ask-install >', function() {
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
        assert.equal(AppInstallManager.msg.textContent,
          'install-app{"name":"Fake app"}');
      });

      test('the dialog should be hidden after press home', function() {
        assert.equal('visible', AppInstallManager.dialog.className);
        window.dispatchEvent(new CustomEvent('home'));
        assert.notEqual('visible', AppInstallManager.dialog.className);
      });

      test('the dialog should be hidden after hold home', function() {
        assert.equal('visible', AppInstallManager.dialog.className);
        window.dispatchEvent(new CustomEvent('holdhome'));
        assert.notEqual('visible', AppInstallManager.dialog.className);
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

        assert.equal(AppInstallManager.msg.textContent,
          'install-app{"name":"Fake app"}');
      });

      suite('developer infos >', function() {
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
          assert.equal('author-unknown',
            AppInstallManager.authorName.textContent);
          assert.equal('', AppInstallManager.authorUrl.textContent);
        });

        test('should handle empty developer object properly', function() {
          var evt = new MockChromeEvent({
            type: 'webapps-ask-install',
            id: 42,
            app: {
              updateManifest: {
                name: 'Fake app',
                size: 5245678,
                developer: {}
              }
            }
          });

          AppInstallManager.handleAppInstallPrompt(evt.detail);
          assert.equal('author-unknown',
            AppInstallManager.authorName.textContent);
          assert.equal('', AppInstallManager.authorUrl.textContent);
        });

        test('should tell if the developer name is unknown', function() {
          var evt = new MockChromeEvent({
            type: 'webapps-ask-install',
            id: 42,
            app: {
              updateManifest: {
                name: 'Fake app',
                size: 5245678,
                developer: {
                  url: 'http://example.com'
                }
              }
            }
          });

          AppInstallManager.handleAppInstallPrompt(evt.detail);
          assert.equal('author-unknown',
            AppInstallManager.authorName.textContent);
          assert.equal('http://example.com',
            AppInstallManager.authorUrl.textContent);
        });

        test('the developer url should default to blank', function() {
          var evt = new MockChromeEvent({
            type: 'webapps-ask-install',
            id: 42,
            app: {
              updateManifest: {
                name: 'Fake app',
                size: 5245678,
                developer: {
                  name: 'Fake dev'
                }
              }
            }
          });

          AppInstallManager.handleAppInstallPrompt(evt.detail);
          assert.equal('Fake dev', AppInstallManager.authorName.textContent);
          assert.equal('', AppInstallManager.authorUrl.textContent);
        });
      });

      suite('install size >', function() {
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
          assert.equal('size-unknown', AppInstallManager.size.textContent);
        });
      });

      suite('callbacks >', function() {
        suite('install >', function() {
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

        suite('show cancel dialog >', function() {
          setup(function() {
            AppInstallManager.showInstallCancelDialog();
          });

          test('should show cancel dialog and hide dialog', function() {
            assert.equal('visible',
              AppInstallManager.installCancelDialog.className);
            assert.equal('', AppInstallManager.dialog.className);
          });

          test('the dialog should be hidden after press home', function() {
            assert.equal('visible',
              AppInstallManager.installCancelDialog.className);
            window.dispatchEvent(new CustomEvent('home'));
            assert.notEqual('visible',
              AppInstallManager.installCancelDialog.className);
          });

          test('the dialog should be hidden after hold home', function() {
            assert.equal('visible',
              AppInstallManager.installCancelDialog.className);
            window.dispatchEvent(new CustomEvent('holdhome'));
            assert.notEqual('visible',
              AppInstallManager.installCancelDialog.className);
          });
        });

        suite('hide cancel dialog >', function() {
          setup(function() {
            AppInstallManager.hideInstallCancelDialog();
          });

          test('should hide cancel dialog and show dialog', function() {
            assert.equal('', AppInstallManager.installCancelDialog.className);
            assert.equal('visible', AppInstallManager.dialog.className);
          });
        });

        suite('confirm cancel >', function() {
          setup(function() {
            AppInstallManager.handleInstallCancel();
          });

          test('should dispatch a webapps-install-denied', function() {
            assert.equal(42, lastDispatchedResponse.id);
            assert.equal('webapps-install-denied', lastDispatchedResponse.type);
          });

          test('should hide the dialog', function() {
            assert.equal('', AppInstallManager.installCancelDialog.className);
          });

          test('should remove the callback', function() {
            assert.equal(null, AppInstallManager.installCancelCallback);
          });
        });
      });
    });

    suite('webapps-ask-uninstall >', function() {
      var evt;
      setup(function() {
        this.sinon.stub(ConfirmDialogHelper.prototype, 'show');

        evt = new MockChromeEvent({
          type: 'webapps-ask-uninstall',
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
      });

      test('should show the confirm dialog', function() {
        AppInstallManager.handleAppUninstallPrompt(evt.detail);
        sinon.assert.calledOnce(ConfirmDialogHelper.prototype.show);
      });

      test('should not show the confirm dialog for themes', function() {
        evt.detail.app.manifest.role = 'theme';
        AppInstallManager.handleAppUninstallPrompt(evt.detail);
        sinon.assert.notCalled(ConfirmDialogHelper.prototype.show);
      });
    });
  });

  suite('duringInstall >', function() {
    var mockApp, mockAppName;

    function dispatchEvent(name, app) {
      app = app || mockApp;

      var e = new CustomEvent(name, {
        detail: { application: app }
      });
      window.dispatchEvent(e);
    }

    var dispatchInstallEvent = dispatchEvent.bind(null, 'applicationinstall');

    function dispatchUninstallEvent() {
      var evtName = 'applicationuninstall';
      var partialApp = {
        manifestURL: mockApp.manifestURL,
        origin: mockApp.origin,
        manifest: {},
        application: {
          manifest: {
            icon: null
          }
        }
      };

      dispatchEvent(evtName, partialApp);
    }

    suite('Do not display a confirmation message when ftu is running >',
    function() {
      var testCases = [
        {
          'name': 'FTU is running. Should not display a confirmation',
          'value': true
        },
        {
          'name': 'FTU is not running. Should display a confirmation',
          'value': false
        }
      ];

      suiteTeardown(function() {
        MockFtuLauncher.mIsRunning = false;
      });

      setup(function() {
        mockAppName = 'FTU Fake hosted app';
        mockApp = new MockApp({
          manifest: {
            name: mockAppName,
            developer: {
              name: 'Fake dev',
              url: 'http://fakesoftware.com'
            }
          },
          updateManifest: null,
          installState: 'installed'
        });
        MockSystemBanner.mTeardown();
      });

      testCases.forEach(function(testCase) {
        test(testCase.name, function() {
          MockFtuLauncher.mIsRunning = testCase.value;
          dispatchInstallEvent();
          assert.deepEqual(MockSystemBanner.mMessage,
                       FtuLauncher.isFtuRunning() ?
                        null : {
                          id: 'app-install-success',
                          args: { appName: mockAppName}
                        });
        });
      });
    });

    suite('hosted app without cache >', function() {
      setup(function() {
        mockAppName = 'Fake hosted app';
        mockApp = new MockApp({
          manifest: {
            name: mockAppName,
            developer: {
              name: 'Fake dev',
              url: 'http://fakesoftware.com'
            }
          },
          updateManifest: null,
          installState: 'installed'
        });
        MockSystemBanner.mTeardown();
        dispatchInstallEvent();
      });

      test('should not show the icon', function() {
        assert.isFalse(Service.request.calledWith('incDownloads'));
      });

      test('should not add a notification', function() {
        assert.equal(fakeNotif.childElementCount, 0);
      });

      test('should display a confirmation', function() {
        assert.deepEqual(MockSystemBanner.mMessage, {
          id: 'app-install-success',
          args: { appName: mockAppName }
        });
      });

    });

    function beforeFirstProgressSuite() {
      suite('before first progress >', function() {
        test('should not show the icon', function() {
          var method = 'incDownloads';
          assert.isFalse(Service.request.calledWith(method));
        });

        test('should not add a notification', function() {
          assert.equal(fakeNotif.childElementCount, 0);
        });

        suite('on downloadsuccess >', function() {
          setup(function() {
            // reseting these mocks as we want to test only one call
            MockNotificationScreen.mTeardown();
            Service.request.restore();
            this.sinon.stub(Service, 'request');
            mockApp.mTriggerDownloadSuccess();
          });

          test('should not remove a notification', function() {
            var method = 'removeUnreadNotification';
            assert.isUndefined(MockNotificationScreen.wasMethodCalled[method]);
          });

          test('should not remove the download icon', function() {
            var method = 'decDownloads';
            assert.isFalse(Service.request.calledWith(method));
          });

          test('should display a confirmation', function() {
            assert.deepEqual(MockSystemBanner.mMessage, {
              id: 'app-install-success',
              args: { appName: mockAppName }
            });
          });

        });

        suite('on downloaderror >', function() {
          setup(function() {
            // reseting these mocks as we want to test only one call
            MockNotificationScreen.mTeardown();
            Service.request.restore();
            this.sinon.stub(Service, 'request');
            mockApp.mTriggerDownloadError();
          });

          test('should not remove a notification', function() {
            var method = 'removeUnreadNotification';
            assert.isUndefined(MockNotificationScreen.wasMethodCalled[method]);
          });

          test('should not remove the download icon', function() {
            var method = 'decDownloads';
            assert.isFalse(Service.request.calledWith(method));
          });
        });
      });
    }

    function downloadErrorSuite(downloadEventsSuite) {
      suite('on downloadError >', function() {
        setup(function() {
          // reseting these mocks as we only want to test the
          // following call

          Service.request.restore();
          this.sinon.stub(Service, 'request');
          MockSystemBanner.mTeardown();
          MockModalDialog.mTeardown();
        });

        function downloadErrorTests(errorName) {
          test('should display an error', function() {
            assert.deepEqual(MockSystemBanner.mMessage, {
              id: knownErrors[errorName],
              args: { appName: mockAppName }
            });
          });

          test('should not display the error dialog', function() {
            assert.isFalse(MockModalDialog.alert.mWasCalled);
          });

        }

        function specificDownloadErrorSuite(errorName) {
          suite(errorName + ' >', function() {
            setup(function() {
              mockApp.mTriggerDownloadError(errorName);
            });

            downloadErrorTests(errorName);
          });
        }

        var knownErrors = {
          'FALLBACK_ERROR': 'app-install-generic-error',
          'NETWORK_ERROR': 'app-install-download-failed',
          'DOWNLOAD_ERROR': 'app-install-download-failed',
          'MISSING_MANIFEST': 'app-install-install-failed',
          'INVALID_MANIFEST': 'app-install-install-failed',
          'INSTALL_FROM_DENIED': 'app-install-install-failed',
          'INVALID_SECURITY_LEVEL': 'app-install-install-failed',
          'INVALID_PACKAGE': 'app-install-install-failed',
          'APP_CACHE_DOWNLOAD_ERROR': 'app-install-download-failed'
        };

        Object.keys(knownErrors).forEach(specificDownloadErrorSuite);

        suite('GENERIC_ERROR >', function() {
          setup(function() {
            mockApp.mTriggerDownloadError('GENERIC_ERROR');
          });

          test('should remove the notif', function() {
            assert.equal(fakeNotif.childElementCount, 0);
          });

          test('should remove the icon', function() {
            var method = 'decDownloads';
            assert.isTrue(Service.request.calledWith(method));
          });

          beforeFirstProgressSuite();
          downloadEventsSuite(/*afterError*/ true);
        });

      });
    }

    suite('hosted app with cache >', function() {
      setup(function() {
        mockAppName = 'Fake hosted app with cache';
        mockApp = new MockApp({
          manifest: {
            name: mockAppName,
            developer: {
              name: 'Fake dev',
              url: 'http://fakesoftware.com'
            }
          },
          updateManifest: null,
          installState: 'pending'
        });
        MockSystemBanner.mTeardown();
        dispatchInstallEvent();
      });

      function downloadEventsSuite(afterError) {
        var suiteName = 'on first progress';
        if (afterError) {
          suiteName += ' after error';
        }
        suiteName += ' >';

        suite(suiteName, function() {
          setup(function() {
            // reseting these mocks as we want to test only the following
            // calls
            MockNotificationScreen.mTeardown();
            Service.request.restore();
            this.sinon.stub(Service, 'request');
            mockApp.mTriggerDownloadProgress(NaN);
          });

          test('should add a notification', function() {
            var method = 'addUnreadNotification';
            assert.equal(fakeNotif.childElementCount, 1);
            assert.ok(MockNotificationScreen.wasMethodCalled[method]);
          });

          test('notification should have a message', function() {
            var l10nAttrs =
              navigator.mozL10n.getAttributes(
                fakeNotif.querySelector('.title-container'));
            assert.equal(l10nAttrs.id, 'downloadingAppMessage');
            assert.deepEqual(
              l10nAttrs.args, { appName: 'Fake hosted app with cache' });

            assert.equal(
              fakeNotif.querySelector('progress').getAttribute('data-l10n-id'),
              'downloadingAppProgressIndeterminate');
          });

          test('notification progress should be indeterminate', function() {
            assert.equal(fakeNotif.querySelector('progress').position, -1);
          });

          test('should request wifi wake lock', function() {
            assert.equal('wifi', MockNavigatorWakeLock.mLastWakeLock.topic);
            assert.isFalse(MockNavigatorWakeLock.mLastWakeLock.released);
          });

          suite('on downloadsuccess >', function() {
            setup(function() {
              mockApp.mTriggerDownloadSuccess();
            });

            test('should remove the notif', function() {
              var method = 'removeUnreadNotification';
              assert.equal(fakeNotif.childElementCount, 0);
              assert.ok(MockNotificationScreen.wasMethodCalled[method]);
            });

            test('should release the wifi wake lock', function() {
              assert.equal('wifi', MockNavigatorWakeLock.mLastWakeLock.topic);
              assert.isTrue(MockNavigatorWakeLock.mLastWakeLock.released);
            });

            test('should display a confirmation', function() {
              assert.deepEqual(MockSystemBanner.mMessage, {
                id: 'app-install-success',
                args: { appName: mockAppName }
              });
            });
          });

          test('on downloadsuccess > should remove only its progress handler',
          function() {

            var onprogressCalled = false;
            mockApp.onprogress = function() {
              onprogressCalled = true;
            };
            mockApp.mTriggerDownloadSuccess();
            mockApp.mTriggerDownloadProgress(10);
            assert.isTrue(onprogressCalled);
          });

          suite('on indeterminate progress >', function() {
            setup(function() {
              mockApp.mTriggerDownloadProgress(NaN);
            });

            test('should keep the progress indeterminate', function() {
              var progressNode = fakeNotif.querySelector('progress');
              assert.equal(progressNode.position, -1);
              assert.equal(progressNode.getAttribute('data-l10n-id'),
                'downloadingAppProgressIndeterminate');
            });
          });

          suite('on quantified progress >', function() {
            setup(function() {
              mockApp.mTriggerDownloadProgress(10);
            });

            test('should have a quantified progress', function() {
              var progressNode = fakeNotif.querySelector('progress');
              assert.equal(progressNode.position, -1);

              var l10nAttrs = navigator.mozL10n.getAttributes(progressNode);

              assert.equal(l10nAttrs.id, 'downloadingAppProgressNoMax');
              assert.deepEqual(l10nAttrs.args, { progress: '10.00 bytes' });
            });
          });

          suite('on uninstall >', function() {
            setup(function() {
              dispatchUninstallEvent();
            });

            test('should remove the notif', function() {
              var method = 'removeUnreadNotification';
              assert.equal(fakeNotif.childElementCount, 0);
              assert.ok(MockNotificationScreen.wasMethodCalled[method]);
            });

            test('should release the wifi wake lock', function() {
              assert.equal('wifi', MockNavigatorWakeLock.mLastWakeLock.topic);
              assert.isTrue(MockNavigatorWakeLock.mLastWakeLock.released);
            });
          });

          if (!afterError) {
            downloadErrorSuite(downloadEventsSuite);
          }
        });
      }

      beforeFirstProgressSuite();
      downloadEventsSuite(/*afterError*/ false);
    });

    suite('reinstalled packaged app >', function() {
      setup(function() {
        mockAppName = 'Fake packaged app';
        mockApp = new MockApp({
          manifest: {
            name: mockAppName,
            developer: {
              name: 'Fake dev',
              url: 'http://fakesoftware.com'
            }
          },
          updateManifest: {
            name: mockAppName,
            size: 5245678,
            developer: {
              name: 'Fake dev',
              url: 'http://fakesoftware.com'
            }
          },
          installState: 'pending'
        });

        dispatchInstallEvent();
      });

      suite('on first progress >', function() {
        var newprogress = 5;

        setup(function() {
          // resetting this mock because we want to test only the
          // following call
          MockNotificationScreen.mTeardown();
          mockApp.mTriggerDownloadProgress(newprogress);
        });

        test('should add a notification', function() {
          var method = 'addUnreadNotification';
          assert.equal(fakeNotif.childElementCount, 1);
          assert.ok(MockNotificationScreen.wasMethodCalled[method]);
        });

        test('notification should have a message', function() {
          var l10nAttrs = navigator.mozL10n.getAttributes(
            fakeNotif.querySelector('.title-container'));

          assert.equal(l10nAttrs.id, 'downloadingAppMessage');
          assert.deepEqual(l10nAttrs.args, { appName: mockAppName });
        });

        test('notification progress should have a max and a value',
        function() {
          assert.equal(fakeNotif.querySelector('progress').max,
            mockApp.updateManifest.size);
          assert.equal(fakeNotif.querySelector('progress').value,
            newprogress);
        });

        test('notification progress should not be indeterminate',
        function() {
          assert.notEqual(fakeNotif.querySelector('progress').position, -1);
        });
      });
    });

    suite('packaged app >', function() {
      setup(function() {
        mockAppName = 'Fake packaged app';
        mockApp = new MockApp({
          manifest: null,
          updateManifest: {
            name: mockAppName,
            size: 5245678,
            developer: {
              name: 'Fake dev',
              url: 'http://fakesoftware.com'
            }
          },
          installState: 'pending'
        });

        dispatchInstallEvent();
      });


      function downloadEventsSuite(afterError) {
        var suiteName = 'on first progress';
        if (afterError) {
          suiteName += ' after error';
        }
        suiteName += ' >';

        suite(suiteName, function() {
          var newprogress = 5;

          setup(function() {
            // resetting this mock because we want to test only the
            // following call
            MockNotificationScreen.mTeardown();
            MockSystemBanner.mTeardown();
            mockApp.mTriggerDownloadProgress(newprogress);
          });

          test('should add a notification', function() {
            var method = 'addUnreadNotification';
            assert.equal(fakeNotif.childElementCount, 1);
            assert.ok(MockNotificationScreen.wasMethodCalled[method]);
          });

          test('notification should have a message', function() {
            var l10nAttrs = navigator.mozL10n.getAttributes(
              fakeNotif.querySelector('.title-container'));

            assert.equal(l10nAttrs.id, 'downloadingAppMessage');
            assert.deepEqual(l10nAttrs.args, { appName: mockAppName });
          });

          test('notification progress should have a max and a value',
          function() {
            assert.equal(fakeNotif.querySelector('progress').max,
              mockApp.updateManifest.size);
            assert.equal(fakeNotif.querySelector('progress').value,
              newprogress);
          });

          test('notification progress should not be indeterminate',
          function() {
            assert.notEqual(fakeNotif.querySelector('progress').position, -1);
          });

          test('should request wifi wake lock', function() {
            assert.equal('wifi', MockNavigatorWakeLock.mLastWakeLock.topic);
            assert.isFalse(MockNavigatorWakeLock.mLastWakeLock.released);
          });

          suite('on downloadsuccess >', function() {
            setup(function() {
              mockApp.mTriggerDownloadSuccess();
            });

            test('should remove the notif', function() {
              var method = 'removeUnreadNotification';
              assert.equal(fakeNotif.childElementCount, 0);
              assert.ok(MockNotificationScreen.wasMethodCalled[method]);
            });

            test('should release the wifi wake lock', function() {
              assert.equal('wifi', MockNavigatorWakeLock.mLastWakeLock.topic);
              assert.isTrue(MockNavigatorWakeLock.mLastWakeLock.released);
            });

            test('should display a confirmation', function() {
              assert.deepEqual(MockSystemBanner.mMessage, {
                id: 'app-install-success',
                args: { appName: mockAppName }
              });
            });
          });

          test('on downloadsuccess > ' +
               'should not break if wifi unlock throws an exception',
          function() {
            MockNavigatorWakeLock.mThrowAtNextUnlock();
            mockApp.mTriggerDownloadSuccess();
            assert.ok(true);
          });

          test('on indeterminate progress > ' +
              'should update the progress text content',
          function() {
              mockApp.mTriggerDownloadProgress(NaN);

              var progressNode = fakeNotif.querySelector('progress');
              assert.equal(progressNode.getAttribute('data-l10n-id'),
                'downloadingAppProgressIndeterminate');
            });

          suite('on progress >', function() {
            var size, ratio;
            var newprogress = 10;

            setup(function() {
              size = mockApp.updateManifest.size;
              ratio = newprogress / size;
              mockApp.mTriggerDownloadProgress(newprogress);
            });

            test('should update the progress notification', function() {
              var progressNode = fakeNotif.querySelector('progress');
              assert.equal(progressNode.position, ratio);

              var l10nAttrs = navigator.mozL10n.getAttributes(progressNode);

              assert.equal(l10nAttrs.id, 'downloadingAppProgress');
              assert.deepEqual(l10nAttrs.args, {
                progress: '10.00 bytes',
                max: '5.00 MB'
              });
            });
          });

          suite('on uninstall >', function() {
            setup(function() {
              dispatchUninstallEvent();
            });

            test('should remove the notif', function() {
              var method = 'removeUnreadNotification';
              assert.equal(fakeNotif.childElementCount, 0);
              assert.ok(MockNotificationScreen.wasMethodCalled[method]);
            });

            test('should release the wifi wake lock', function() {
              assert.equal('wifi', MockNavigatorWakeLock.mLastWakeLock.topic);
              assert.isTrue(MockNavigatorWakeLock.mLastWakeLock.released);
            });
          });

          if (!afterError) {
            downloadErrorSuite(downloadEventsSuite);
          }
        });
      }

      beforeFirstProgressSuite();
      downloadEventsSuite(/*afterError*/ false);

      suite('on INSUFFICIENT_STORAGE downloaderror >', function() {
        test('should display an alert', function() {
          mockApp.mTriggerDownloadError('INSUFFICIENT_STORAGE');
          assert.isNull(MockSystemBanner.mMessage);
          assert.isTrue(MockModalDialog.alert.mWasCalled);
          var args = MockModalDialog.alert.mArgs;
          assert.equal(args[0], 'not-enough-space');
          assert.equal(args[1], 'not-enough-space-message');
          assert.deepEqual(args[2], { title: 'ok' });
        });

        beforeFirstProgressSuite();
        downloadEventsSuite(/*afterError*/ true);
      });


    });

    suite('packaged app without size >', function() {
      setup(function() {
        mockAppName = 'Fake packaged app';
        mockApp = new MockApp({
          manifest: null,
          updateManifest: {
            name: mockAppName,
            developer: {
              name: 'Fake dev',
              url: 'http://fakesoftware.com'
            }
          },
          installState: 'pending'
        });

        dispatchInstallEvent();
      });

      suite('on first progress >', function() {
        setup(function() {
          // resetting this mock because we want to test only the
          // following call
          MockNotificationScreen.mTeardown();
          MockSystemBanner.mTeardown();
          mockApp.mTriggerDownloadProgress(5);
        });

        test('should add a notification', function() {
          var method = 'addUnreadNotification';
          assert.equal(fakeNotif.childElementCount, 1);
          assert.ok(MockNotificationScreen.wasMethodCalled[method]);
        });
      });
    });

    suite('langpack >', function() {
      setup(function() {
        mockAppName = 'Fake langpack';
        mockApp = new MockApp({
          manifest: {
            name: mockAppName,
            role: 'langpack'
          },
          updateManifest: null,
          installState: 'installed'
        });
        MockSystemBanner.mTeardown();
        dispatchInstallEvent();
      });

      test('should display the special text for langpacks', function() {
        assert.deepEqual(MockSystemBanner.mMessage, {
          id: 'langpack-install-success2',
          args: { appName: mockAppName }
        });
      });
    });

    suite('cancelling a download >', function() {
      setup(function() {
        mockApp = new MockApp({ installState: 'pending' });
        MockApplications.mRegisterMockApp(mockApp);
        dispatchInstallEvent();
        mockApp.mTriggerDownloadProgress(10);
      });

      test('tapping the notification should display the dialog',
      function(done) {
        waitForEvent('installpromptshown', done);

        fakeNotif.querySelector('.fake-notification').click();
        assert.isTrue(fakeDownloadCancelDialog.classList.contains('visible'));
      });

      test('tapping the container should not display the dialog', function() {
        fakeNotif.click();
        assert.isFalse(fakeDownloadCancelDialog.classList.contains('visible'));
      });

      test('should set the title with the app name', function() {
        fakeNotif.querySelector('.fake-notification').click();
        var title = fakeDownloadCancelDialog.querySelector('h1');

        var l10nAttrs = navigator.mozL10n.getAttributes(title);

        assert.equal(l10nAttrs.id, 'stopDownloading');
        assert.deepEqual(l10nAttrs.args, { app: 'Mock app' });
      });

      test('should add the manifest url in data set', function() {
        fakeNotif.querySelector('.fake-notification').click();
        assert.equal(fakeDownloadCancelDialog.dataset.manifest,
          mockApp.manifestURL);
      });

      test('should hide the notification tray', function() {
        fakeNotif.querySelector('.fake-notification').click();
        assert.isFalse(MockUtilityTray.mShown);
      });

      test('cancelling should hide the dialog only', function(done) {
        waitForEvent('installprompthidden', done);

        fakeNotif.querySelector('.fake-notification').click();
        fakeDownloadCancelDialog.querySelector('.cancel').click();
        assert.isFalse(fakeDownloadCancelDialog.classList.contains('visible'));
        assert.isFalse(mockApp.mCancelCalled);
      });

      test('accepting should hide the dialog and call cancelDownload on app',
      function(done) {
        waitForEvent('installprompthidden', done);

        fakeNotif.querySelector('.fake-notification').click();
        fakeDownloadCancelDialog.querySelector('.confirm').click();
        assert.isFalse(fakeDownloadCancelDialog.classList.contains('visible'));
        assert.ok(mockApp.mCancelCalled);
      });

      test('accepting should hide the dialog but not call cancelDownload ' +
           'if app is uninstalled',
      function() {
        fakeNotif.querySelector('.fake-notification').click();
        MockApplications.mUnregisterMockApp(mockApp);
        fakeDownloadCancelDialog.querySelector('.confirm').click();
        assert.isFalse(fakeDownloadCancelDialog.classList.contains('visible'));
        assert.isFalse(mockApp.mCancelCalled);
      });
    });

  });

  suite('restarting after reboot >', function() {
    var mockApp, installedMockApp;

    setup(function() {
      mockApp = new MockApp({
        updateManifest: null,
        installState: 'pending'
      });

      installedMockApp = new MockApp({
        updateManifest: null,
        installState: 'installed'
      });

      var e = new CustomEvent('applicationready', {
        detail: { applications: {} }
      });
      e.detail.applications[mockApp.manifestURL] = mockApp;
      e.detail.applications[installedMockApp.manifestURL] = installedMockApp;
      window.dispatchEvent(e);

    });

    test('should add a notification for the pending app', function() {
      mockApp.mTriggerDownloadProgress(50);

      var method = 'addUnreadNotification';
      assert.equal(fakeNotif.childElementCount, 1);
      assert.ok(MockNotificationScreen.wasMethodCalled[method]);
    });

    test('should not add a notification for the installed app', function() {
      installedMockApp.mTriggerDownloadProgress(50);

      var method = 'addUnreadNotification';
      assert.equal(fakeNotif.childElementCount, 0);
      assert.isUndefined(MockNotificationScreen.wasMethodCalled[method]);
    });
  });

  suite('humanizeSize >', function() {
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

  suite('3rd-party IME app flow >', function() {
    var mockApp, mockAppTwo, mockAppName, mockAppTwoName;
    setup(function() {
      AppInstallManager.init();
      inputWindowManager.isOutOfProcessEnabled = true;

      navigator.mozL10n = MockL10n;
      mockAppName = 'Fake keyboard app';
      mockApp = new MockApp({
        manifest: {
          name: mockAppName,
          role: 'input',
          developer: {
            name: 'Fake dev',
            url: 'http://fakesoftware.com'
          },
          inputs: {
            'english': {
              launch_path: '/index.html#en',
              name: 'english',
              description: 'English layout',
              types: ['text', 'url', 'number']
            },
            'number': {
              launch_path: '/index.html#nm',
              name: 'number',
              description: 'number layout',
              types: ['number']
            },
            'spanish': {
              launch_path: '/index.html#spanish',
              name: 'spanish',
              description: 'spanish layout',
              types: ['text', 'url', 'number']
            }
          }
        }
      });

      mockAppTwoName = 'Fake keyboard app Two';
      mockAppTwo = new MockApp({
        manifest: {
          name: mockAppTwoName,
          type: 'privileged',
          role: 'input',
          developer: {
            name: 'Fake dev',
            url: 'http://fakesoftware.com'
          },
          inputs: {
            'english': {
              launch_path: '/index.html#en',
              name: 'english',
              description: 'English layout',
              types: ['text', 'url', 'number']
            },
            'number': {
              launch_path: '/index.html#nm',
              name: 'number',
              description: 'number layout',
              types: ['number']
            }
          },
          permissions: {
            input: {}
          }
        },
        manifestURL: 'app://app2.manifestURL'
      });
    });

    test('should be uninstalled if disabled', function() {
      // Disabling keyboard app installation.
      // Set stubbed inputWindowManager.isOutOfProcessEnabled to false
      inputWindowManager.isOutOfProcessEnabled = false;

      this.sinon.spy(navigator.mozApps.mgmt, 'uninstall');
      AppInstallManager.handleInstallSuccess(mockApp);

      assert.isTrue(navigator.mozApps.mgmt.uninstall.calledOnce);
    });

    test('should show setup dialog', function(done) {
      waitForEvent('installpromptshown', done);

      AppInstallManager.handleInstallSuccess(mockApp);
      assert.isTrue(AppInstallManager.
                      setupInstalledAppDialog.classList.contains('visible'));
    });

    test('should empty setup dialog', function() {
      AppInstallManager.handleInstallSuccess(mockApp);
      AppInstallManager.setupCancelButton.click();
      assert.isFalse(AppInstallManager.
                      setupInstalledAppDialog.classList.contains('visible'));
      assert.equal(AppInstallManager.setupAppName.textContent, '');
      assert.equal(AppInstallManager.setupAppDescription.textContent, '');
    });

    test('should not show setup dialog and wait in setupQueue', function(done) {
      waitForEvent('installpromptshown', done);

      this.sinon.spy(AppInstallManager, 'showSetupDialog');
      AppInstallManager.handleInstallSuccess(mockApp);
      assert.isTrue(AppInstallManager.
                      setupInstalledAppDialog.classList.contains('visible'));
      AppInstallManager.handleInstallSuccess(mockAppTwo);
      assert.isTrue(AppInstallManager.showSetupDialog.calledOnce);

      var l10nAttrs = MockL10n.getAttributes(
        AppInstallManager.setupAppName);
      assert.equal(l10nAttrs.id, 'app-install-success');
      assert.deepEqual(l10nAttrs.args, {appName: mockAppName});
    });

    test('should show setupInstalledAppDialog two times', function() {
      this.sinon.spy(AppInstallManager, 'showSetupDialog');
      AppInstallManager.handleInstallSuccess(mockApp);
      var l10nAttrs = MockL10n.getAttributes(
        AppInstallManager.setupAppName);
      assert.equal(l10nAttrs.id, 'app-install-success');
      assert.deepEqual(l10nAttrs.args, {appName: mockAppName});
      AppInstallManager.setupCancelButton.click();
      AppInstallManager.handleInstallSuccess(mockAppTwo);
      var l10nAttrs = MockL10n.getAttributes(
        AppInstallManager.setupAppName);
      assert.equal(l10nAttrs.id, 'app-install-success');
      assert.deepEqual(l10nAttrs.args, {appName: mockAppTwoName});
    });

    test('should show ime list', function(done) {
      waitForEvent('installpromptshown', done);

      AppInstallManager.handleInstallSuccess(mockAppTwo);
      AppInstallManager.setupConfirmButton.click();
      assert.isTrue(AppInstallManager.
                      imeLayoutDialog.classList.contains('visible'));
    });

    test('should not show list', function() {
      // keyboard app without inputs
      var badKeyboardApp = new MockApp({
        manifest: {
          name: mockAppName,
          role: 'input',
          developer: {
            name: 'Fake dev',
            url: 'http://fakesoftware.com'
          }
        }
      });
      AppInstallManager.handleInstallSuccess(badKeyboardApp);
      AppInstallManager.setupConfirmButton.click();
      assert.equal(0, AppInstallManager.setupQueue.length);
      assert.isFalse(AppInstallManager.
                      imeLayoutDialog.classList.contains('visible'));
    });

    test('should not show list if no permission', function() {
      // keyboard app without permissions
      var badKeyboardApp = new MockApp({
        manifest: {
          name: mockAppName,
          role: 'input',
          type: 'privileged',
          developer: {
            name: 'Fake dev',
            url: 'http://fakesoftware.com'
          },
          inputs: {
            'english': {
              launch_path: '/index.html#en',
              name: 'english',
              description: 'English layout',
              types: ['text', 'url', 'number']
            }
          },
          permissions: {
          }
        }
      });
      AppInstallManager.handleInstallSuccess(badKeyboardApp);
      AppInstallManager.setupConfirmButton.click();
      assert.equal(0, AppInstallManager.setupQueue.length);
      assert.isFalse(AppInstallManager.
                      imeLayoutDialog.classList.contains('visible'));
    });

    test('should not show list if not privileged app', function() {
      // keyboard app without permissions
      var badKeyboardApp = new MockApp({
        manifest: {
          name: mockAppName,
          role: 'input',
          developer: {
            name: 'Fake dev',
            url: 'http://fakesoftware.com'
          },
          inputs: {
            'english': {
              launch_path: '/index.html#en',
              name: 'english',
              description: 'English layout',
              types: ['text', 'url', 'number']
            }
          },
          permissions: {
            input: {}
          }
        }
      });
      AppInstallManager.handleInstallSuccess(badKeyboardApp);
      AppInstallManager.setupConfirmButton.click();
      assert.equal(0, AppInstallManager.setupQueue.length);
      assert.isFalse(AppInstallManager.
                      imeLayoutDialog.classList.contains('visible'));
    });

    test('Should enable the layout', function() {
      this.sinon.spy(AppInstallManager, 'handleImeConfirmAction');
      this.sinon.spy(KeyboardHelper, 'setLayoutEnabled');
      this.sinon.spy(KeyboardHelper, 'saveToSettings');

      AppInstallManager.handleInstallSuccess(mockAppTwo);
      AppInstallManager.setupConfirmButton.click();
      assert.equal(1, AppInstallManager.setupQueue.length);

      // check the first layout
      var checkbox = AppInstallManager.imeList.querySelector('input');
      checkbox.checked = true;

      AppInstallManager.handleImeConfirmAction();
      sinon.assert.calledWith(KeyboardHelper.setLayoutEnabled,
                              mockAppTwo.manifestURL, 'english', true);

      sinon.assert.calledOnce(KeyboardHelper.saveToSettings);
    });

    test('IME setup dialog should be hidden after press home',
    function(done) {
      waitForEvent('installprompthidden', done);

      AppInstallManager.handleInstallSuccess(mockApp);
      assert.isTrue(AppInstallManager.
                      setupInstalledAppDialog.classList.contains('visible'));

      window.dispatchEvent(new CustomEvent('home'));
      assert.isFalse(AppInstallManager.
                      setupInstalledAppDialog.classList.contains('visible'));
    });

    test('IME setup dialog should be hidden after hold home',
    function(done) {
      waitForEvent('installprompthidden', done);

      AppInstallManager.handleInstallSuccess(mockApp);
      assert.isTrue(AppInstallManager.
                      setupInstalledAppDialog.classList.contains('visible'));

      window.dispatchEvent(new CustomEvent('holdhome'));
      assert.isFalse(AppInstallManager.
                      setupInstalledAppDialog.classList.contains('visible'));
    });

    test('IME list should be hidden after press home', function(done) {
      waitForEvent('installprompthidden', done);

      AppInstallManager.handleInstallSuccess(mockAppTwo);
      AppInstallManager.setupConfirmButton.click();
      assert.isTrue(AppInstallManager.
                      imeLayoutDialog.classList.contains('visible'));

      window.dispatchEvent(new CustomEvent('home'));
      assert.isFalse(AppInstallManager.
                      imeLayoutDialog.classList.contains('visible'));
    });

    test('IME list should be hidden after hold home', function(done) {
      waitForEvent('installprompthidden', done);

      AppInstallManager.handleInstallSuccess(mockAppTwo);
      AppInstallManager.setupConfirmButton.click();
      assert.isTrue(AppInstallManager.
                      imeLayoutDialog.classList.contains('visible'));

      window.dispatchEvent(new CustomEvent('holdhome'));
      assert.isFalse(AppInstallManager.
                      imeLayoutDialog.classList.contains('visible'));
    });
  });
});
