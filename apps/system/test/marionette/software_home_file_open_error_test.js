'use strict';

var Rocketbar = require('./lib/rocketbar');
var Server = require('../../../../shared/test/integration/server');
var assert = require('chai').assert;

marionette('Software Home Button - File Open Error', function() {

  var client = marionette.client({
    profile: {
      prefs: {
        'focusmanager.testmode': true
      },
      settings: {
        'software-button.enabled': true
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var home, rocketbar, search, server, system, actions;

  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    rocketbar = new Rocketbar(client);
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    actions = client.loader.getActions();
    system.waitForFullyLoaded();
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
    rocketbar.enterText(url, true);
    system.gotoBrowser(url);

    // Save the file.
    actions.longPress(client.helper.waitForElement('a'), 1).perform();
    client.switchToFrame();
    system.appContextMenuSaveLink.click();

    // Tap on the toaster to open the download.
    // We could also open this from settings or the utility tray if needed.
    getDownloadCompleteToast().tap();

    var dialogHeight = getDownloadDialogHeight();

    var shbRect = system.softwareButtons.scriptWith(rect);

    assert.equal(dialogHeight, expectedDialogHeight());
    assert.equal(dialogHeight, shbRect.top);
  });

  function rect(el) {
    return el.getBoundingClientRect();
  }

  // Wait for/repeat execution of provided getter until no exception is thrown
  function waitForNoException(getter) {
    var obj;
    client.waitFor(function() {
      try {
        obj = getter();
        return true;
      } catch (ex) {
        return false;
      }
    });
    return obj;
  }

  // Reliable retrieval of dialog's height. This is required, as
  // downloadDialog.size() fails, if the dialog is not rooted in DOM tree
  // (stale reference exception). This happens every now and then for very
  // short periods of time.
  function getDownloadDialogHeight() {
    return waitForNoException(function() {
      return system.downloadDialog.size().height;
    });
  }

  function expectedDialogHeight() {
    var winHeight = client.findElement('body').size().height;
    var shbHeight = system.softwareButtons.size().height;
    return (winHeight - shbHeight);
  }

  function getDownloadCompleteToast() {
    var toasterTitle;
    client.waitFor(function() {
      toasterTitle = client.helper.waitForElement(
        '#notification-toaster.displayed .toaster-title');
      return toasterTitle.text().indexOf('Download complete') !== -1;
    });
    return toasterTitle;
  }

});
