'use strict';
/* global MocksHelper, Search */

requireApp('search/test/unit/mock_search.js');
requireApp('search/js/providers/provider.js');
require('/shared/js/metrics_helper.js');
requireApp('search/test/unit/mock_provider.js');
require('/shared/test/unit/mocks/mock_search_provider.js');

var mocksForSuggestionsProvider = new MocksHelper([
  'SearchProvider'
]).init();

suite('search/providers/suggestions', function() {
  mocksForSuggestionsProvider.attachTestHelpers();
  var subject;
  requireApp('search/js/providers/suggestions.js', function(done) {
    subject = Search.providers.Suggestions;
    subject.init();
    done();
  });

  suite('click', function() {
    test('should report to metrics', function() {
      var stub = this.sinon.stub(window.MetricsHelper.prototype, 'report');
      subject.click({
        target: {
          dataset: {
            suggestions: 'mozilla'
          }
        }
      });
      assert.ok(stub.calledWith('websearch', 'testProvider'));
    });
  });
});

