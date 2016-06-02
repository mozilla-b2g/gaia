'use strict';

/* global BookmarksDatabase, MockDatastore, MockNavigatorDatastore */
/* global require, suite, suiteTeardown, suiteSetup, test, assert, teardown,
          setup */

require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/shared/js/bookmarks_database.js');

suite('bookmarks_database.js >', function() {

  var realDatastore = null,
      url = 'http://mozilla.org',
      name = 'mozilla',
      data = {
        url: url,
        name: name
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

  function assertEvent(type, event) {
    assert.equal(event.type, type);
    assert.equal(event.target.id, url);
    assert.equal(event.target.url, url);
    assert.equal(event.target.name, name);
  }

  test('testing not getDataStores defined >', function(done) {
    navigator.getDataStores = undefined;
    BookmarksDatabase.getRevisionId().then(function(id) {
      // Do noting
    }, function(e) {
      assert.equal(e.name, 'NO_DATASTORE');
      done();
    });
  });

  test('testing no access to datastore >', function(done) {
    navigator.getDataStores = function() {
      return {
        then: function(resolve, reject) {
          resolve({
            length: 0
          });
        }
      };
    };
    
    BookmarksDatabase.getRevisionId().then(function(id) {
      // Do noting
    }, function(e) {
      assert.equal(e.name, 'NO_ACCESS_TO_DATASTORE');
      done();
    });
  });

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
        url: url,
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

  test('calling to put method - OK >', function(done) {
    var id = url;
    var expectedName = 'Telefonica';
    var expectedURL = 'http://www.telefonica.es';

    MockDatastore._records[id] = {
      id: id,
      url: url,
      name: name
    };
    
    BookmarksDatabase.put({
      id: id,
      url: expectedURL,
      name: expectedName
    }).then(function onSuccess() {
      BookmarksDatabase.get(id).then(function(bookmark) {
        assert.equal(bookmark.name, expectedName);
        assert.equal(bookmark.url, expectedURL);
        assert.equal(bookmark.id, id);
        done();
      });
    });
  });

  test('calling to put method - failed >', function(done) {
    MockDatastore._inError = true;
    BookmarksDatabase.put(data).then(function() {
      // Do nothing here
    }, function() {
      done();
    });
  });

  test('calling to remove method - OK >', function(done) {
    var id = url;

    MockDatastore._records[id] = {
      id: id,
      url: url,
      name: name
    };
    
    BookmarksDatabase.remove(id).then(function(bookmark) {
      assert.equal(Object.keys(MockDatastore._records).length, 0);
      done();
    });
  });

  test('calling to remove method - failed >', function(done) {
    MockDatastore._inError = true;
    BookmarksDatabase.remove(url).then(function() {
      // Do nothing here
    }, function() {
      done();
    });
  });

  test('calling to get method - OK >', function(done) {
    BookmarksDatabase.add(data).then(function() {
      BookmarksDatabase.get(url).then(function(bookmark) {
        assert.equal(bookmark.name, name);
        assert.equal(bookmark.url, url);
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

  test('calling to getRevisionId method - OK >', function(done) {
    BookmarksDatabase.getRevisionId().then(function(id) {
      assert.equal(id, MockDatastore.revisionId);
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
                url: url,
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
      assert.equal(bookmarks[url].url, url);
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

  test('testing addEventListener for context >', function(done) {
    var myObject = {
      handleEvent: function(event) {
        BookmarksDatabase.removeEventListener('added', myObject);
        assert.equal(this, myObject);
        assertEvent('added', event);
        done();
      }
    };

    BookmarksDatabase.addEventListener('added', myObject);
    BookmarksDatabase.add(data);
  });

  test('testing addEventListener for "updated" event >', function(done) {
    // Testing handleEvent instead of a callback directly
    var handler = {
      handleEvent: function(event) {
        BookmarksDatabase.removeEventListener('updated', handler);
        assertEvent('updated', event);
        done();
      }
    };

    BookmarksDatabase.addEventListener('updated', handler);
    BookmarksDatabase.add(data).then(function onAdded() {
      BookmarksDatabase.add(data);
    });
  });

  test('testing removeEventListener >', function(done) {
    var onAdded = function() {
      done(new Error('The "added" listener should NOT be called!!!'));
    };

    BookmarksDatabase.addEventListener('added', onAdded);
    var ret = BookmarksDatabase.removeEventListener('added', onAdded);
    assert.isTrue(ret);

    BookmarksDatabase.add(data).then(function() {
      done();
    });
  });

  test('testing removeEventListener unknown type >', function() {
    assert.isFalse(BookmarksDatabase.removeEventListener('dog', function() {
      // Do nothing...
    }));
  });

  test('testing removeEventListener unknown callback >', function() {
    assert.isFalse(BookmarksDatabase.removeEventListener('added', function() {
      // Do nothing...
    }));
  });

});
