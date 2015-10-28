/* global LateCustomizationPanel, MockLazyLoader, MockNavigatorSettings,
   MockL10n, MockPromise, MockDOMRequest */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_promise.js');
require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_dom_request.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/js/sanitizer.js');

suite('Late Customization >', function() {
  var realSettings;
  var realL10n;
  var lcPanel;
  var MockNavigation = {
    registerStep: function() {},
    skipStep: function() {}
  };
  var realLazyLoader, realPromise;
  var mockResponse = {
    objects: [
      {
        device_types: ['firefoxos'],
        icons: {},
        name: {
            'en-US': 'Foo',
            'sv-Chef': 'Bork'
        },
        manifest_url: 'http://host/manifest.webapp'
      },
      {
        device_types: ['android-mobile', 'firefoxos'],
        icons: {},
        name: {
            'en-yorks': 'Now then',
            'en-US': 'Hey',
        },
        manifest_url: 'http://host2/manifest.webapp'
      },
      {
        device_types: ['desktop'],
        icons: {},
        name: {
            'en-US': 'Foo',
        },
        manifest_url: 'http://host3/manifest.webapp'
      },
    ]
  };

  suiteSetup(function(done) {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;
    sinon.stub(MockL10n, 'once');
    window.Navigation = MockNavigation;
    realLazyLoader = window.LazyLoader;
    window.LazyLoader = MockLazyLoader;
    realPromise = window.Promise;

    document.body.innerHTML = `
    <section id="activation-screen" role="region"
             class="skin-organic no-options">
      <gaia-header>
        <h1 id="main-title"></h1>
        <button id="wifi-refresh-button" data-l10n-id="refresh">Refresh</button>
      </gaia-header>
      <article role="main"></article>
    </section>`;

    requireApp('ftu/js/late_customization.js', done);
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
    realSettings = null;
  });

  function switchReadOnlyProperty(originObject, propName, targetObj) {
    Object.defineProperty(originObject, propName, {
      configurable: true,
      get: function() { return targetObj; }
    });
  }

  setup(function() {
    lcPanel = new LateCustomizationPanel();
  });

  suite('init', function() {
    setup(function() {
      switchReadOnlyProperty(lcPanel, 'enabled', true);
      this.sinon.stub(window.Navigation, 'registerStep');
    });

    test('registerStep is called', function() {
      this.sinon.stub(lcPanel, 'render');
      this.sinon.stub(lcPanel, 'attemptToPopulateAppList')
          .returns(new MockPromise());
      lcPanel.init();
      assert.ok(window.Navigation.registerStep.calledOnce);
    });

    test('render renders', function() {
      this.sinon.stub(lcPanel, 'attemptToPopulateAppList');
      lcPanel.init();
      var ids = [
        'late_customization',
        'late-customization-cando',
        'late_customization-downloading-message',
        'late-customization-nocando',
        'late_customization-download-later-message',
        'late_customization-download-later-marketplace',
        'late_customization-applist'
      ];
      var byId = document.getElementById.bind(document);
      assert.ok(ids.every(id => byId(id)));
      assert.equal(byId('late_customization-applist').childElementCount, 0);
      assert.ok(byId('late-customization-cando').classList.contains('hidden'));
    });

    test('kicks off process to fetch apps', function() {
      var connectedPromise = new MockPromise();
      this.sinon.stub(lcPanel, 'render');
      this.sinon.stub(lcPanel, 'whenUsableConnection')
          .returns(connectedPromise);
      lcPanel.init();
      assert.ok(lcPanel.whenUsableConnection.calledOnce);
    });
  });

  test('operatorInfo', function() {
    var settingsPromise = new MockPromise();
    this.sinon.stub(lcPanel, 'waitForSettingValues').returns(settingsPromise);
    this.sinon.stub(lcPanel, 'getInfoFromMobileConnection').returns({
      operator: 'acme',
      mcc: '01', mnc: '02'
    });
    lcPanel.start();
    settingsPromise.mFulfillToValue(['url', { region: 'foo'}]);
    console.log('lcPanel.operatorInfo', lcPanel.operatorInfo);
  });

  suite('navigation', function() {
    setup(function() {
      this.sinon.stub(window.Navigation, 'registerStep');
      this.sinon.stub(window.Navigation, 'skipStep');
      this.sinon.stub(lcPanel, 'onPanelShown');
      this.sinon.stub(lcPanel, 'render');
      this.sinon.stub(lcPanel, 'attemptToPopulateAppList');
      lcPanel.init();
      switchReadOnlyProperty(lcPanel, 'enabled', true);
    });

    test('panel is shown when there are apps', function() {
      var appsMap = new Map([
        ['http://host/manifest.webapp', mockResponse.objects[0]]
      ]);
      lcPanel._appsToInstall = appsMap;
      lcPanel.handleEvent({ type: 'hashchange', target: {
        location: {
          hash: '#late_customization'
        }
      }});
      assert.ok(lcPanel.onPanelShown.calledOnce);
      assert.isFalse(window.Navigation.skipStep.called);
    });

    test('panel is not shown when there are no apps', function() {
      var appsMap = new Map([]);
      lcPanel._appsToInstall = appsMap;
      lcPanel.handleEvent({ type: 'hashchange', target: {
        location: {
          hash: '#late_customization'
        }
      }});
      assert.ok(!lcPanel.onPanelShown.called);
      assert.ok(window.Navigation.skipStep.calledOnce);
    });
  });

  test('buildManifestUrl', function() {
    var manifestURL = 'http://host.com/api/?carrier=acme&region=foo';
    var operatorInfo = {
      operator: 'meh', mcc: '01', mnc: '02', region: 'bar'
    };
    var url = lcPanel.buildManifestUrl(manifestURL, operatorInfo);
    assert.equal(url,
      'http://host.com/api/?carrier=acme&region=bar&' +
      'operator=meh&mcc=01&mnc=02');
  });

  suite('fetch manifest', function() {
    var getJSONPromise;
    var manifestURL = 'http://host.com/api/?carrier=Acme&region=foo';
    var result;

    setup(function() {
      window.Promise = MockPromise;
      getJSONPromise = new MockPromise();
      this.sinon.stub(lcPanel, 'buildManifestUrl').returns(manifestURL);
      this.sinon.stub(window.LazyLoader, 'getJSON').returns(getJSONPromise);
    });
    teardown(function() {
      window.Promise = realPromise;
      result = null;
    });

    test('valid response', function() {
      lcPanel.fetchManifest().mExecuteCallback(function(_result) {
        return (result = _result);
      });
      getJSONPromise.mFulfillToValue({ objects: [] });
      assert.ok(result && result.objects);
    });

    test('Server error in response', function() {
      var expectedError;
      lcPanel.fetchManifest().mExecuteCallback(function(_result) {
        return (result = _result);
      }, function(_err) {
        expectedError = _err;
      });
      getJSONPromise.mFulfillToValue({ error: {} });
      assert.ok(!result);
      assert.ok(expectedError);
    });

    test('Request failed', function() {
      var expectedError;
      lcPanel.fetchManifest().mExecuteCallback(function(_result) {
        return (result = _result);
      }, function(_err) {
        expectedError = _err;
      });
      getJSONPromise.mRejectToError({});
      assert.ok(!result);
      assert.ok(expectedError);
    });
  });

  suite('getAppsFromManifest', function() {
    var realLanguages = navigator.languages;

    setup(function() {
      switchReadOnlyProperty(navigator, 'languages', [ 'sv-Chef', 'en-US' ]);
    });
    teardown(function() {
      switchReadOnlyProperty(navigator, 'languages', realLanguages);
    });

    test('getAppsFromManifest ignores non-firefoxos app', function() {
      var result = lcPanel.getAppsFromManifest(mockResponse);
      assert.equal(result.size, 2);
      assert.isFalse(result.has('http://host3/manifest.webapp'));
    });
    test('displayName', function() {
      var result = lcPanel.getAppsFromManifest(mockResponse);
      var app1 = result.get('http://host/manifest.webapp');
      assert.ok(app1 && app1.displayName);
      assert.equal(app1.displayName, 'Bork');

      var app2 = result.get('http://host2/manifest.webapp');
      assert.equal(app2.displayName, 'Hey');
    });
  });

  suite('Populate and send', function() {
    setup(function() {
      window.Promise = MockPromise;
    });
    teardown(function() {
      window.Promise = realPromise;
    });
    test('No message when there are no apps', function() {
      var connected = new MockPromise();
      var appsFetched = new MockPromise();

      this.sinon.stub(lcPanel, 'whenUsableConnection').returns(connected);
      this.sinon.stub(lcPanel, 'fetchAppsToInstall').returns(appsFetched);
      this.sinon.stub(lcPanel, 'updateAppList');
      this.sinon.stub(lcPanel, 'postConnectMessage');

      lcPanel.attemptToPopulateAppList();
      connected.mFulfillToValue(true);
      var appsMap = new Map([]);
      lcPanel._appsToInstall = appsMap;
      appsFetched.mFulfillToValue(appsMap);

      assert.ok(!lcPanel.updateAppList.calledOnce);
      assert.ok(!lcPanel.postConnectMessage.called);
    });

    test('Posts message when there are apps', function() {
      var connected = new MockPromise();
      var appsFetched = new MockPromise();

      this.sinon.stub(lcPanel, 'whenUsableConnection').returns(connected);
      this.sinon.stub(lcPanel, 'fetchAppsToInstall').returns(appsFetched);
      this.sinon.stub(lcPanel, 'updateAppList');
      this.sinon.stub(lcPanel, 'postConnectMessage');

      lcPanel.attemptToPopulateAppList();
      connected.mFulfillToValue(true);
      var appsMap = new Map([
        ['http://host/manifest.webapp', mockResponse.objects[0]]
      ]);
      lcPanel._appsToInstall = appsMap;
      appsFetched.mFulfillToValue(appsMap);

      assert.ok(lcPanel.updateAppList.calledOnce);
      assert.ok(lcPanel.postConnectMessage.calledOnce);
      var message = lcPanel.postConnectMessage.firstCall.args[0];
      assert.equal(message.urls.length, appsMap.size);
    });
  });

  suite('postMessage', function() {
    var mockSelfRequest, mockConnectRequest;
    var fakeMessage, mockSelf, mockPort;

    setup(function() {
      mockSelfRequest = new MockDOMRequest();
      mockConnectRequest = new MockDOMRequest();
      fakeMessage = 'some message';
      mockSelf = {
        connect: sinon.stub().returns(mockConnectRequest)
      };
      this.sinon.stub(navigator.mozApps, 'getSelf').returns(mockSelfRequest);
      mockPort = {
        postMessage: this.sinon.stub()
      };
    });

    test('postConnectMessage', function() {
      lcPanel.postConnectMessage(fakeMessage);
      mockSelfRequest.fireSuccess(mockSelf);

      mockConnectRequest.then(function() {
        assert.ok(mockPort.postMessage.calledOnce);
        assert.equal(mockPort.postMessage.firstCall.args[0], fakeMessage);
      }).catch(err => {
        assert.ok(!err);
      });
      mockConnectRequest.fireSuccess([ mockPort ]);
    });

  });

  suite('install queue', function() {
    var appsToInstall;
    function FauxPromise() {
      this.then = this.catch = function() {};
    }
    setup(function() {
      appsToInstall = new Map();
      mockResponse.objects.forEach(appData => {
        appData.manifestURL = appData.manifest_url;
        appsToInstall.set(appData.manifest_url, appData);
      });
      switchReadOnlyProperty(lcPanel, 'enabled', true);
      this.sinon.stub(window.Navigation, 'registerStep');
      this.sinon.stub(lcPanel, 'attemptToPopulateAppList');
      this.sinon.stub(lcPanel, 'getAppIconUrl').returns(new FauxPromise());
      this.sinon.stub(lcPanel, 'finalizeRender');
      lcPanel.init();
      lcPanel.updateAppList(appsToInstall);
    });

    test('installApp', function(done) {
      var initiallyPendingNodes = lcPanel.element.querySelectorAll('.pending');
      assert.equal(initiallyPendingNodes.length, appsToInstall.size);
      var fakeAppData = appsToInstall.get('http://host/manifest.webapp');
      var promisedConnection = Promise.resolve();
      fakeAppData.manifestURL = fakeAppData.manifest_url;
      var mockInstallRequest = new MockDOMRequest();
      this.sinon.stub(lcPanel, 'whenUsableConnection')
        .returns(promisedConnection);
      this.sinon.stub(window.navigator.mozApps, 'install')
        .returns(mockInstallRequest);

      lcPanel.installApp(fakeAppData);
      promisedConnection.then(() => {
        mockInstallRequest.fireSuccess();
        var nowPendingNodes = lcPanel.element.querySelectorAll('.pending');
        assert.equal(nowPendingNodes.length, appsToInstall.size -1);
      }).then(done, (err) => { done(err); });
    });

    test('attemptInstalls', function(done) {
      this.sinon.stub(lcPanel, 'installApp').returns(Promise.resolve());
      this.sinon.spy(lcPanel, 'enqueAppInstall');
      lcPanel._appsToInstall = appsToInstall;

      return lcPanel.attemptInstalls().then(() => {
        assert.equal(lcPanel.enqueAppInstall.callCount, appsToInstall.size);
        assert.equal(lcPanel.installApp.callCount, appsToInstall.size);
      }).then(() => {
        done();
      }, (err) => { done(err); });
    });
  });
});
