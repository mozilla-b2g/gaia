'use strict';

require('/shared/test/unit/mocks/mock_moz_activity.js');

requireApp('search/test/unit/mock_search.js');
requireApp('search/js/providers/provider.js');
requireApp('search/js/providers/app_provider.js');

var mocksForMarketplaceProvider = new MocksHelper([
  'MozActivity'
]).init();

suite('search/providers/marketplace', function() {
  mocksForMarketplaceProvider.attachTestHelpers();

  var fakeElement, stubById, subject;

  setup(function(done) {
    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));
    requireApp('search/js/providers/marketplace.js', function() {
      subject = Search.providers.Marketplace;
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

});
