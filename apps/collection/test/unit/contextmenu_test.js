'use strict';
/* global Contextmenu */
/* global BookmarksDatabase */

require('/shared/js/bookmarks_database.js');
require('/shared/js/l10n.js');
require('/js/contextmenu.js');

suite('contextmenu > ', function() {

  var menuStub = null,
      getIconStub = null,
      databaseStub = null,
      isBookmarked = false,
      url = 'www.mozilla.org',
      subject = null;

  suiteSetup(function() {
    loadBodyHTML('/view.html');
    var mockCollection = {
      isPinned: function() {}
    };
    databaseStub = sinon.stub(BookmarksDatabase, 'get', function() {
      return {
        then: function(resolve) {
          resolve(isBookmarked);
          return {
            then: function(resolve) {
              resolve();
            }
          };
        }
      };
    });
    subject = new Contextmenu(mockCollection);
    getIconStub = sinon.stub(subject.grid, 'getIcon', function() {
      return {
        detail: {
          url: url
        }
      };
    });
  });

  suiteTeardown(function() {
    databaseStub.restore();
    getIconStub.restore();
  });

  setup(function() {
    menuStub = this.sinon.stub(subject.menu, 'show');
  });

  teardown(function() {
    menuStub.restore();
  });

  var simulateContextMenu = function(elem) {
    var ev = document.createEvent('MouseEvents');
    ev.initMouseEvent('contextmenu', true, false, window, 0, 0, 0, 0, 0,
                      false, false, false, false, 2, null);
    elem.dispatchEvent(ev);
  };

  test('clicking an icon not bookmarked', function() {
    var icon = document.createElement('div');
    icon.dataset.identifier = 'hi';
    subject.grid.appendChild(icon);

    simulateContextMenu(icon);

    assert.ok(menuStub.calledOnce);
    assert.isFalse(subject.bookmarkButton.hidden);
  });

  test('clicking an icon already bookmarked', function() {
    var icon = document.createElement('div');
    icon.dataset.identifier = 'hi';
    subject.grid.appendChild(icon);

    isBookmarked = true;
    simulateContextMenu(icon);

    assert.ok(menuStub.calledOnce);
    assert.isTrue(subject.bookmarkButton.hidden);
  });

  test('clicking an empty space', function() {
    simulateContextMenu(subject.grid);

    assert.isFalse(menuStub.called);
  });

});
