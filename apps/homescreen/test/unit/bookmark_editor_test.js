'use strict';

requireApp('homescreen/test/unit/mock_save_bookmark.html.js');

requireApp('homescreen/js/grid_components.js');
requireApp('homescreen/js/bookmark.js');
requireApp('homescreen/js/bookmark_editor.js');

suite('bookmark.js >', function() {

  var wrapperNode;

  suiteSetup(function() {
    wrapperNode = document.createElement('section');
    wrapperNode.innerHTML = MockSaveBookmarkHtml;
    document.body.appendChild(wrapperNode);
  });

  suiteTeardown(function() {
    document.body.removeChild(wrapperNode);
  });

  suite('BookmarkEditor >', function() {

    suiteSetup(function() {
      BookmarkEditor.init({
        data: {
          name: 'Mozilla',
          url: 'http://www.mozilla.org/es-ES/firefox/new/'
        },
        onsaved: function() { },
        oncancelled: function() { }
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

  suite('Bookmark >', function() {

    var bookmark;
    var URL = 'http://www.mozilla.org/es-ES/firefox/new/';
    var icon = 'http://www.mozilla.org/images/icon.png';
    var name = 'Mozilla';

    suiteSetup(function() {
      bookmark = new Bookmark({
        bookmarkURL: URL,
        name: name,
        icon: icon,
        iconable: false,
        useAsyncPanZoom: true
      });
    });

    test('All bookmark objects should be defined as bookmarks >', function() {
      assert.equal(bookmark.type, GridItemsFactory.TYPE.BOOKMARK);
    });

    test('All bookmark objects are removable >', function() {
      assert.isTrue(bookmark.removable);
    });

    test('All bookmark objects define en-US as default locale >', function() {
      assert.equal(bookmark.manifest.default_locale, 'en-US');
    });

    test('This bookmark uses asyncPanZoom >', function() {
      assert.isTrue(bookmark.useAsyncPanZoom);
    });

    test('This bookmark is not iconable >', function() {
      assert.isFalse(bookmark.iconable);
    });

    test('This bookmark defines the url correctly >', function() {
      assert.equal(bookmark.origin, URL);
      assert.equal(bookmark.url, URL);
      assert.equal(bookmark.bookmarkURL, bookmark.generateIndex(URL));
    });

    test('This bookmark defines the icon correctly >', function() {
      assert.equal(bookmark.manifest.icons[60], icon);
    });

    test('This bookmark defines the title correctly >', function() {
      assert.equal(bookmark.manifest.name, name);
    });

  });
});
