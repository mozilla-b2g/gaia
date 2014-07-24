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

  function initialize() {
    app.scrollable.style.height = '500px';
    app.scrollable.style.overflow = 'auto';
    app.grid.style.height = '1000px';
    app.grid.style.display = 'block';
  }

  setup(function(done) {
    raf = sinon.stub(window, 'requestAnimationFrame');
    loadBodyHTML('/index.html');
    var grid = document.querySelector('gaia-grid')._grid;
    // Some features are loaded after rendering like dragdrop
    grid.render();
    require('/js/app.js', function() {
      initialize();
      done();
    });
  });

  teardown(function() {
    raf.restore();
  });

  test('Scrolls on hashchange', function() {
    var previousScrollTop = app.scrollable.scrollTop = 100;
    window.dispatchEvent(new CustomEvent('hashchange'));

    assert.isTrue(previousScrollTop > app.scrollable.scrollTop);
    assert.isTrue(raf.called);
  });

  test('No scrolling while context menu is displayed', function() {
    window.dispatchEvent(new CustomEvent('context-menu-open'));
    window.dispatchEvent(new CustomEvent('hashchange'));
    assert.isFalse(raf.called);
    window.dispatchEvent(new CustomEvent('context-menu-close'));
  });

});
