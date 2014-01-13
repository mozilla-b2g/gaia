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
        },
        search: function() {},
        abort: function() {}
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

  suite('dispatchMessage', function() {
    test('dispatches messages based on action', function() {
      var stub = this.sinon.stub(Search, 'change');
      Search.dispatchMessage({
        data: {
          action: 'change',
          input: 'http://mozilla.org'
        }
      });
      assert.ok(stub.calledOnce);
    });
  });

  suite('change', function() {
    setup(function() {
      var fakeProvider = {
        name: 'Foo',
        search: function() {},
        abort: function() {}
      };
      Search.provider(fakeProvider);
    });

    test('only searches once if called twice rapidly', function() {
      var stub = this.sinon.stub(Search.providers.Foo, 'search');
      Search.change({
        data: {
          input: 'a'
        }
      });
      Search.change({
        data: {
          input: 'a'
        }
      });
      assert.ok(stub.notCalled);
      clock.tick(1000); // For typing timeout
      assert.ok(stub.calledOnce);
    });

    test('aborting will cancel search timeout', function() {
      var stub = this.sinon.stub(Search.providers.Foo, 'search');
      Search.change({
        data: {
          input: 'a'
        }
      });
      Search.change({
        data: {
          input: 'a'
        }
      });
      assert.ok(stub.notCalled);
      Search.abort();
      clock.tick(1000); // For typing timeout
      assert.ok(stub.notCalled);
    });
  });

  suite('submit', function() {
    test('calls navigate for submit types', function() {
      var stub = this.sinon.stub(Search, 'navigate');
      Search.dispatchMessage({
        data: {
          action: 'submit',
          input: 'http://mozilla.org'
        }
      });
      clock.tick(1000); // For typing timeout
      assert.ok(stub.calledOnce);
    });
  });

  suite('clear', function() {
    var called = 0;

    suiteSetup(function() {
      Search.providers = {
        Fake: {
          clear: function() {
            called++;
          },
          abort: function() {}
        }
      };
    });

    test('calls the provider.clear method', function() {
      Search.clear();
      assert.equal(called, 1);
    });
  });

  suite('abort', function() {
    test('calls abort method of provider', function() {
      Search.providers = {
        Fake: {
          clear: function() {},
          abort: function() {}
        }
      };
      var abortStub = this.sinon.stub(Search.providers.Fake, 'abort');
      Search.abort();
      assert.ok(abortStub.calledOnce);
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

  suite('navigate', function() {
    test('window.open is called', function() {
      var url = 'http://mozilla.org';
      var stub = this.sinon.stub(window, 'open');
      Search.navigate(url);
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
