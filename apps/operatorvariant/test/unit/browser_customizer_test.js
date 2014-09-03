/* global MockNavigatorDatastore, MockDatastore,
   browserCustomizer, BookmarksDatabase */

'use strict';

requireApp('operatorvariant/js/customizers/customizer.js');
requireApp('operatorvariant/js/customizers/browser_customizer.js');
require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/shared/js/bookmarks_database.js');

suite('BrowserCustomizer >', function() {
  var realDatastore = null,
      bookmarkDBSpy = null,
      url = 'http://mozilla.org',
      name = 'mozilla',
      data = {
        bookmarks: [ {
          id: '0',
          uri: url,
          title: name
        }]
      };

  suiteSetup(function() {
    bookmarkDBSpy = sinon.spy(BookmarksDatabase, 'add');
    navigator.getDataStores = MockNavigatorDatastore.getDataStores;
  });

  suiteTeardown(function() {
    navigator.getDataStores = realDatastore;
    bookmarkDBSpy.restore();
  });

  setup(function() {
    bookmarkDBSpy.reset();
  });

  teardown(function() {
    MockDatastore._inError = false;
    MockDatastore._records = Object.create(null);
  });

  test('First run with valid SIM. Set bookmarks.', function() {
    browserCustomizer.simPresentOnFirstBoot = true;
    browserCustomizer.set(data);
    assert.deepEqual(bookmarkDBSpy.args[0][0], {
      type: 'url',
      name: name,
      url: url,
      icon: undefined
    }, 'Arguments not equal');
  });
});
