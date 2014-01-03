'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/js/url_helper.js');

mocha.globals(['Search']);

suite('search/search', function() {
  var realMozApps;
  var realSetMessageHandler;
  var clock;

  suiteSetup(function(done) {
    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;

    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    clock = sinon.useFakeTimers();

    requireApp('search/js/search.js', done);
  });

  suiteTeardown(function() {
    navigator.mozSetMessageHandler = realSetMessageHandler;
    navigator.mozApps = realMozApps;
    clock.restore();
  });

  setup(function() {
    MockNavigatormozSetMessageHandler.mSetup();
  });

  teardown(function() {
    MockNavigatormozSetMessageHandler.mTeardown();
    MockNavigatormozApps.mTeardown();
  });

  suite('init', function() {
    test('will call provider init method', function() {
      var initCalled;
      Search.providers = [{
        init: function() {
          initCalled = true;
        }
      }];

      Search.init();
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      assert.equal(MockNavigatormozApps.mLastConnectionKeyword,
        'search-results');
      MockNavigatormozApps.mLastConnectionCallback([]);
      assert.ok(initCalled);
    });
  });

  suite('provider', function() {
    test('increments number of providers', function() {
      function numProviders() {
        var num = 0;
        for (var i in Search.providers) {
          num++;
        }
        return num;
      }

      var count = numProviders();
      Search.provider({
        name: 'Foo'
      });
      assert.equal(count + 1, numProviders());
    });
  });

  suite('onSearchInput', function() {
    test('calls browse for submit types', function() {
      var stub = this.sinon.stub(Search, 'browse');
      Search.onSearchInput({
        data: {
          type: 'submit',
          input: 'http://mozilla.org'
        }
      });
      clock.tick(1000); // For typing timeout
      assert.ok(stub.calledOnce);
    });
  });

  suite('close', function() {
    test('posts a message to the port', function() {
      Search._port = { postMessage: function() {} };
      var stub = this.sinon.stub(Search._port, 'postMessage');
      Search.close();
      assert.ok(stub.calledWith({action: 'hide'}));
    });
  });

  suite('browse', function() {
    test('window.open is called', function() {
      var url = 'http://mozilla.org';
      var stub = this.sinon.stub(window, 'open');
      Search.browse(url);
      assert.ok(stub.calledWith(url));
    });
  });

  suite('setInput', function() {
    test('posts a message to the port', function() {
      Search._port = { postMessage: function() {} };
      var stub = this.sinon.stub(Search._port, 'postMessage');
      Search.setInput('foo');
      assert.ok(stub.calledWith({input: 'foo'}));
    });
  });

});
