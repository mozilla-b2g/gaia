'use strict';

var Home = require(
  '../../../verticalhome/test/marionette/lib/home2');
var System = require('./lib/system');

marionette('Software Home Button - Modal Dialog', function() {

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
  var home, system;

  setup(function() {
    home = new Home(client);
    system = new System(client);
    system.waitForStartup();
    home.waitForLaunch();
    client.switchToFrame();
  });

  test('Proper layout for alerts', function() {
    client.executeScript(function() {
      window.wrappedJSObject.ModalDialog.alert(
        'apmActivated', 'noHopspotWhenAPMisOn', { title: 'ok' });
    });

    function rect(el) {
      return el.getBoundingClientRect();
    }

    var winHeight = client.findElement('body').size().height;
    client.waitFor(function() {
      var sbRect = system.statusbar.scriptWith(rect);
      var alert = client.findElement('#modal-dialog-alert');
      var dialogRect = alert.scriptWith(rect);
      var shbRect = system.softwareButtons.scriptWith(rect);

      return dialogRect.bottom === shbRect.top &&
        winHeight === (sbRect.height + dialogRect.height + shbRect.height);
    });
  });
});
