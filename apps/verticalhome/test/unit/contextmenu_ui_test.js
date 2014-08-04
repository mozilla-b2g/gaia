'use strict';

/* global app, contextMenuUI, wallpaper, MocksHelper */

require('/shared/elements/gaia_grid/js/grid_dragdrop.js');
require('/shared/elements/gaia_grid/js/grid_icon_renderer.js');
require('/shared/elements/gaia_grid/js/grid_layout.js');
require('/shared/elements/gaia_grid/js/grid_view.js');
require('/shared/elements/gaia_grid/js/grid_zoom.js');
require('/shared/elements/gaia_grid/js/items/grid_item.js');
require('/shared/elements/gaia_grid/js/items/placeholder.js');
require('/shared/elements/gaia_grid/script.js');
require('/test/unit/mock_item_store.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/js/wallpaper.js');
requireElements('verticalhome/elements/contextmenu.html');

var mocksHelperForContextMenuUI = new MocksHelper([
  'LazyLoader',
  'ItemStore'
]).init();

suite('contextmenu_ui.js >', function() {

  mocksHelperForContextMenuUI.attachTestHelpers();

  var fakeEvt = {};

  suiteSetup(function(done) {
    loadBodyHTML('/index.html');
    require('/js/app.js', done);
  });

  setup(function(done) {
    app.init();
    this.sinon.stub(app.grid._grid, 'getNearestItemIndex').returns(0);
    require('/js/contextmenu_ui.js', done);
  });

  suiteTeardown(function() {
    document.body.innerHTML = '';
  });

  function assertDisplayed() {
    assert.isTrue(!contextMenuUI.dialog.hasAttribute('hidden'));
  }

  function assertHidden() {
    assert.isTrue(contextMenuUI.dialog.hasAttribute('hidden'));
  }

  test(' Show and hide context menu', function() {
    var clock = sinon.useFakeTimers();
    contextMenuUI.show(fakeEvt);
    clock.tick(50);
    assertDisplayed();
    contextMenuUI.hide();
    assertHidden();
  });

  test(' Change wallpaper action', function(done) {
    var stub = sinon.stub(wallpaper, 'change', function() {
      stub.restore;
      done();
    });

    contextMenuUI.show(fakeEvt);
    contextMenuUI.dialog.querySelector('#change-wallpaper-action').click();
    assertHidden();
  });

  test(' Cancel action', function() {
    contextMenuUI.show(fakeEvt);
    contextMenuUI.dialog.dispatchEvent(new CustomEvent('gaiamenu-cancel'));
    assertHidden();
  });

  test(' Hide the context menu when the document is hidden', function() {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: function() {
        return true;
      }
    });

    contextMenuUI.show(fakeEvt);
    contextMenuUI.handleEvent({
      'type': 'visibilitychange'
    });

    delete document.hidden;
    assertHidden();
  });

});
