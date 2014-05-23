'use strict';
/* global MockNavigatormozApps, MockNavigatormozSetMessageHandler,
          MockMozActivity, Search */

require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/mock_moz_activity.js');

require('/shared/js/url_helper.js');

suite('search/search', function() {
  var realMozApps;
  var realMozActivity;
  var realSetMessageHandler;
  var clock;

  suiteSetup(function(done) {
    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;

    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realMozActivity = window.MozActivity;
    window.MozActivity = MockMozActivity;

    clock = sinon.useFakeTimers();

    requireApp('search/js/search.js', done);
  });

  suiteTeardown(function() {
    navigator.mozSetMessageHandler = realSetMessageHandler;
    navigator.mozApps = realMozApps;
    window.MozActivity = realMozActivity;
    clock.restore();
  });

  setup(function() {
    MockMozActivity.mSetup();
    MockNavigatormozSetMessageHandler.mSetup();
  });

  teardown(function() {
    MockMozActivity.mTeardown();
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
        return Object.keys(Search.providers).length;
      }

      var count = numProviders();
      Search.provider({
        name: 'Foo'
      });
      assert.equal(count + 1, numProviders());

      Search.removeProvider({
        name: 'Foo'
      });
      assert.equal(count, numProviders());
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
    test('Open activity is fired', function() {
      var url = 'http://mozilla.org';
      assert.equal(MockMozActivity.calls.length, 0);
      Search.navigate(url);
      assert.equal(MockMozActivity.calls.length, 1);
    });
  });

  suite('expandSearch', function() {
    setup(function() {
      Search.providers = {
        WebResults: {
          clear: function() {},
          abort: function() {},
          search: function() {},
          fullscreen: function() {}
        },
        BGImage: {
          clear: function() {},
          abort: function() {},
          search: function() {},
          fetchImage: function() {}
        }
      };
    });

    test('calls search for WebResults', function() {
      var stub = this.sinon.stub(Search.providers.WebResults,'fullscreen');
      Search.expandSearch();
      assert.ok(stub.calledOnce);
    });

    test('calls fetchImage for BGImage', function() {
      var searchStub = this.sinon.stub(Search.providers.BGImage, 'fetchImage');
      Search.expandSearch();
      assert.ok(searchStub.calledOnce);
    });
  });

  suite('setInput', function() {
    test('posts a message to the port', function() {
      Search._port = { postMessage: function() {} };
      var stub = this.sinon.stub(Search._port, 'postMessage');
      this.sinon.stub(Search, 'expandSearch');
      Search.setInput('foo');
      assert.ok(stub.calledWith({action: 'input', input: 'foo'}));
    });
  });

  suite('collect', function() {

    setup(function() {
      Search.exactResults = {};
      Search.fuzzyResults = {};
    });

    // Suppport functions
    function exactProvider() {
      return {
        dedupes: true,
        dedupeStrategy: 'exact',
        render: function() {}
      };
    }

    function fuzzyProvider() {
      return {
        dedupes: true,
        dedupeStrategy: 'fuzzy',
        render: function() {}
      };
    }

    test('provider does not de-dupe', function() {
      var results = [
        {dedupeId: 'a'},
        {dedupeId: 'b'}
      ];

      var provider = {
        dedupes: false,
        render: function() {}
      };

      var renderStub = this.sinon.stub(provider, 'render');
      Search.collect(provider, results);
      assert.equal(renderStub.getCall(0).args[0].length, 2);
    });

    test('when no de-duplication necessary', function() {
      var provider1 = exactProvider();
      var provider2 = exactProvider();

      var renderStub1 = this.sinon.stub(provider1, 'render');
      var renderStub2 = this.sinon.stub(provider2, 'render');
      Search.collect(provider1, [{dedupeId: 'a'}]);
      Search.collect(provider2, [{dedupeId: 'b'}]);
      assert.equal(renderStub1.getCall(0).args[0].length, 1);
      assert.equal(renderStub2.getCall(0).args[0].length, 1);
    });

    test('de-duplicates an exact manifestURL', function() {
      var results1 = [
        {dedupeId: 'http://mozilla.org/manifest.webapp'}
      ];

      var results2 = [
        {dedupeId: 'http://mozilla.org/manifest.webapp'}
      ];

      var provider1 = exactProvider();
      var provider2 = exactProvider();

      var renderStub1 = this.sinon.stub(provider1, 'render');
      var renderStub2 = this.sinon.stub(provider2, 'render');
      Search.collect(provider1, results1);
      Search.collect(provider2, results2);
      assert.equal(renderStub1.getCall(0).args[0].length, 1);
      assert.equal(renderStub2.getCall(0).args[0].length, 0);
    });

    test('de-duplicates a fuzzy match /w same domain', function() {
      var results1 = [
        {dedupeId: 'http://mozilla.org/manifest.webapp'}
      ];

      var results2 = [
        {dedupeId: 'http://mozilla.org/awesome/app'}
      ];

      var provider1 = fuzzyProvider();
      var provider2 = fuzzyProvider();

      var renderStub1 = this.sinon.stub(provider1, 'render');
      var renderStub2 = this.sinon.stub(provider2, 'render');
      Search.collect(provider1, results1);
      Search.collect(provider2, results2);
      assert.equal(renderStub1.getCall(0).args[0].length, 1);
      assert.equal(renderStub2.getCall(0).args[0].length, 0);
    });

    test('de-duplicates a fuzzy match /w subdomain', function() {
      var results1 = [
        {dedupeId: 'http://mozilla.org/manifest.webapp'}
      ];

      var results2 = [
        {dedupeId: 'http://omggame.mozilla.org/awesome/app'}
      ];

      var provider1 = fuzzyProvider();
      var provider2 = fuzzyProvider();

      var renderStub1 = this.sinon.stub(provider1, 'render');
      var renderStub2 = this.sinon.stub(provider2, 'render');
      Search.collect(provider1, results1);
      Search.collect(provider2, results2);
      assert.equal(renderStub1.getCall(0).args[0].length, 1);
      assert.equal(renderStub2.getCall(0).args[0].length, 0);
    });

    test('attempt to avoid de-duplicating second level domains', function() {
      var results1 = [
        {dedupeId: 'http://mozilla.co.org/manifest.webapp'}
      ];

      var results2 = [
        {dedupeId: 'http://bob.co.org/awesome/app'}
      ];

      var provider1 = exactProvider();
      var provider2 = fuzzyProvider();

      var renderStub1 = this.sinon.stub(provider1, 'render');
      var renderStub2 = this.sinon.stub(provider2, 'render');
      Search.collect(provider1, results1);
      Search.collect(provider2, results2);
      assert.equal(renderStub1.getCall(0).args[0].length, 1);
      assert.equal(renderStub2.getCall(0).args[0].length, 1);
    });

    test('installed hosted app /w web result', function() {
      var results1 = [
        {dedupeId:
          'https://m.facebook.com/openwebapp/manifest.webapp'
        }
      ];

      var results2 = [
        {dedupeId: 'https://www.facebook.com/'}
      ];

      var provider1 = exactProvider();
      var provider2 = fuzzyProvider();

      var renderStub1 = this.sinon.stub(provider1, 'render');
      var renderStub2 = this.sinon.stub(provider2, 'render');
      Search.collect(provider1, results1);
      Search.collect(provider2, results2);
      assert.equal(renderStub1.getCall(0).args[0].length, 1);
      assert.equal(renderStub2.getCall(0).args[0].length, 0);
    });

    test('mis-matching domain against manifest url', function() {
      var results1 = [
        {dedupeId:
          'https://bits.wikimedia.org/wikipediamobilefirefoxos/manifest.webapp'
        }
      ];

      var results2 = [
        {dedupeId: 'http://en.m.wikipedia.org'}
      ];

      var provider1 = fuzzyProvider();
      var provider2 = fuzzyProvider();

      var renderStub1 = this.sinon.stub(provider1, 'render');
      var renderStub2 = this.sinon.stub(provider2, 'render');
      Search.collect(provider1, results1);
      Search.collect(provider2, results2);
      assert.equal(renderStub1.getCall(0).args[0].length, 1);
      assert.equal(renderStub2.getCall(0).args[0].length, 0);
    });

    test('common domain parts filtered out', function() {
      Search.fuzzyResults = {
        'touch': true,
        'mobile': true
      };

      var results1 = [
        {dedupeId: 'https://touch.www.linkedin.com/login.html'}
      ];

      var results2 = [
        {dedupeId: 'https://touch.mozilla.org/fake.html'}
      ];

      var provider1 = fuzzyProvider();
      var provider2 = fuzzyProvider();

      var renderStub1 = this.sinon.stub(provider1, 'render');
      var renderStub2 = this.sinon.stub(provider2, 'render');
      Search.collect(provider1, results1);
      Search.collect(provider2, results2);
      assert.equal(renderStub1.getCall(0).args[0].length, 1);
      assert.equal(renderStub2.getCall(0).args[0].length, 1);
    });

    test('exact provider does not de-dupe against itself', function() {
      var results = [
        {dedupeId: 'https://mozilla.org/index.html'},
        {dedupeId: 'https://mozilla.org/sauce.html'}
      ];

      var provider = exactProvider();

      var renderStub = this.sinon.stub(provider, 'render');
      Search.collect(provider, results);
      assert.equal(renderStub.getCall(0).args[0].length, 2);
    });

    test('fuzzy provider does not de-dupe against itself', function() {
      var results = [
        {dedupeId: 'https://mozilla.org/index.html'},
        {dedupeId: 'https://mozilla.org/sauce.html'}
      ];

      var provider = fuzzyProvider();

      var renderStub = this.sinon.stub(provider, 'render');
      Search.collect(provider, results);
      assert.equal(renderStub.getCall(0).args[0].length, 2);
    });
  });
});
