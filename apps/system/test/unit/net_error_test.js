'use strict';

/* global MockNavigatormozApps, mockMozActivityInstance */

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_activity.js');
window.requireElements('system/elements/net_error_action_menu.html');
window.requireElements('system/elements/net_error_confirm_dialog.html');

var mocksForNetError = new window.MocksHelper([
  'LazyLoader',
  'MozActivity'
]).init();

suite('Net errors', function() {

  var realDocumentURI, realL10n, isOnline, isDocumentHidden, realMozApps,
      historyLenght;

  mocksForNetError.attachTestHelpers();

  window.suiteTemplate('net-error-confirm-dialog', {
    id: 'net-error-confirm-dialog'
  });

  window.suiteTemplate('net-error-action-menu', {
    id: 'net-error-action-menu'
  });

  suiteSetup(function(done) {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: function() {
        return isDocumentHidden;
      }
    });

    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: function() {
        return isOnline;
      }
    });

    Object.defineProperty(window, 'history', {
      configurable: true,
      get: function() {
        return {
          length: historyLenght
        };
      }
    });

    realDocumentURI = document.documentURI;
    Object.defineProperty(document, 'documentURI', {
      writable: true
    });

    realL10n = navigator.mozL10n;
    var stubReady = sinon.stub(window.MockL10n, 'ready');
    navigator.mozL10n = window.MockL10n;
    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    loadBodyHTML('/net_error.html');

    requireApp('system/js/net_error.js', function() {
      stubReady.restore();
      done();
    });
  });

  suiteTeardown(function() {
    delete document.hidden;
    delete navigator.onLine;
    delete window.history;
    document.documentURI = realDocumentURI;
    navigator.mozL10n = realL10n;
    navigator.mozApps = realMozApps;
    document.body.innerHTML = '';
  });

  function ensureNetOffline(type, length) {
    var suiteTitle = 'NetOffline - Type frame: ' + type;
    if (type === 'app') {
      suiteTitle = suiteTitle + (length === 1 ? ' (launched)' : ' (in-app)');
    }
    suite(suiteTitle, function() {
      var reloadStub, getSelfStub, appName = 'Hello';

      suiteSetup(function() {
        document.documentURI = 'about:neterror?e=netOffline&f=' + type;
        reloadStub = sinon.stub(window.NetError, 'reload');
        getSelfStub = sinon.stub(navigator.mozApps, 'getSelf', function() {
          return {
            result: {
              manifest: {
                name: appName
              }
            },
            set onsuccess(cb) {
              cb();
            },
            get onsuccess() {
              return;
            }
          };
        });
      });

      suiteTeardown(function() {
        reloadStub.restore();
        getSelfStub.restore();
      });

      setup(function() {
        historyLenght = length;
        window.NetError.init();
      });

      test('Styles were initialized correctly ', function() {
        assert.isTrue(document.body.classList.contains('netOffline'));
      });

      test('Messages were initialized correctly ', function() {
        if (type === 'regular') {
          assert.equal(document.getElementById('error-title').textContent,
                      'unable-to-connect');
          assert.isTrue(document.getElementById('error-message').textContent.
                        startsWith('tap-to-check-settings'));
        } else {
          if (length > 1) {
            assert.equal(document.getElementById('error-title').textContent,
                        'network-error-in-app');
          } else {
            assert.equal(document.getElementById('error-title').textContent,
                        'network-error-launching{"name":"' + appName + '"}');
          }
        }
      });

      test('Settings activity was called ', function() {
        var element = type === 'app' ? document.getElementById('settings-btn') :
                                       document.body;
        element.click();
        assert.equal(mockMozActivityInstance.name, 'configure');
        assert.equal(mockMozActivityInstance.data.target, 'device');
        assert.equal(mockMozActivityInstance.data.section, 'root');
        assert.equal(mockMozActivityInstance.data.filterBy, 'connectivity');
      });

      test('Resumed connection while app is in background ', function() {
        isDocumentHidden = true;
        isOnline = true;
        window.dispatchEvent(new CustomEvent('online'));
        assert.isFalse(window.NetError.reload.called);
      });

      test('Resumed connection and app is in foreground ', function() {
        document.body.classList.remove('hidden');
        isDocumentHidden = false;
        isOnline = true;
        window.dispatchEvent(new CustomEvent('online'));
        assert.isTrue(window.NetError.reload.called);
      });

      test('No connection and app goes to foreground ', function() {
        isDocumentHidden = false;
        isOnline = false;
        document.dispatchEvent(new CustomEvent('visibilitychange'));
        assert.isTrue(window.NetError.reload.called);
      });

      test('Connection and app goes to foreground ', function() {
        document.body.classList.remove('hidden');
        isDocumentHidden = false;
        isOnline = true;
        document.dispatchEvent(new CustomEvent('visibilitychange'));
        assert.isTrue(window.NetError.reload.calledTwice);
      });
    });
  }

  ensureNetOffline('regular');
  ensureNetOffline('app', 1);
  ensureNetOffline('app', 2);

  function getRetryElement(type) {
    return type === 'app' ? document.getElementById('retry-btn') :
                            document.body;
  }

  function ensureDnsNotFound(type) {
    suite('DnsNotFound - Type frame: ' + type, function() {
      var reloadStub;

      suiteSetup(function() {
        document.documentURI = 'about:neterror?e=dnsNotFound&f=' + type;
        reloadStub = sinon.stub(window.NetError, 'reload');
      });

      setup(function() {
        window.NetError.init();
      });

      suiteTeardown(function() {
        reloadStub.restore();
      });

      test('Styles were initialized correctly ', function() {
        assert.isTrue(document.body.classList.contains('dnsNotFound'));
      });

      test('Messages were initialized correctly ', function() {
        assert.equal(document.getElementById('error-title').textContent,
                    'server-not-found');
        assert.isTrue(document.getElementById('error-message').textContent.
                      startsWith('server-not-found-error'));
      });

      test('Retry action was executed ', function() {
        getRetryElement(type).click();
        assert.isTrue(window.NetError.reload.called);
      });
    });
  }

  ensureDnsNotFound('regular');
  ensureDnsNotFound('app');

  function ensureFileNotFound(type) {
    suite('FileNotFound - Type frame: ' + type, function() {
      var reloadStub;

      suiteSetup(function() {
        document.documentURI = 'about:neterror?e=fileNotFound&f=' + type;
        reloadStub = sinon.stub(window.NetError, 'reload');
      });

      setup(function() {
        window.NetError.init();
      });

      suiteTeardown(function() {
        reloadStub.restore();
      });

      test('Styles were initialized correctly ', function() {
        assert.isTrue(document.body.classList.contains('fileNotFound'));
      });

      test('Messages were initialized correctly ', function() {
        assert.equal(document.getElementById('error-title').textContent,
                    'file-not-found');
        assert.isTrue(document.getElementById('error-message').textContent.
                      startsWith('file-not-found-error'));
      });

      test('Retry action was executed ', function() {
        getRetryElement(type).click();
        assert.isTrue(window.NetError.reload.called);
      });
    });
  }

  ensureFileNotFound('regular');
  ensureFileNotFound('app');

  function ensureUnknownError(type) {
    suite('Unknown Error - Type frame: ' + type, function() {
      var reloadStub = null, errorName = 'XXXX', description = 'Unknown error';

      suiteSetup(function() {
        document.documentURI = 'about:neterror?e=' + errorName + '&f=' + type +
                               '&d=' + description;
        reloadStub = sinon.stub(window.NetError, 'reload');
      });

      setup(function() {
        window.NetError.init();
      });

      suiteTeardown(function() {
        reloadStub.restore();
      });

      test('Styles were initialized correctly ', function() {
        assert.isTrue(document.body.classList.contains(errorName));
      });

      test('Messages were initialized correctly ', function() {
        assert.equal(document.getElementById('error-title').textContent,
                    'unable-to-connect');
        assert.equal(document.getElementById('error-message').textContent,
                     description);
      });

      test('Retry action was executed ', function() {
        getRetryElement(type).click();
        assert.isTrue(window.NetError.reload.called);
      });
    });
  }

  ensureUnknownError('regular');
  ensureUnknownError('app');
});
