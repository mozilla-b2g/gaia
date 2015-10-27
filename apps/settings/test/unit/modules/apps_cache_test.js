/* global MockMozApps */
'use strict';

requireApp('settings/test/unit/mock_moz_apps.js');

suite('AppsCache', function() {
  var modules = [
    'modules/apps_cache'
  ];

  var realMozApps;
  var appsCache;

  suiteSetup(function() {
    realMozApps = window.navigator.mozApps;
  });

  suiteTeardown(function() {
    window.navigator.mozApps = realMozApps;
  });

  setup(function(done) {
    window.navigator.mozApps = MockMozApps;
    var requireCtx = testRequire([], {}, function() {});
    requireCtx(modules, function(AppsCache) {
      appsCache = AppsCache;
      done();
    });
  });

  suite('apps', function() {
    var apps = [
      { manifest: { role : 'homescreen' } },
      { manifest: { role : 'homescreen' } }
    ];

    setup(function() {
      this.sinon.stub(appsCache, '_init', function() {
        return Promise.resolve();
      });
      appsCache._apps = apps;
    });

    test('we can get the same apps back', function(done) {
      appsCache.apps().then(function(foundApps) {
        assert.equal(foundApps, apps);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('_init', function() {
    setup(function() {
      this.sinon.stub(appsCache, '_initApps', function() {
        return Promise.resolve();
      });
      this.sinon.stub(appsCache, '_initEvents');
    });

    test('related functions are executed', function(done) {
      appsCache._init().then(function() {
        assert.isTrue(appsCache._initApps.called);
        assert.isTrue(appsCache._initEvents.called);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('_initEvents', function() {
    var apps = [
      { manifestURL: 'http://example.org/abc/manifest.webapp' },
      { manifestURL: 'http://example.com/manifest.webapp' },
      { manifestURL: 'http://example.com/manifest.webapp' }
    ];

    setup(function() {
      MockMozApps.mgmt.oninstall = this.sinon.spy();
      MockMozApps.mgmt.onuninstall = this.sinon.spy();
      appsCache._initEvents();
      appsCache._apps = apps;
    });

    test('we will register two necessary events', function() {
      assert.equal(MockMozApps.mgmt.oninstall.called);
      assert.equal(MockMozApps.mgmt.onuninstall.called);
    });

    test('install should not add the same app multiple times', function() {
      appsCache._apps = [
        { manifestURL: 'http://example.org/abc/manifest.webapp', name: 'Abc' }
      ];
      MockMozApps.mgmt.oninstall({
        application: {
          manifestURL: 'http://example.org/abc/manifest.webapp',
          name: 'Def'
        }
      });
      assert.equal(appsCache._apps.length, 1);
      assert.equal(appsCache._apps[0].name, 'Def');
    });

    test('uninstall should remove all apps with the same manifest', function() {
      assert.equal(appsCache._apps.length, 3);
      MockMozApps.mgmt.onuninstall({
        application: { manifestURL: 'http://example.com/manifest.webapp' }
      });
      assert.equal(appsCache._apps.length, 1);
      assert.equal(appsCache._apps[0].manifestURL,
        'http://example.org/abc/manifest.webapp');
    });
  });

  suite('_initApps', function() {
    var testApps = [{}, {}];

    setup(function() {
      MockMozApps.mSetApps(testApps);
    });

    test('we will get apps', function(done) {
      appsCache._initApps().then(function() {
        assert.equal(appsCache._apps, testApps);
      }).then(done, done);
      MockMozApps.mTriggerGetAllAppsCallback();
    });
  });

  suite('addEventListener', function() {
    var testFunction = function() {};

    setup(function() {
      appsCache.addEventListener('oninstall', testFunction);
    });

    test('we did cache it', function() {
      assert.equal(appsCache._eventHandlers.oninstall[0], testFunction);
    });
  });

  suite('removeEventListener', function() {
    var testFunction = function() {};

    setup(function() {
      appsCache._eventHandlers.oninstall.push(testFunction);
      appsCache.removeEventListener('oninstall', testFunction);
    });

    test('we did remove it', function() {
      assert.equal(appsCache._eventHandlers.oninstall.length, 0);
    });
  });
});
