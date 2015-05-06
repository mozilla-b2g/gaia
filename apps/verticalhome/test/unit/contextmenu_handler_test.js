'use strict';

/* global MocksHelper, MockL10n, contextMenuUI, loadBodyHTML,
          contextMenuHandler, App */

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/test/unit/mock_app.js');
require('/js/contextmenu_ui.js');

var mocksHelperForContextMenuHandler = new MocksHelper([
  'App',
  'LazyLoader'
]).init();

suite('contextmenu_handler.js >', function() {

  var realL10n = null;
  var clock = null;

  mocksHelperForContextMenuHandler.attachTestHelpers();

  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    clock = sinon.useFakeTimers();
    loadBodyHTML('/index.html');
    require('/js/contextmenu_handler.js', done);
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    realL10n = null;
  });

  function dispatchContextMenu() {
    contextMenuHandler.container.dispatchEvent(new CustomEvent('contextmenu'));
    clock.tick();
  }

  test(' Handling contextmenu event', function() {
    window.app = new App();
    var stub = sinon.stub(contextMenuUI, 'show');

    dispatchContextMenu();
    sinon.assert.called(stub);

    stub.restore();
    delete window.app;
  });

  test(' Handling contextmenu event in edit mode', function() {
    window.app = new App();
    window.app.grid._grid.dragdrop.inEditMode = true;
    var stub = sinon.stub(contextMenuUI, 'show');

    dispatchContextMenu();
    sinon.assert.notCalled(stub);

    stub.restore();
    delete window.app;
  });

  test(' Handling hashchange event', function() {
    var stub = sinon.stub(contextMenuUI, 'hide');

    window.dispatchEvent(new CustomEvent('hashchange'));
    sinon.assert.called(stub);

    stub.restore();
  });

});
