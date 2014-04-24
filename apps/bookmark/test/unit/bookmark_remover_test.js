'use strict';

/* global BookmarkRemover, loadBodyHTML, BookmarksDatabase */
/* global requireApp, require, suite, suiteTeardown, suiteSetup, test, assert,
          sinon, teardown, setup */

require('/shared/js/bookmarks_database.js');
require('/shared/test/unit/load_body_html_helper.js');
requireApp('bookmark/js/bookmark_remover.js');
requireApp('bookmark/test/unit/mock_l10n.js');

suite('bookmark_remover.js >', function() {

  var getStub;

  var name = 'Mozilla';
  var url = 'http://www.mozilla.org/es-ES/firefox/new/';

  var bookmark = {
    name: name,
    url: url
  };

  var databaseInError = false;

  suiteSetup(function() {
    getStub = sinon.stub(BookmarksDatabase, 'get', function(purl) {
      return {
        then: function(resolve, refect) {
          databaseInError ? refect('refected') :
                            resolve (purl === url ? bookmark : null);
        }
      };
    });
  });

  suiteTeardown(function() {
    getStub.restore();
  });

  setup(function() {
    loadBodyHTML('/remove.html');
  });

  teardown(function() {
    document.body.innerHTML = '';
    databaseInError = false;
  });

  test('UI initialized correctly >', function() {
    BookmarkRemover.init({
      id: bookmark.url
    });
    assert.isTrue(document.getElementById('title').textContent.contains(name));
    assert.isTrue(document.getElementById('message').textContent.
                                                            contains(name));
  });

  test('Bookmark does not exist >', function(done) {
    BookmarkRemover.init({
      id: bookmark.url + 'blabla',
      oncancelled: function(e) {
        assert.equal(e, 'bookmark does not exist');
        done();
      }
    });
  });

  test('Getting bookmark failed >', function(done) {
    databaseInError = true;
    BookmarkRemover.init({
      id: bookmark.url,
      oncancelled: function(e) {
        assert.equal(e, 'refected');
        done();
      }
    });
  });

  test('User cancels >', function(done) {
    BookmarkRemover.init({
      id: bookmark.url,
      oncancelled: function(e) {
        assert.equal(e, 'cancelled');
        done();
      }
    });

    document.getElementById('cancel-action').click();
  });

  test('User confirms and bookmark is removed >', function(done) {
    var stub = sinon.stub(BookmarksDatabase, 'remove', function(id) {
      assert.equal(id, bookmark.url);
      return {
        then: function(resolve) {
          resolve();
        }
      };
    });

    BookmarkRemover.init({
      id: bookmark.url,
      onremoved: function() {
        stub.restore();
        done();
      }
    });

    document.getElementById('remove-action').click();
  });

  test('User confirms but it fails >', function(done) {
    var stub = sinon.stub(BookmarksDatabase, 'remove', function(id) {
      assert.equal(id, bookmark.url);
      return {
        then: function(resolve, reject) {
          reject('failed');
        }
      };
    });

    BookmarkRemover.init({
      id: bookmark.url,
      oncancelled: function(e) {
        assert.equal(e, 'failed');
        stub.restore();
        done();
      }
    });

    document.getElementById('remove-action').click();
  });

});
