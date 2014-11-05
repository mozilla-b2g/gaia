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
  var items;
  var realL10n;

  setup(function(done) {
    loadBodyHTML('/create.html');
    require('/js/suggestions.js', function() {
      subject = Suggestions;
      items = subject.el.children;
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

  test('shows \'custom\' option', function(done) {
    var suggest = subject.load([]);
    suggest.then();
    subject.resolve();

    setTimeout(function() {
      assert.equal(items[0].value, 'custom',
        'First item is expected to be \'custom\'');

      done();
    });
  });

  test('populates options from collections database', function(done) {
    var stubCategories = [
      {categoryId: 'cat1', query: 'Mocked Collections', locale: 'en_US'},
      {categoryId: 'cat2', query: 'Mozilla', locale: 'en_US'}
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

  test('l10n logic', function(done) {
    // set l10n items
    navigator.mozL10n.set('collection-categoryId-1', 'fromL10nFile');
    navigator.mozL10n.set('collection-categoryId-2', 'fromL10nFile');

    var stubCategories = [
      // will be found by l10n, and queries will be overwritten
      {categoryId: 1, query: 'query1', locale: 'en_US'},
      {categoryId: 2, query: 'query2', locale: 'fr'},

      // won't be found by l10n, will stay as is in list
      {categoryId: 3, query: 'query3', locale: 'en_US'},
      {categoryId: 4, query: 'query4', locale: 'en_UK'},

      // won't be found by l10n, won't show up in list because of wrong locale
      {categoryId: 5, query: 'query5', locale: 'fr'}
    ];

    var suggest = subject.load(stubCategories);
    suggest.then();
    subject.resolve();

    // Ensure we've populated a collection from our mock CollectionsDatabase
    setTimeout(function() {
      assert.equal(items[1].textContent, 'fromL10nFile',
        'categoryId-1 should have been overwritten by l10n');
      assert.equal(items[2].textContent, 'fromL10nFile',
        'categoryId-2 should have been overwritten by l10n');
      assert.equal(items[3].textContent, 'query3',
        'categoryId-3 should appear in the list as it is in the right locale '+
        'and stayed with the original query');
      assert.equal(items[4].textContent, 'query4',
        'categoryId-4 should appear in the list as it is in the right locale '+
        'and stayed with the original query');
      assert.isUndefined(items[5],
        'categoryId-5 should not appear in list as it is in the wrong locale '+
        'and has no l10n translation');

      done();
    });
  });

});
