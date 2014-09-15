'use strict';
/* global app */
/* global MocksHelper, loadBodyHTML */

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/elements/gaia_grid/js/grid_dragdrop.js');
require('/shared/elements/gaia_grid/js/grid_icon_renderer.js');
require('/shared/elements/gaia_grid/js/grid_layout.js');
require('/shared/elements/gaia_grid/js/grid_view.js');
require('/shared/elements/gaia_grid/script.js');
require('/shared/elements/gaia_grid/js/items/grid_item.js');
require('/shared/elements/gaia_grid/js/items/divider.js');
require('/shared/elements/gaia_grid/js/items/placeholder.js');
require('/test/unit/mock_item_store.js');

var mocksHelperForApp = new MocksHelper([
  'LazyLoader',
  'ItemStore'
]).init();

suite('app.js > ', function() {

  mocksHelperForApp.attachTestHelpers();

  var raf;

  setup(function(done) {
    raf = sinon.stub(window, 'requestAnimationFrame');
    loadBodyHTML('/index.html');
    var grid = document.querySelector('gaia-grid')._grid;
    // Some features are loaded after rendering like dragdrop
    grid.render();
    require('/js/app.js', done);
  });

  teardown(function() {
    raf.restore();
  });

  test('Scrolls on hashchange', function() {
    window.scrollY = 100000;
    var scrollStub = sinon.stub(window, 'scrollTo');
    window.dispatchEvent(new CustomEvent('hashchange'));

    assert.ok(scrollStub.called);
  });

  test('No scrolling while context menu is displayed', function() {
    window.dispatchEvent(new CustomEvent('context-menu-open'));
    window.dispatchEvent(new CustomEvent('hashchange'));
    assert.isFalse(raf.called);
    window.dispatchEvent(new CustomEvent('context-menu-close'));
  });

  test('Hashchange event without dragdrop', function() {
    var oldDragdrop = app.grid._grid.dragdrop;
    app.grid._grid.dragdrop = undefined;
    app.handleEvent({type: 'hashchange'});
    app.grid._grid.dragdrop = oldDragdrop;
    // This test was added for bug 1051061. If the test passes it means that
    // the test did not throw an error and that bug is not a problem.
    // No assertion is needed.
  });

});
