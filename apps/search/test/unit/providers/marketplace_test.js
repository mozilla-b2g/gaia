'use strict';
/* global MocksHelper, MockL10n, Search */

require('/shared/test/unit/mocks/mock_moz_activity.js');
requireApp('search/test/unit/mock_l10n.js');

requireApp('search/test/unit/mock_search.js');
requireApp('search/js/providers/provider.js');
requireApp('search/js/providers/grid_provider.js');

var mocksForMarketplaceProvider = new MocksHelper([
  'MozActivity'
]).init();

suite('search/providers/marketplace', function() {
  mocksForMarketplaceProvider.attachTestHelpers();

  var fakeElement, stubById, subject, realL10n;

  suiteSetup(function() {
    window.MarketPlaceApp = function() {};
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    delete window.MarketPlaceApp;
    navigator.mozL10n = realL10n;
  });

  setup(function(done) {
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
      subject.search('fake', function(results) {
        assert.equal(results.length, 2);
        done();
      });
      var req = requests[0];
      req.responseText = JSON.stringify(marketplaceContent);
      req.onload();
    });
  });
});
