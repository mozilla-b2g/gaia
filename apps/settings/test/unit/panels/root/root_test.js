'use strict';

require('/shared/test/unit/load_body_html_helper.js');
mocha.globals(['MockL10n', 'LazyLoader', 'getSupportedLanguages']);

suite('Languages > ', function() {
  var realL10n;
  var map = {
    '*': {
      'shared/lazyLoader': 'MockLazyLoader'
    }
  };
  var modules = [
    'unit/mock_l10n',
    'panels/root/root',
    'MockLazyLoader'
  ];

  suiteSetup(function(done) {
    this.MockLazyLoader = {
      load: function(scripts, callback) { setTimeout(callback); }
    };

    var requireCtx = testRequire([], map, function() {});
    define('MockLazyLoader', function() {
      return this.MockLazyLoader;
    }.bind(this));

    requireCtx(modules, function(MockL10n, Root) {
      realL10n = window.navigator.mozL10n;
      window.navigator.mozL10n = MockL10n;

      this.Root = Root;
      done();
    }.bind(this));
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
  });

  setup(function() {
    loadBodyHTML('./_root.html');
  });

  teardown(function() {
    document.body.innerHTML = '';
  });

  suite('init', function() {
    var sandbox;
    var fakeTimer;
    var root;

    setup(function() {
      sandbox = sinon.sandbox.create();
      fakeTimer = sinon.useFakeTimers();
      root = this.Root();
      sandbox.stub(root, '_initSimItems');
      sandbox.stub(root, '_initLocale');
      sandbox.stub(root, '_loadScripts');
      root.init();
    });

    teardown(function() {
      sandbox.restore();
      fakeTimer.restore();
    });

    test('_initSimItems should be called', function() {
      sinon.assert.called(root._initSimItems);
    });

    test('_initLocale should be called', function() {
      sinon.assert.called(root._initLocale);
    });

    test('_loadScripts should be called', function() {
      fakeTimer.tick();
      sinon.assert.called(root._loadScripts);
    });
  });

  suite('_refreshLocale', function() {
    var expectedTitle = 'English';
    var root;

    setup(function() {
      window.getSupportedLanguages = function(callback) {
        callback({ 'en-US': expectedTitle });
      };

      root = this.Root();
      root._refreshLocale();
    });

    teardown(function() {
      window.getSupportedLanguages = null;
    });

    test('_initSimItems should be called', function() {
      assert.equal(document.getElementById('language-desc').textContent,
        expectedTitle);
    });
  });

  suite('_initLocale', function() {
    var sandbox;
    var root;

    setup(function() {
      sandbox = sinon.sandbox.create();
      root = this.Root();
      sandbox.spy(navigator.mozL10n, 'ready');
      sandbox.stub(root, '_refreshLocale');
      root._initLocale();
    });

    teardown(function() {
      sandbox.restore();
    });

    test('should register _refreshLocale on mozL10n.ready', function() {
      sinon.assert.calledWith(navigator.mozL10n.ready, root._refreshLocale);
    });
  });

  suite('_initSimItems', function() {
    var realMobileConnections;
    var items;
    var root;

    setup(function() {
      realMobileConnections = navigator.mozMobileConnections;
      items = {
        callSettings: document.getElementById('call-settings'),
        dataConnectivity: document.getElementById('data-connectivity'),
        messagingSettings: document.getElementById('messaging-settings'),
        simSecuritySettings: document.getElementById('simSecurity-settings'),
        simManagerSettings: document.getElementById('simCardManager-settings')
      };

      root = this.Root();
    });

    teardown(function() {
      navigator.mozMobileConnections = realMobileConnections;
    });

    test('when there is no mobile connction', function() {
      navigator.mozMobileConnections = null;

      root._initSimItems();
      // Should hide all mobile connection related items.
      Object.keys(items).forEach(function(key) {
        assert.ok(items[key].hidden);
      });
    });

    test('when there is only one mobile connction', function() {
      navigator.mozMobileConnections = [{}];

      root._initSimItems();
      assert.ok(items.simManagerSettings.hidden,
        'should hide sim card manager item');
      assert.ok(!items.simSecuritySettings.hidden,
        'should show sim security item');
    });

    test('when there are multiple mobile connctions', function() {
      navigator.mozMobileConnections = [{}, {}];

      root._initSimItems();
      assert.ok(!items.simManagerSettings.hidden,
        'should show sim manager item');
      assert.ok(items.simSecuritySettings.hidden,
        'should hide sim security item');
    });
  });
});
