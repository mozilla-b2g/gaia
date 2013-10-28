'use strict';

require('/shared/js/lazy_loader.js');
requireApp('homescreen/test/unit/mock_app.js');
requireApp('homescreen/test/unit/mock_request.html.js');
requireApp('homescreen/test/unit/mock_lazy_loader.js');
requireApp('homescreen/test/unit/mock_l10n.js');
requireApp('homescreen/test/unit/mock_grid_manager.js');
requireApp('homescreen/test/unit/mock_pagination_bar.js');
require('/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('homescreen/js/grid_components.js');
requireApp('homescreen/js/message.js');
requireApp('homescreen/js/request.js');

requireApp('homescreen/js/homescreen.js');

var mocksHelperForHome = new MocksHelper([
  'PaginationBar',
  'GridManager',
  'ManifestHelper',
  'LazyLoader'
]);
mocksHelperForHome.init();

suite('homescreen.js >', function() {

  var dialog;

  suiteSetup(function() {
    mocksHelperForHome.suiteSetup();
    dialog = document.createElement('section');
    dialog.id = 'confirm-dialog';
    dialog.innerHTML = MockRequestHtml;
    document.body.appendChild(dialog);
    ConfirmDialog.init();
  });

  suiteTeardown(function() {
    mocksHelperForHome.suiteTeardown();
    document.body.removeChild(dialog);
  });

  test(' Homescreen is in edit mode ', function() {
    Homescreen.setMode('edit');
    assert.isTrue(Homescreen.isInEditMode());
    assert.equal(document.body.dataset.mode, 'edit');
  });

  test(' Homescreen is not in edit mode ', function() {
    Homescreen.setMode('normal');
    assert.isFalse(Homescreen.isInEditMode());
    assert.equal(document.body.dataset.mode, 'normal');
  });

  test(' Homescreen displays a contextual menu for an app ', function() {
    Homescreen.showAppDialog({
      app: new MockApp(),
      getName: function() {}
    });
    assert.isTrue(dialog.classList.contains('visible'));
  });

  test(' Homescreen is listening online event ', function() {
    window.dispatchEvent(new CustomEvent('online'));
    assert.equal(document.body.dataset.online, 'online');
  });

  test(' Homescreen is listening offline event ', function() {
    window.dispatchEvent(new CustomEvent('offline'));
    assert.equal(document.body.dataset.online, 'offline');
  });

});
