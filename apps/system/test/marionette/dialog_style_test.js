'use strict';

var Dialog = require('../../../system/test/marionette/lib/dialog');
var assert = require('assert');

marionette('Dialogs', function() {
  var client = marionette.client();
  var dialog, system;

  setup(function() {
    system = client.loader.getAppClass('system');
    dialog = new Dialog(client);
    system.waitForFullyLoaded();
    client.switchToFrame(system.getHomescreenIframe());
  });

  test('displaying a short alert', function() {
    dialog.alert('message');
    client.switchToFrame();
    var dialogHeight = dialog.current.size().height;
    var menuHeight = dialog.menu.size().height;
    var containerHeight = dialog.messageContainer.size().height;
    var statusbarSize = system.statusbar.size().height;
    var halfDialog = ((dialogHeight - menuHeight) / 2) - (containerHeight / 2);
    assert.ok(dialog.title.location().y - statusbarSize === halfDialog);
    dialog.okButton.click();
  });

  test('displaying a long alert', function() {
    var msg = '';
    for (var i = 0; i < 1000; i++) {
      msg += 'i';
    }

    dialog.alert(msg);
    client.switchToFrame();
    var statusbarSize = system.statusbar.size().height;
    assert.ok(dialog.title.location().y === statusbarSize);
    dialog.okButton.click();
  });

});
