'use strict';
/* global Search, MockNavigatormozApps */

require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
requireApp('search/test/unit/mock_search.js');
requireApp('search/js/providers/provider.js');
requireApp('search/js/providers/app_provider.js');

suite('search/providers/local_apps', function() {

  var realMozApps;

  suiteSetup(function() {
    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;
  });

  suiteTeardown(function() {
    navigator.mozApps = realMozApps;
  });

  var fakeElement, stubById, subject;

  setup(function(done) {
    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));
    requireApp('search/js/providers/local_apps.js', function() {
      subject = Search.providers.LocalApps;
      subject.init();
      done();
    });
  });

  teardown(function() {
    stubById.restore();
    MockNavigatormozApps.mTeardown();
  });

  suite('click', function() {
    test('launches the application', function() {
      var fakeManifestURL = 'http://mozilla.org/manifest.webapp';

      var launchCalled = false;
      subject.apps = {};
      subject.apps[fakeManifestURL] = {
        launch: function() {
          launchCalled = true;
        },
        manifest: {
          name: 'Mozilla Fake App',
          icons: {
            60: 'http://mozilla.org/favicon.ico'
          }
        }
      };

      subject.click({
        target: {
          dataset: {
            manifest: fakeManifestURL
          }
        }
      });
      assert.ok(launchCalled);
    });
  });

  suite('search', function() {
    test('clears results', function() {
      var stub = this.sinon.stub(subject, 'clear');
      subject.search('foo');
      assert.ok(stub.calledOnce);
    });

    test('application is rendered', function() {
      // Add app without icon
      subject.apps['http://app2.mozilla.org/manifest.webapp'] = {
        manifest: {
          name: 'Mozilla Without Icon'
        }
      };

      subject.search('moz');
      assert.notEqual(subject.container.innerHTML.indexOf('Mozilla Fake'), -1);
      assert.equal(subject.container.innerHTML.indexOf('Without Icon'), -1);
    });
  });

});
