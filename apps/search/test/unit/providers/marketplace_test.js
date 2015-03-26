'use strict';
/* global MocksHelper, Search */
/* global MockNavigatorSettings */
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_moz_activity.js');
require('/shared/test/unit/mocks/mock_l10n.js');

requireApp('search/test/unit/mock_search.js');
requireApp('search/js/providers/provider.js');
requireApp('search/js/providers/grid_provider.js');

// Required files for the grid and a marketplaceapp result
require('/shared/js/l10n.js');
require('/shared/elements/gaia_grid/js/grid_icon_renderer.js');
require('/shared/elements/gaia_grid/js/grid_layout.js');
require('/shared/elements/gaia_grid/js/grid_view.js');
require('/shared/elements/gaia_grid/script.js');
require('/shared/elements/gaia_grid/js/items/grid_item.js');
require('/shared/elements/gaia_grid/js/items/bookmark.js');
require('/shared/elements/gaia_grid/js/items/marketplace_app.js');

var mocksForMarketplaceProvider = new MocksHelper([
  'MozActivity'
]).init();

suite('search/providers/marketplace', function() {
  mocksForMarketplaceProvider.attachTestHelpers();

  var fakeElement, stubById, subject, realMozSettings;

  setup(function(done) {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    navigator.mozSettings.createLock().set({
      'search.marketplace.url': 'http://localhost'
    });

    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));
    requireApp('search/js/providers/marketplace.js', function() {
      subject = Search.providers.Marketplace;
      subject.init();
      done();
    });
  });

  teardown(function() {
    stubById.restore();
  });

  suite('mock response', function() {

    var marketplaceContent = [{
      'manifest_url': 'http://fakeapp1.mozilla.org/manifest.webapp',
      'name': 'FIRST Marketplace App',
      'icon': ''
    }, {
      'manifest_url': 'http://fakeapp2.mozilla.org/manifest.webapp',
      'name': 'SECOND Marketplace App',
      'icon': ''
    }];

    var requests = [];
    var xhr;

    setup(function() {
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = function(req) { requests.push(req); };
    });

    teardown(function() {
      xhr.restore();
    });

    test('renders all results', function(done) {
      subject.search('fake').then(results => {
        assert.equal(results.length, 2);
        done();
      });

      // setTimeout to ensure that the search microtask fires.
      setTimeout(function() {
        var req = requests[0];
        req.responseText = JSON.stringify(marketplaceContent);
        req.onload();
      });
    });
  });
});
