'use strict';

marionette('Software Home Button - Update Dialog', function() {

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true
    },
    settings: {
      'software-button.enabled': true
    }
  });
  var home, system;

  setup(function() {
    home = client.loader.getAppClass('verticalhome');
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
