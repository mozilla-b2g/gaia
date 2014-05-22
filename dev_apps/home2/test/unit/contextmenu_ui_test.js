'use strict';

/* global contextMenuUI, wallpaper, MocksHelper */

mocha.globals(['contextMenuUI']);

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

  suiteTemplate('contextmenu-dialog', {
    id: 'contextmenu-dialog'
  });

  setup(function(done) {
    requireApp('home2/js/contextmenu_ui.js', done);
  });

  suiteTeardown(function() {
    document.body.innerHTML = '';
  });

  function assertDisplayed() {
    assert.isTrue(contextMenuUI.displayed);
    assert.isTrue(contextMenuUI.dialog.classList.contains('visible'));
    assert.isTrue(contextMenuUI.dialog.classList.contains('show'));
  }

  function assertHidden() {
    assert.isFalse(contextMenuUI.displayed);
    assert.isFalse(contextMenuUI.dialog.classList.contains('show'));
    contextMenuUI.dialog.dispatchEvent(new CustomEvent('transitionend'));
    assert.isFalse(contextMenuUI.dialog.classList.contains('visible'));
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
    contextMenuUI.menu.querySelector('#change-wallpaper-action').click();
    assertHidden();
  });

  test(' Cancel action', function() {
    contextMenuUI.show();
    contextMenuUI.menu.querySelector('#cancel-action').click();
    assertHidden();
  });

});
