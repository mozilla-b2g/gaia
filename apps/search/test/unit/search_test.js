'use strict';
/* global MockNavigatormozApps, MockNavigatormozSetMessageHandler,
          Search, MockProvider, MockasyncStorage, Promise, MocksHelper */

require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/mock_moz_activity.js');
require('/shared/test/unit/mocks/mock_search_provider.js');
require('/shared/js/url_helper.js');
require('/shared/js/dedupe.js');
require('/js/contextmenu.js');
require('/shared/js/metrics_helper.js');
require('/shared/test/unit/mocks/mock_async_storage.js');
requireApp('search/test/unit/mock_provider.js');

var mocksForSearch = new MocksHelper([
  'SearchProvider'
]).init();

suite('search/search', function() {
  var realAsyncStorage;
  var realMozApps;
  var realSetMessageHandler;
  var realOnLine;

  var clock;
  mocksForSearch.attachTestHelpers();

  function removeProvider(provider) {
    delete Search.providers[provider.name];
  }

  suiteSetup(function(done) {
    loadBodyHTML('/index.html');

    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;

    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realAsyncStorage = window.asyncStorage;
    window.asyncStorage = MockasyncStorage;

    window.SettingsListener = {
      observe: function() {}
    };

    clock = sinon.useFakeTimers();

    requireApp('search/js/search.js', function() {
      // assert.equal(Search.toShowNotice, null);
      // Search.toShowNotice = false;

      Search._port = { postMessage: function() {} };
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozSetMessageHandler = realSetMessageHandler;
    navigator.mozApps = realMozApps;
    window.asyncStorage = realAsyncStorage;
    clock.restore();
    delete window.SettingsListener;
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
      this.sinon.spy(window.MetricsHelper.prototype, 'init');

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
      Search.providers = [];
      assert.isFalse(Search.suggestionsWrapper.classList.contains('offline'));
      sinon.assert.calledOnce(window.MetricsHelper.prototype.init);
    });
  });

  suite('offline', function() {
    suiteSetup(function() {
      realOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: function() { return false; }
      });
    });

    suiteTeardown(function() {
      if (realOnLine) {
        Object.defineProperty(navigator, 'onLine', realOnLine);
      }
    });

    test('init while offline', function() {
      this.sinon.spy(Search, 'initConnectivityCheck');
      Search.init();

      sinon.assert.calledOnce(Search.initConnectivityCheck);
      assert.isTrue(Search.searchResults.classList.contains('offline'));
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

      removeProvider({
        name: 'Foo'
      });
      assert.equal(count, numProviders());
    });
  });

  suite('initNotice', function() {
    test('gets the settingsLink on every call', function() {
      var stub = this.sinon.stub(document, 'getElementById').returns({
        addEventListener: this.sinon.spy()
      });
      Search.initNotice();
      Search.initNotice();
      assert.isTrue(stub.withArgs('settings-link').callCount === 2);
    });
  });

  suite('scrolling focus', function() {
    test('we grab focus when scrolling results', function() {
      var stub = this.sinon.stub(window, 'focus');
      window.dispatchEvent(new window.Event('scroll'));
      assert.ok(stub.calledOnce);
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
        search: function() {
          return Promise.resolve();
        },
        abort: function() {},
        clear: function() {}
      };
      Search.provider(fakeProvider);
    });

    test('only searches once if called twice rapidly', function() {
      var stub = this.sinon.stub(Search.providers.Foo, 'search').returns(
        new Promise(() => {}));
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

    test('full URLs do not get sent', function() {
      var remoteProvider = {
        name: 'remoteguy',
        remote: true,
        search: function() {},
        abort: function() {},
        clear: function() {}
      };
      Search.provider(remoteProvider);
      Search.suggestionsEnabled = true;

      var stub = this.sinon.stub(Search.providers.remoteguy, 'search');
      Search.change({
        data: {
          input: 'http://mozilla.org'
        }
      });
      clock.tick(1000); // For typing timeout
      assert.ok(stub.notCalled);
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

    test('when a private browser', function() {
      var remoteProvider = {
        name: 'remoteguy',
        remote: true,
        search: function() {},
        abort: function() {},
        clear: function() {}
      };
      Search.provider(remoteProvider);
      Search.suggestionsEnabled = true;

      var stub = this.sinon.stub(Search.providers.remoteguy, 'search');
      Search.change({
        data: {
          input: 'search me',
          isPrivateBrowser: true
        }
      });
      clock.tick(1000); // For typing timeout
      assert.ok(stub.notCalled);
    });
  });

  suite('submit', function() {
    test('Navigates to a URL', function() {
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

    test('Fires correct Event to metrics search for search term', function() {
      var stub = this.sinon.stub(window.MetricsHelper.prototype, 'report');

      Search.dispatchMessage({
        data: {
          action: 'submit',
          input: 'searchterm'
        }
      });
      clock.tick(1000); // For typing timeout

      assert.ok(stub.calledWith('websearch', 'testProvider'));
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
      var stub = this.sinon.stub(Search._port, 'postMessage');
      Search.close();
      assert.ok(stub.calledWith({action: 'hide'}));
    });
  });

  suite('navigate', function() {
    test('Open activity is fired', function() {
      var url = 'http://mozilla.org';
      var stub = this.sinon.stub(window, 'open');
      Search.navigate(url);
      assert.ok(stub.calledOnce);
    });
  });

  suite('expandSearch', function() {
    setup(function() {
      Search.providers = {
        WebResults: {
          clear: function() {},
          abort: function() {},
          search: function() {
            return new Promise(() => {});
          },
          fullscreen: function() {}
        }
      };
    });

    test('calls search for WebResults', function() {
      var stub = this.sinon.stub(Search.providers.WebResults,'fullscreen');
      Search.expandSearch();
      assert.ok(stub.calledOnce);
    });
  });

  suite('setInput', function() {
    test('posts a message to the port', function() {
      var stub = this.sinon.stub(Search._port, 'postMessage');
      this.sinon.stub(Search, 'expandSearch');
      Search.setInput('foo');
      assert.ok(stub.calledWith({action: 'input', input: 'foo'}));
    });
  });

  suite('collect', function() {

    setup(function() {
      Search.dedupe.exactResults = {};
      Search.dedupe.fuzzyResults = {};
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
      Search.dedupe.fuzzyResults = {
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

    test('bug 1030713 - subdomain dededupe matching', function() {
      var results1 = [
        {dedupeId: 'http://translate.google.com'}
      ];

      var results2 = [
        {dedupeId: 'http://mail.google.com/tasks'},
        {dedupeId: 'http://drive.google.com/keep'},
      ];

      var provider1 = fuzzyProvider();
      var provider2 = fuzzyProvider();

      var renderStub1 = this.sinon.stub(provider1, 'render');
      var renderStub2 = this.sinon.stub(provider2, 'render');
      Search.collect(provider1, results1);
      Search.collect(provider2, results2);
      assert.equal(renderStub1.getCall(0).args[0].length, 1);
      assert.equal(renderStub2.getCall(0).args[0].length, 2);
    });

    test('bug 1030713 - subdomain dededupe matching with path', function() {
      var results1 = [
        {dedupeId: 'http://drive.google.com/keep'}
      ];

      var results2 = [
        {dedupeId: 'http://mail.google.com/tasks'},
        {dedupeId: 'http://translate.google.com'},
      ];

      var provider1 = fuzzyProvider();
      var provider2 = fuzzyProvider();

      var renderStub1 = this.sinon.stub(provider1, 'render');
      var renderStub2 = this.sinon.stub(provider2, 'render');
      Search.collect(provider1, results1);
      Search.collect(provider2, results2);
      assert.equal(renderStub1.getCall(0).args[0].length, 1);
      assert.equal(renderStub2.getCall(0).args[0].length, 2);
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

    test('exact provider ignores querystring', function() {
      var results1 = [
        {dedupeId: 'https://mozilla.org/index.html?ignoreme=true'}
      ];

      var results2 = [
        {dedupeId: 'https://mozilla.org/index.html'}
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

    test('Dont search remote providers when suggestions disabled', function() {
      var localProvider = new MockProvider('local');
      var remoteProvider = new MockProvider('remote');
      remoteProvider.remote = true;

      var remoteStub = this.sinon.stub(remoteProvider, 'search')
        .returns(new Promise(() => {}));
      var localStub = this.sinon.stub(localProvider, 'search')
        .returns(new Promise(() => {}));

      Search.provider(localProvider);
      Search.provider(remoteProvider);

      Search.suggestionsEnabled = false;

      Search.change({data: {input: 'test'}});
      clock.tick(1000);

      assert.ok(remoteStub.notCalled);
      assert.ok(localStub.calledOnce);

      removeProvider(localProvider);
      removeProvider(remoteProvider);
    });

    test('Search all providers when suggestions enabled', function() {
      var localProvider = new MockProvider('local');
      var remoteProvider = new MockProvider('remote');
      remoteProvider.remote = true;

      var remoteStub = this.sinon.stub(remoteProvider, 'search')
        .returns(new Promise(() => {}));
      var localStub = this.sinon.stub(localProvider, 'search')
        .returns(new Promise(() => {}));

      Search.provider(localProvider);
      Search.provider(remoteProvider);

      Search.suggestionsEnabled = true;
      Search.change({data: {input: 'test'}});
      clock.tick(1000);

      assert.ok(remoteStub.calledOnce);
      assert.ok(localStub.calledOnce);

      removeProvider(localProvider);
      removeProvider(remoteProvider);
    });

  });
});
