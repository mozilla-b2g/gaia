var ReloadApp = require('../lib/script')({
  desc: 'Refreshes currently running app without rebooting b2g',
  usage: 'reload-app'
}, function(argv) {
  var driver = require('../lib/driver')();

  driver.start(function(client) {
    client.executeScript(function() {
      navigator.mozPower.screenEnabled = true;
      var WindowManager = window.wrappedJSObject.WindowManager;
      var currentApp = WindowManager.getDisplayedApp();
      if (currentApp) {
        WindowManager.kill(currentApp);
      }
      WindowManager.launch(currentApp);
    });
    driver.stop();
  });
});

module.exports = ReloadApp;
