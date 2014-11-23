'use strict';

var Home = require(
  '../../../verticalhome/test/marionette/lib/home2');

marionette('Software Home Button - Update Dialog', function() {

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
    system = client.loader.getAppClass('system');
    system.waitForStartup();
    home.waitForLaunch();
    client.switchToFrame();
  });

  test('Proper layout for updates', function() {
    client.executeScript(function() {
      window.wrappedJSObject.UpdateManager.showDownloadPrompt();
    });

    function rect(el) {
      return el.getBoundingClientRect();
    }

    var winHeight = client.findElement('body').size().height;
    client.waitFor(function() {
      var dialog = client.findElement('#updates-download-dialog');
      var dialogRect = dialog.scriptWith(rect);
      var shbRect = system.softwareButtons.scriptWith(rect);

      return dialogRect.bottom === shbRect.top &&
        winHeight === (dialogRect.height + shbRect.height);
    });
  });
});
