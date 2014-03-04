'use strict';
/* global MocksHelper, MockL10n, MockMozActivity, Search */

require('/shared/test/unit/mocks/mock_moz_activity.js');
requireApp('search/test/unit/mock_l10n.js');

requireApp('search/test/unit/mock_search.js');
requireApp('search/js/providers/provider.js');

var mocksForMarketplaceProvider = new MocksHelper([
  'MozActivity'
]).init();

suite('search/providers/marketplace', function() {
  mocksForMarketplaceProvider.attachTestHelpers();

  var fakeElement, stubById, subject, realL10n;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
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

  suite('click', function() {
    test('creates an activity to the slug', function() {
      subject.click({
        target: {
          dataset: {
            slug: 'gaia'
          }
        }
      });
      var activityInfo = MockMozActivity.calls[0];
      assert.equal(activityInfo.name, 'marketplace-app');
      assert.equal(activityInfo.data.slug, 'gaia');
    });
  });

  suite('search', function() {
    test('clears results', function() {
      var stub = this.sinon.stub(subject, 'clear');
      subject.search();
      assert.ok(stub.calledOnce);
    });
  });

  suite('mock response', function() {

    var marketplaceContent = {
      meta: {
        total_count: 2
      },
      objects: [
        {
          'manifest_url': 'http://fakeapp1.mozilla.org/manifest.webapp',
          'name': {
            'en-us': 'FIRST Marketplace App'
          },
          'icons': {}
        },
        {
          'manifest_url': 'http://fakeapp2.mozilla.org/manifest.webapp',
          'name': {
            'en-us': 'SECOND Marketplace App'
          },
          'icons': {}
        }
      ]
    };

    var requests = [];

    setup(function() {
      var xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = function(req) { requests.push(req); };
    });

    test('renders all results', function() {
      subject.search('fake', Search.collect.bind(Search, subject));
      var req = requests[0];
      req.responseText = JSON.stringify(marketplaceContent);
      req.onload();
      assert.equal(subject.container.querySelectorAll('.result').length, 2);
    });
  });
});
