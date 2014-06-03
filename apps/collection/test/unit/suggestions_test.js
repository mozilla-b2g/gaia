'use strict';
/* global MockL10n */
/* global Suggestions */

require('/shared/test/unit/mocks/mock_collections_database.js');
requireApp('collection/test/unit/mock_l10n.js');

var mocksForSuggestions = new MocksHelper([
  'CollectionsDatabase'
]).init();

suite('suggestions > ', function() {
  mocksForSuggestions.attachTestHelpers();

  var subject;
  var realL10n;

  setup(function(done) {
    loadBodyHTML('/create.html');
    require('/js/suggestions.js', function() {
      subject = Suggestions;
      done();
    });
  });

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  test('populates options from collections database', function(done) {
    var stubCategories = [
      {categoryId: 'cat1', query: 'Mocked Collections'},
      {categoryId: 'cat2', query: 'Mozilla'}
    ];

    var suggest = subject.load(stubCategories);
    suggest.then();
    subject.resolve();

    // Ensure we've populated a collection from our mock CollectionsDatabase
    setTimeout(function() {
      var html = subject.el.innerHTML;
      assert.ok(html.indexOf('Mocked Collections') !== -1);
      done();
    });
  });

});
