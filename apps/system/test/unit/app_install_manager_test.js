requireApp('system/test/unit/mock_app.js');
requireApp('system/test/unit/mock_chrome_event.js');
requireApp('system/test/unit/mock_statusbar.js');
requireApp('system/js/app_install_manager.js');

// prevent Mocha to choke on "leaks" that are not leaks
if (!window.StatusBar) {
  window.StatusBar = null;
}

suite('system/AppInstallManager', function() {
  var realL10n;
  var realDispatchResponse;
  var realStatusBar;

  var fakeDialog;

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

    document.body.appendChild(fakeDialog);
    AppInstallManager.init();
  });

  teardown(function() {
    fakeDialog.parentNode.removeChild(fakeDialog);
    lastDispatchedResponse = null;
    lastL10nParams = null;
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
    });

    test('should bind to the click event', function() {
      assert.equal(AppInstallManager.handleInstall.name,
                   AppInstallManager.installButton.onclick.name);
      assert.equal(AppInstallManager.handleCancel.name,
                   AppInstallManager.cancelButton.onclick.name);
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

        suite('cancel', function() {
          setup(function() {
            AppInstallManager.handleCancel();
          });

          test('should dispatch a webapps-install-denied', function() {
            assert.equal(42, lastDispatchedResponse.id);
            assert.equal('webapps-install-denied', lastDispatchedResponse.type);
          });

          test('should hide the dialog', function() {
            assert.equal('', AppInstallManager.dialog.className);
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
      e = new CustomEvent('applicationinstall', { detail: {} });
    });


    function dispatchEvent() {
        e.detail.application = mockApp;
        window.dispatchEvent(e);
    }

    suite('hosted app without cache', function() {
      setup(function() {
        mockApp = new MockApp({
          manifest: {
            name: 'Fake app',
            size: 5245678,
            developer: {
              name: 'Fake dev',
              url: 'http://fakesoftware.com'
            },
            updateManifest: null
          },
          installState: 'installed'
        });

        dispatchEvent();
      });

      test('should not show the icon', function() {
        assert.isUndefined(MockStatusBar.wasMethodCalled['incSystemDownloads']);
      });

      test('should do nothing if we get downloadsuccess', function() {
        mockApp.mTriggerDownloadSuccess();
        assert.isUndefined(MockStatusBar.wasMethodCalled['decSystemDownloads']);
      });

      test('should do nothing if we get downloaderror', function() {
        mockApp.mTriggerDownloadError();
        assert.isUndefined(MockStatusBar.wasMethodCalled['decSystemDownloads']);
      });
    });

    suite('hosted app with cache', function() {
      setup(function() {
        mockApp = new MockApp({
          manifest: {
            name: 'Fake app',
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

      test('should remove the icon if we get downloaderror', function() {
        mockApp.mTriggerDownloadError();
        assert.ok(MockStatusBar.wasMethodCalled['decSystemDownloads']);
      });
    });

    suite('packaged app', function() {
      setup(function() {
        mockApp = new MockApp({
          manifest: null,
          updateManifest: {
            name: 'Fake app',
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

      test('should remove the icon if we get downloaderror', function() {
        mockApp.mTriggerDownloadError();
        assert.ok(MockStatusBar.wasMethodCalled['decSystemDownloads']);
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
  });
});
