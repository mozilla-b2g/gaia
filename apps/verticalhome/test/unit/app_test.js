'use strict';
/* global app */
/* global MocksHelper, loadBodyHTML */

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/elements/gaia_grid/js/grid_dragdrop.js');
require('/shared/elements/gaia_grid/js/grid_layout.js');
require('/shared/elements/gaia_grid/js/grid_view.js');
require('/shared/elements/gaia_grid/js/grid_zoom.js');
require('/shared/elements/gaia_grid/js/items/grid_item.js');
require('/shared/elements/gaia_grid/js/items/placeholder.js');
require('/shared/elements/gaia_grid/script.js');
require('/test/unit/mock_item_store.js');

var mocksHelperForApp = new MocksHelper([
  'ItemStore'
]).init();

suite('app.js > ', function() {

  mocksHelperForApp.attachTestHelpers();

  function initialize() {
    app.scrollable.style.height = '500px';
    app.scrollable.style.overflow = 'auto';
    app.grid.style.height = '1000px';
    app.grid.style.display = 'block';
  }

  setup(function(done) {
    loadBodyHTML('/index.html');
    require('/js/app.js', function() {
      initialize();
      done();
    });
  });

  test('Scrolls on hashchange', function() {
    var previousScrollTop = app.scrollable.scrollTop = 100;
    var raf = sinon.stub(window, 'requestAnimationFrame');
    window.dispatchEvent(new CustomEvent('hashchange'));

    assert.isTrue(previousScrollTop > app.scrollable.scrollTop);
    assert.ok(raf.called);
  });

});
