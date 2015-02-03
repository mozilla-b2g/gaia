'use strict';

var assert = require('assert');
var EmeServer = require(
  '../../../../shared/test/integration/eme_server/parent');
var Rocketbar = require('./lib/rocketbar');

marionette('Browser Chrome - Share Web Result', function() {

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    },
    apps: {
      'shareactivityapp.gaiamobile.org': __dirname + '/shareactivityapp'
    }
  });

  var actions, home, rocketbar, search, server, system;

  suiteSetup(function(done) {
    EmeServer(client, function(err, _server) {
      server = _server;
      done(err);
    });
  });

  suiteTeardown(function(done) {
    server.close(done);
  });

  setup(function() {
    actions = client.loader.getActions();
    home = client.loader.getAppClass('verticalhome');
    rocketbar = new Rocketbar(client);
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    system.waitForStartup();

    EmeServer.setServerURL(client, server);
  });

  test('share web result via e-mail', function() {
    var linkIdentifier = 'mozilla1.org/';

    home.waitForLaunch();
    home.focusRocketBar();
    search.triggerFirstRun(rocketbar);

    // Use the home-screen search box to open up the system browser
    rocketbar.homescreenFocus();
    rocketbar.enterText('mozilla');
    search.goToResults();
    var result = search.checkResult(linkIdentifier, 'Mozilla');
    result.tap();

    // Open the context menu and click share
    client.switchToFrame();
    system.appChromeContextLink.click();
    assert.ok(system.appChromeContextMenu.displayed());

    var shareLink = system.appChromeContextMenuShare;
    assert.ok(shareLink.displayed());
    shareLink.click();

    // Click the 'E-Mail' option in the activity chooser
    client.switchToFrame();
    var menu =
      client.helper.waitForElement('form[data-z-index-level="action-menu"]');
    var list = menu.findElements('button');
    for (var i = 0; i < list.length; i++) {
      var link = list[i];
      if (link.text() === 'Share Activity') {
        link.click();
        break;
      }
    }

    var appOrigin = 'app://shareactivityapp.gaiamobile.org';
    client.switchToFrame(system.getAppIframe(appOrigin));

    // Verify that the share details appear within the share activity app.
    client.waitFor(function() {
      var text = client.helper.waitForElement('#activity-url').text();
      return text.indexOf(linkIdentifier) !== -1;
    });
  });
});
