'use strict';

/* global MockSaveBookmarkHtml, BookmarkEditor */
/* global requireApp, require, suite, suiteTeardown, suiteSetup, test, assert */

requireApp('bookmark/test/unit/mock_save_bookmark.html.js');

requireApp('bookmark/js/bookmark_editor.js');
require('/shared/js/url_helper.js');

suite('bookmark_editor.js >', function() {

  var wrapperNode;

  suiteSetup(function() {
    wrapperNode = document.createElement('section');
    wrapperNode.innerHTML = MockSaveBookmarkHtml;
    document.body.appendChild(wrapperNode);
  });

  suiteTeardown(function() {
    document.body.removeChild(wrapperNode);
  });

  function noop() {
    // Do nothing
  }

  suite('UI initialized correctly >', function() {

    suiteSetup(function() {
      BookmarkEditor.init({
        data: {
          name: 'Mozilla',
          url: 'http://www.mozilla.org/es-ES/firefox/new/'
        },
        oncancelled: noop
      });
    });

    test('The title has to be defined from options.data.name >', function() {
      assert.equal(document.getElementById('bookmark-title').value,
                   'Mozilla');
    });

    test('The URL has to be defined from options.data.url >', function() {
      assert.equal(document.getElementById('bookmark-url').value,
                   'http://www.mozilla.org/es-ES/firefox/new/');
    });

  });

  suite('Invalid URL >', function() {

    suiteSetup(function() {
      BookmarkEditor.init({
        data: {
          name: 'Mozilla',
          url: 'justAString'
        },
        oncancelled: noop
      });
    });

    test('Bookmarks with invalid URL should not be saved >', function() {
      assert.isTrue(BookmarkEditor.addButton.disabled,
                'Invalid URL, add button should be disabled');
    });

    test('Check save button typing address ', function() {
      BookmarkEditor.bookmarkUrl.value = 'http://www.tid.es';
      BookmarkEditor.bookmarkUrl.dispatchEvent(new CustomEvent('input'));
      assert.isFalse(BookmarkEditor.addButton.disabled);

      BookmarkEditor.bookmarkUrl.value = '';
      BookmarkEditor.bookmarkUrl.dispatchEvent(new CustomEvent('input'));
      assert.isTrue(BookmarkEditor.addButton.disabled);

      BookmarkEditor.bookmarkUrl.value = 'http://www.telefonica.es';
      BookmarkEditor.bookmarkUrl.dispatchEvent(new CustomEvent('input'));
      assert.isFalse(BookmarkEditor.addButton.disabled);
    });

  });

  suite('Non-HTTP(S) URL >', function() {

    suiteSetup(function() {
      BookmarkEditor.init({
        data: {
          name: 'Mozilla',
          url: 'rtsp://whatever.com'
        },
        oncancelled: noop
      });
    });

    test('Bookmarks with non-HTTP(S) URLs should be saved >', function() {
      assert.isFalse(BookmarkEditor.addButton.disabled,
                     'Non-HTTP(S) URLs is ok, add button should be enabled');
    });

  });

});
