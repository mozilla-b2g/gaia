'use strict';
/* global Search, MockNavigatormozApps */

require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
requireApp('search/test/unit/mock_search.js');
requireApp('search/js/providers/provider.js');
requireApp('search/js/providers/grid_provider.js');

// Required files for the grid and a mozapp result
require('/shared/js/l10n.js');
require('/shared/elements/gaia_grid/js/grid_icon_renderer.js');
require('/shared/elements/gaia_grid/js/grid_layout.js');
require('/shared/elements/gaia_grid/js/grid_view.js');
require('/shared/elements/gaia_grid/script.js');
require('/shared/elements/gaia_grid/js/items/grid_item.js');
require('/shared/elements/gaia_grid/js/items/mozapp.js');

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

  suite('search', function() {

    test('Search returns correct applications', function(done) {

      subject.apps = {
        'http://app2.mozilla.org/manifest.webapp': {
          manifest: {
            name: 'Mozilla Without Icon'
          }
        },
        'http://fakeapp/manifest.webapp': {
          manifest: {
            name: 'Doesnt Match'
          }
        }
      };

      subject.search('moz').then(results => {
        assert.equal(results.length, 1);
        done();
      });

    });
  });

});
