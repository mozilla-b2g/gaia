'use strict';
/* global Search, MockNavigatormozApps, MockNavigatorSettings */

require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('search/test/unit/mock_search.js');
requireApp('search/js/providers/provider.js');
requireApp('search/js/providers/grid_provider.js');

suite('search/providers/local_apps', function() {

  var realMozApps;
  var realMozSettings;
  var _apps, _blValue;

  suiteSetup(function() {
    _apps = [{
      manifest: {
        entry_points: {
          'fakeapp1-1': {
            launch_path: '/fakeapp1-1/index.html',
            name: 'Mozilla Fake App 1 - 1'
          },
          'fakeapp1-2': {
            launch_path: '/fakeapp1-2/index.html',
            name: 'Mozilla Fake App 1 - 2'
          }
        },
        name: 'Mozilla Fake App 1'
      },
      manifestURL: 'http://fakeapp1/manifest.webapp'
    },{
      manifest: {
        launch_path: '/fakeapp2/index.html',
        name: 'Mozilla Fake App 2'
      },
      manifestURL: 'http://fakeapp2/manifest.webapp'
    },{
      manifest: {
        launch_path: '/fakeapp3/index.html',
        name: 'Mooilla Fake App 3'
      }
    }];
    _blValue = ['/fakeapp1-1/index.html'];

    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    navigator.mozApps.mApps = _apps;
    navigator.mozSettings.createLock().set({
      'app.launch_path.blacklist': _blValue
    });
  });

  suiteTeardown(function() {
    navigator.mozApps = realMozApps;
    navigator.mozSettings = realMozSettings;
  });



  suite('Blacklist', function() {

    var subject;

    setup(function(done) {
      requireApp('search/js/providers/local_apps.js', function() {
        subject = Search.providers.LocalApps;
        done();
      });
    });

    teardown(function() {
      MockNavigatormozApps.mTeardown();
    });

    test('CreateBlacklist returns correct blacklist', function(done) {
      subject.createBlacklist().then(() => {
        assert.equal(subject.blacklist, _blValue);
        done();
      });
    });

  });

  suite('Search', function() {

    var subject;

    setup(function(done) {
      requireApp('search/js/providers/local_apps.js', function() {
        subject = Search.providers.LocalApps;
        subject.apps = _apps;
        subject.blacklist = _blValue;
        subject.createAppListing();
        done();
      });
    });

    teardown(function() {
      MockNavigatormozApps.mTeardown();
    });

    test('Search returns correct applications', function() {
      var results = subject.find('moz');
      assert.equal(results.length, 2);
    });

    test('Search returns correct applications', function() {
      var results = subject.find('mo');
      assert.equal(results.length, 3);
    });

  });

});
