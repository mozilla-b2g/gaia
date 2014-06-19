'use strict';
/* global MockApp, App, GaiaGrid, MocksHelper, loadBodyHTML, BookmarkSource */

require('/shared/js/bookmarks_database.js');

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/elements/gaia_grid/js/grid_dragdrop.js');
require('/shared/elements/gaia_grid/js/grid_icon_renderer.js');
require('/shared/elements/gaia_grid/js/grid_layout.js');
require('/shared/elements/gaia_grid/js/grid_view.js');
require('/shared/elements/gaia_grid/script.js');
require('/shared/elements/gaia_grid/js/items/grid_item.js');
require('/shared/elements/gaia_grid/js/items/bookmark.js');
require('/js/sources/bookmark.js');

require('/test/unit/mock_app.js');

var mocksHelperForBookmark = new MocksHelper([
  'App'
]).init();

suite('bookmark.js > ', function() {

  mocksHelperForBookmark.attachTestHelpers();

  var subject = null;

  suiteSetup(function() {
    window.app = new App();
    loadBodyHTML('/index.html');
    subject = new BookmarkSource();
  });

  teardown(function() {
    MockApp.mIcons = {};
  });

  test('synchronize and remove bookmark', function(done) {
    var expectedURL = 'http://www.as.com';

    MockApp.mIcons[expectedURL] = new GaiaGrid.Bookmark({
      url: expectedURL
    });

    var removeStub = this.sinon.stub(subject, 'removeIconFromGrid',
      function(url) {
        assert.equal(url, expectedURL);
        removeStub.restore();
        done();
      }
    );

    subject.synchronize();
  });

});
