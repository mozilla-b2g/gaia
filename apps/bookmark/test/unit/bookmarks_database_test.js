'use strict';

/* global BookmarksDatabase, MockDatastore, MockNavigatorDatastore */
/* global require, suite, suiteTeardown, suiteSetup, test, assert, teardown */

require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/shared/js/bookmarks_database.js');

suite('bookmarks_database.js >', function() {

  var realDatastore = null,
      url = 'http://mozilla.org',
      name = 'mozilla',
      data = {
        bookmarkURL: url,
        name: name
      };

  suiteSetup(function() {
    realDatastore = navigator.getDataStores;
    navigator.getDataStores = MockNavigatorDatastore.getDataStores;
  });

  suiteTeardown(function() {
    navigator.getDataStores = realDatastore;
  });

  teardown(function() {
    MockDatastore._inError = false;
    MockDatastore._records = Object.create(null);
  });

  function assertEvent(type, event) {
    assert.equal(event.type, type);
    assert.equal(event.target.id, url);
    assert.equal(event.target.bookmarkURL, url);
    assert.equal(event.target.name, name);
  }

  test('calling to add method - added >', function(done) {
    BookmarksDatabase.add(data).then(function(value) {
      assert.isTrue(value);
      done();
    });
  });

  test('calling to add method - updated >', function(done) {
    var expectedName = name + 'corporation';

    BookmarksDatabase.add(data).then(function(value) {
      assert.isTrue(value);
      BookmarksDatabase.add({
        bookmarkURL: url,
        name: expectedName
      }).then(function(value) {
        assert.isUndefined(value);
        done();
      });
    });
  });

  test('calling to add method - failed >', function(done) {
    MockDatastore._inError = true;
    BookmarksDatabase.add(data).then(function() {
      // Do nothing here
    }, function() {
      done();
    });
  });

  test('calling to get method - OK >', function(done) {
    BookmarksDatabase.add(data).then(function() {
      BookmarksDatabase.get(url).then(function(bookmark) {
        assert.equal(bookmark.name, name);
        assert.equal(bookmark.bookmarkURL, url);
        assert.equal(bookmark.id, url);
        done();
      });
    });
  });

  test('calling to get method - failed >', function(done) {
    MockDatastore._inError = true;
    BookmarksDatabase.get('www.telefonica.es').then(function() {
      // Do nothing here
    }, function() {
      done();
    });
  });

  test('calling to getAll method - OK >', function(done) {
    MockDatastore.sync = function() {
      var cursor = {
        next: function() {
          cursor.next = function() {
            return new window.Promise(function(resolve, reject) {
              resolve({
                operation: 'done'
              });
            });
          };
          return new window.Promise(function(resolve, reject) {
            resolve({
              operation: 'add',
              data: {
                id: url,
                bookmarkURL: url,
                name: name
              }
            });
          });
        }
      };

      return cursor;
    };

    BookmarksDatabase.getAll().then(function(bookmarks) {
      assert.equal(Object.keys(bookmarks).length, 1);
      assert.equal(bookmarks[url].name, name);
      assert.equal(bookmarks[url].id, url);
      assert.equal(bookmarks[url].bookmarkURL, url);
      done();
    });
  });

  test('calling to getAll method - failed >', function(done) {
    MockDatastore.sync = function() {
      var cursor = {
        next: function() {
          return new window.Promise(function(resolve, reject) {
            reject();
          });
        }
      };

      return cursor;
    };

    BookmarksDatabase.getAll().then(function(bookmarks) {
      // Do nothing
    }, function() {
      done();
    });
  });

  test('testing addEventListener for "added" event >', function(done) {
    BookmarksDatabase.addEventListener('added', function onAdded(event) {
      BookmarksDatabase.removeEventListener('added', onAdded);
      assertEvent('added', event);
      done();
    });

    BookmarksDatabase.add(data);
  });

  test('testing addEventListener for "updated" event >', function(done) {
    BookmarksDatabase.addEventListener('updated', function onUpdated(event) {
      BookmarksDatabase.removeEventListener('updated', onUpdated);
      assertEvent('updated', event);
      done();
    });

    BookmarksDatabase.add(data).then(function onAdded() {
      BookmarksDatabase.add(data);
    });
  });

  test('testing removeEventListener >', function(done) {
    var onAdded = function() {
      done(new Error('The "added" listener should NOT be called!!!'));
    };

    BookmarksDatabase.addEventListener('added', onAdded);
    BookmarksDatabase.removeEventListener('added', onAdded);

    BookmarksDatabase.add(data).then(function() {
      done();
    });
  });

});
