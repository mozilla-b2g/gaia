'use strict';
/* global app */
/* global MocksHelper, loadBodyHTML */

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
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
  'ItemStore',
  'SettingsListener'
]).init();

suite('app.js > ', function() {

  mocksHelperForApp.attachTestHelpers();

  var raf, scrollStub;

  setup(function(done) {
    raf = sinon.stub(window, 'requestAnimationFrame',
                     function(callback) { callback(); });
    scrollStub = sinon.stub(window, 'scrollTo');
    loadBodyHTML('/index.html');
    var grid = document.querySelector('gaia-grid')._grid;
    // Some features are loaded after rendering like dragdrop
    grid.render();
    require('/js/app.js', done);
    this.sinon.useFakeTimers();
  });

  teardown(function() {
    raf.restore();
    scrollStub.restore();
  });

  test('Scrolls on hashchange', function() {
    window.scrollY = 100000;
    window.dispatchEvent(new CustomEvent('hashchange'));

    assert.ok(scrollStub.called);
  });

  test('Scrolls on gaiagrid-attention', function() {
    window.scrollY = 100000;
    app.grid.dispatchEvent(
      new CustomEvent('gaiagrid-attention', {detail: {y: 0, height: 0}}));
    assert.ok(scrollStub.called);
  });

  test('No scrolling while context menu is displayed', function() {
    window.dispatchEvent(new CustomEvent('context-menu-open'));
    window.dispatchEvent(new CustomEvent('hashchange'));
    assert.isFalse(raf.called);
    window.dispatchEvent(new CustomEvent('context-menu-close'));
  });

  test('Transition property in edit-mode', function() {
    app.grid.dispatchEvent(new CustomEvent('editmode-start'));
    assert.equal(app.grid.style.transition, app.EDIT_MODE_TRANSITION_STYLE);

    app.grid.dispatchEvent(new CustomEvent('editmode-end'));
    assert.equal(app.grid.style.transition, '');
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
