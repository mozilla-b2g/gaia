'use strict';

/* global MocksHelper, MockL10n, contextMenuUI */

require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('home2/test/unit/mock_l10n.js');
requireApp('home2/js/contextmenu_ui.js');
requireApp('home2/js/contextmenu_handler.js');

var mocksHelperForContextMenuHandler = new MocksHelper([
  'LazyLoader'
]).init();

suite('contextmenu_handler.js >', function() {

  var realL10n = null;

  mocksHelperForContextMenuHandler.attachTestHelpers();

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    realL10n = null;
  });

  test(' Handling contextmenu event', function(done) {
    var stub = sinon.stub(contextMenuUI, 'show', function() {
      stub.restore();
      done();
    });
    window.dispatchEvent(new CustomEvent('contextmenu'));
  });

  test(' Handling hashchange event', function(done) {
    var stub = sinon.stub(contextMenuUI, 'hide', function() {
      stub.restore();
      done();
    });
    window.dispatchEvent(new CustomEvent('hashchange'));
  });

});
