'use strict';

mocha.globals(['NetError']);

require('/shared/test/unit/load_body_html_helper.js');
requireApp('system/test/unit/mock_l10n.js');

suite('netOffline type error', function() {

  var realDocumentURI, realL10n, isOnline, isDocumentHidden;
  
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

    realDocumentURI = document.documentURI;
    Object.defineProperty(document, 'documentURI', {
      writable: true
    });

    realL10n = navigator.mozL10n;
    var stubReady = sinon.stub(window.MockL10n, 'ready');
    navigator.mozL10n = window.MockL10n;
    
    loadBodyHTML('/net_error.html');

    requireApp('system/js/net_error.js', function() {
      stubReady.restore();
      done();
    });
  });

  suiteTeardown(function() {
    delete document.hidden;
    delete navigator.onLine;
    document.documentURI = realDocumentURI;
    navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
  });

  function ensureFrame(type) {
    suite('Type frame: ' + type, function() {
      var reloadStub;

      suiteSetup(function() {
        document.documentURI = 'about:neterror?e=netOffline&f=' + type;
        reloadStub = sinon.stub(window.NetError, 'reload');
        window.NetError.init();
      });

      suiteTeardown(function() {
        reloadStub.restore();
      });

      test('Styles were initialized correctly ', function() {
        assert.isTrue(document.body.classList.contains('netOffline'));
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

  ensureFrame('regular');
  ensureFrame('app');
});
