'use strict';

/* global contextMenuUI, wallpaper, MocksHelper */

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/load_body_html_helper.js');
requireApp('home2/js/wallpaper.js');
requireElements('home2/elements/contextmenu.html');

var mocksHelperForContextMenuUI = new MocksHelper([
  'LazyLoader'
]).init();

suite('contextmenu_ui.js >', function() {

  mocksHelperForContextMenuUI.attachTestHelpers();

  suiteSetup(function() {
    loadBodyHTML('/index.html');
  });

  setup(function(done) {
    requireApp('home2/js/contextmenu_ui.js', done);
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
    contextMenuUI.show();
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

    contextMenuUI.show();
    contextMenuUI.dialog.querySelector('#change-wallpaper-action').click();
    assertHidden();
  });

  test(' Cancel action', function() {
    contextMenuUI.show();
    contextMenuUI.dialog.dispatchEvent(new CustomEvent('gaiamenu-cancel'));
    assertHidden();
  });

});
