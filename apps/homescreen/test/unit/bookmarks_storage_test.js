'use strict';

require('/shared/js/async_storage.js');
requireApp('homescreen/js/bookmarks_storage.js');

suite('bookmarks_storage.js >', function() {

  var bookmark1 = {
    name: 'bookmark1',
    url: 'http://www.mozilla.org'
  };

  var bookmark2 = {
    name: 'bookmark2',
    url: 'http://www.telefonica.es'
  };

  var index = 'installed_bookmarks_while_homescreen_was_not_running',
      bookmarks = [],
      getItemStub = null;

  suiteSetup(function() {
    getItemStub = sinon.stub(asyncStorage, 'getItem', function(key, cb) {
      cb(bookmarks);
    });
  });

  suiteTeardown(function() {
    getItemStub.restore();
  });

  teardown(function() {
    bookmarks = [];
  });

  test('getAll method >', function(done) {
    BookmarksStorage.getAll(function(list) {
      assert.equal(list.length, 0);

      bookmarks = [bookmark1, bookmark2];
      BookmarksStorage.getAll(function(list) {
        assert.equal(list.length, 2);
        assert.equal(list[0], bookmark1);
        assert.equal(list[1], bookmark2);
        done();
      });
    });
  });

  test('add method >', function(done) {
    var setItemStub = sinon.stub(asyncStorage, 'setItem', function(key, list) {
      assert.equal(key, index);
      assert.equal(list.length, 1);
      assert.equal(list[0], bookmark1);
      setItemStub.restore();
      done();
    });

    BookmarksStorage.add(bookmark1);
  });

  test('clear method >', function(done) {
    var removeItemStub = sinon.stub(asyncStorage, 'removeItem', function(key) {
      assert.equal(key, index);
      removeItemStub.restore();
      done();
    });

    BookmarksStorage.clear();
  });

});
