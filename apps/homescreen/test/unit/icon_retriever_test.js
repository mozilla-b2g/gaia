'use strict';

requireApp('homescreen/test/unit/mock_xmlhttprequest.js');
requireApp('homescreen/test/unit/mock_icon.js');

requireApp('homescreen/js/icon_retriever.js');

var mocksHelperForIconRetriever = new MocksHelper([
  'XMLHttpRequest',
  'Icon'
]);
mocksHelperForIconRetriever.init();

suite('icon_retriever.js >', function() {

  var realOnLine, isOnLine;

  function navigatorOnLine() {
    return isOnLine;
  }

  function setNavigatorOnLine(value) {
    isOnLine = value;
  }

  function createImageBlob() {
    var data = ['some stuff'];
    var properties = {
      type: 'image/png'
    };

    return new Blob(data, properties);
  }

  var mocksHelper = mocksHelperForIconRetriever;
  var iconAppProtocol, iconHTTPProtocol;

  suiteSetup(function() {
    mocksHelper.suiteSetup();

    realOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: navigatorOnLine,
      set: setNavigatorOnLine
    });

    navigator.onLine = true;

    iconAppProtocol = new Icon({
      icon: 'app://game/icon.png'
    });

    iconHTTPProtocol = new Icon({
      icon: 'http://www.icon.com/icon.png'
    });
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
    if (realOnLine) {
      Object.defineProperty(navigator, 'onLine', realOnLine);
    }
  });

  setup(function() {
    IconRetriever.init();
  });

  suite('Online >', function() {

    setup(function() {
      navigator.onLine = true;
    });

    test('Protocol app:// OK >', function(done) {
      IconRetriever.get({
        icon: iconAppProtocol,
        success: function(blob) {
          assert.ok(blob);
          done();
        }
      });

      MockXMLHttpRequest.mSendOnLoad({
        response: createImageBlob()
      });
    });

    test('Protocol app:// FAIL >', function(done) {
      IconRetriever.get({
        icon: iconAppProtocol,
        error: done
      });

      MockXMLHttpRequest.mSendOnLoad({
        status: 404
      });
    });

    test('Protocol http:// OK >', function(done) {
      IconRetriever.get({
        icon: iconHTTPProtocol,
        success: function(blob) {
          assert.ok(blob);
          done();
        }
      });

      MockXMLHttpRequest.mSendOnLoad({
        response: createImageBlob()
      });
    });

    test('Protocol http:// FAIL >', function(done) {
      IconRetriever.get({
        icon: iconHTTPProtocol,
        error: done
      });

      MockXMLHttpRequest.mSendOnLoad({
        status: 404
      });
    });
  });

  suite('Offline >', function() {

    setup(function() {
      navigator.onLine = false;
    });

    test('Protocol app:// OK >', function(done) {
      IconRetriever.get({
        icon: iconAppProtocol,
        success: function(blob) {
          assert.ok(blob);
          done();
        }
      });

      MockXMLHttpRequest.mSendOnLoad({
        response: createImageBlob()
      });
    });

    test('Protocol app:// FAIL >', function(done) {
      IconRetriever.get({
        icon: iconAppProtocol,
        error: done
      });

      MockXMLHttpRequest.mSendOnLoad({
        status: 404
      });
    });

    test('Protocol http:// OK | There is not connection at the beginning >',
         function(done) {
      IconRetriever.get({
        icon: iconHTTPProtocol,
        success: function(blob) {
          assert.ok(blob);
          done();
        }
      });

      setTimeout(function() {
        window.dispatchEvent(new CustomEvent('online'));
        setTimeout(function() {
          MockXMLHttpRequest.mSendOnLoad({
            response: createImageBlob()
          });
        }, 0);
      }, 0);
    });

    test('Protocol http:// FAIL | There is not connection at the beginning  >',
         function(done) {
      IconRetriever.get({
        icon: iconHTTPProtocol,
        error: done
      });

      setTimeout(function() {
        window.dispatchEvent(new CustomEvent('online'));
        setTimeout(function() {
          MockXMLHttpRequest.mSendOnLoad({
            status: 404
          });
        }, 0);
      }, 0);
    });
  });

});
