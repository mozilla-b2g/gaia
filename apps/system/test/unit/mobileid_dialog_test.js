'use strict';

/* global MobileIdDialog, SystemDialog, LayoutManager, MocksHelper */

require('/js/service.js');
require('/js/base_ui.js');
require('/js/system_dialog.js');
require('/js/mobileid_dialog.js');
require('/test/unit/mock_system_dialog_manager.js');
require('/test/unit/mock_layout_manager.js');
require('/test/unit/mock_keyboard_manager.js');
require('/test/unit/mock_statusbar.js');

var mocksForMobileIdDialog = new MocksHelper([
  'SystemDialogManager',
  'LayoutManager',
  'KeyboardManager',
  'StatusBar'
]).init();

suite('MobileID Dialog', function() {
  mocksForMobileIdDialog.attachTestHelpers();

  var container;

  setup(function() {
    container = document.createElement('div');
    document.body.appendChild(container);
    SystemDialog.prototype.containerElement = container;

    window.layoutManager = new LayoutManager();
  });

  teardown(function() {
    document.body.removeChild(container);
    SystemDialog.prototype.containerElement = container = null;

    window.layoutManager = null;
  });

  test('Dialog should be removed when closed', function() {
    var that = this;
    var dialog = new MobileIdDialog({
      onOpened: function onOpened() {
        that.sinon.spy(dialog.panel.parentNode, 'removeChild');
      },
      onClosed: function onClosed() {
        assert.isTrue(dialog.panel.parentNode.removeChild.calledOnce);
      }
    });
    dialog.open();
    dialog.close();
  });
});
