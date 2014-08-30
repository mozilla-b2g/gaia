/* global requireApp, suite, suiteSetup, suiteTeardown, setup, teardown, test,
   assert, MockNavigatorDatastore, MockDatastore, browserCustomizer */

'use strict';

requireApp('operatorvariant/js/customizers/customizer.js');
requireApp('operatorvariant/js/customizers/browser_customizer.js');
require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/shared/js/bookmarks_database.js');

suite('BrowserCustomizer >', function() {
  var realDatastore = null,
      url = 'http://mozilla.org',
      name = 'mozilla',
      data = {
        browser: {
          bookmarks: [ {
            id: '0',
            uri: url,
            title: name
          }]
        }
      };

  suiteSetup(function() {
    realDatastore = navigator.getDataStores;
  });

  suiteTeardown(function() {
    navigator.getDataStores = realDatastore;
  });

  setup(function() {
    navigator.getDataStores = MockNavigatorDatastore.getDataStores;
  });

  teardown(function() {
    MockDatastore._inError = false;
    MockDatastore._records = Object.create(null);
  });

  test('First run with valid SIM. Set bookmarks.', function(done) {
    browserCustomizer.simPresentOnFirstBoot = true;
    var passcb = function(bookmark) {
      assert.equal(bookmark.name, data.title);
      assert.equal(bookmark.url, data.uri);
      assert.equal(bookmark.id, data.id);
      done();
    };
    var failcb = function(bookmark) {
      assert.ok(false, 'Bookmark Datastore failed to update!');
      done();
    };
    browserCustomizer.set(data, passcb, failcb);
  });
});
