'use strict';
/* global app */
/* global MocksHelper */

requireApp('home2/shared/elements/gaia_grid/js/grid_dragdrop.js');
requireApp('home2/shared/elements/gaia_grid/js/grid_layout.js');
requireApp('home2/shared/elements/gaia_grid/js/grid_view.js');
requireApp('home2/shared/elements/gaia_grid/js/grid_zoom.js');
requireApp('home2/shared/elements/gaia_grid/script.js');
requireApp('home2/test/unit/mock_grid.js');
requireApp('home2/test/unit/mock_item_store.js');

var mocksHelperForApp = new MocksHelper([
  'ItemStore'
]).init();

suite('app.js > ', function() {

  mocksHelperForApp.attachTestHelpers();

  setup(function(done) {
    document.body.innerHTML = '<gaia-grid id="icons" dragdrop></gaia-grid>';
    requireApp('home2/js/app.js', function() {
      assert.ok(app.homescreenFocused);
      done();
    });
  });

  test('Scrolls on hashchange', function() {
    window.scrollY = 100000;
    var raf = sinon.stub(window, 'requestAnimationFrame');
    var scrollBy = sinon.stub(window, 'scrollBy');
    window.dispatchEvent(new CustomEvent('hashchange'));

    assert.ok(scrollBy.called);
    assert.ok(raf.called);
  });

});
