'use strict';

var fs = require('fs');
var System = require('./lib/system');

var MOCK_PATH = __dirname + '/../../../../shared/test/integration/';

marionette('Software Home Button - SIM PIN Dialog', function() {

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true,
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false,
      'software-button.enabled': true
    }
  });
  var system;

  setup(function() {
    client.setContext('chrome');
    client.executeScript(fs.readFileSync(MOCK_PATH +
      'mock_navigator_moz_mobile_connections.js', 'utf8'));

    system = new System(client);
    system.waitForStartup();
    client.switchToFrame();
  });

  test('Proper layout for sim pin dialog', function() {

    client.executeScript(function() {
      var win = window.wrappedJSObject;
      win.SIMSlotManager.init();
      var slot = win.SIMSlotManager.getSlots()[0];
      win.SimPinDialog.show(slot);
    });

    function rect(el) {
      return el.getBoundingClientRect();
    }

    var winHeight = client.findElement('body').size().height;
    client.waitFor(function() {
      var sbRect = system.statusbar.scriptWith(rect);
      var alert = client.findElement('#simpin-dialog');
      var dialogRect = alert.scriptWith(rect);
      var shbRect = system.softwareButtons.scriptWith(rect);

      return winHeight === (sbRect.height + dialogRect.height + shbRect.height);
    });
  });
});
