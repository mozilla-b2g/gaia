'use strict';

var Rocketbar = require('./lib/rocketbar');
var Server = require('../../../../shared/test/integration/server');
var assert = require('chai').assert;

marionette('Software Home Button - File Open Error', function() {

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true
    },
    settings: {
      'software-button.enabled': true
    }
  });
  var home, rocketbar, search, server, system, actions;

  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    rocketbar = new Rocketbar(client);
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    actions = client.loader.getActions();
    system.waitForStartup();
  });

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  test('Proper layout for file error dialog', function() {
    var url = server.url('invalid_file.html');

    // Navigate to the url.
    rocketbar.homescreenFocus();
    rocketbar.enterText(url + '\uE006');
    system.gotoBrowser(url);

    // Save the file.
    actions.longPress(client.helper.waitForElement('a'), 1).perform();
    client.switchToFrame();
    system.appContextMenuSaveLink.click();

    // Tap on the toaster to open the download.
    // We could also open this from settings or the utility tray if needed.
    var toasterTitle;
    client.waitFor(function() {
      toasterTitle = client.helper.waitForElement(
        '#notification-toaster.displayed .toaster-title');
      return toasterTitle.text().indexOf('Download complete') !== -1;
    });
    toasterTitle.tap();

    function rect(el) {
      return el.getBoundingClientRect();
    }

    var dialogHeight = system.downloadDialog.size().height;
    var shbRect = system.softwareButtons.scriptWith(rect);

    assert.equal(dialogHeight, expectedDialogHeight());
    assert.equal(dialogHeight, shbRect.top);
  });

  function expectedDialogHeight() {
    var winHeight = client.findElement('body').size().height;
    var shbHeight = system.softwareButtons.size().height;
    return (winHeight - shbHeight);
  }
});
