'use strict';

var assert = require('assert');
var Actions = require('marionette-client').Actions;
var Email = require(
  '../../../../apps/email/test/marionette/lib/email');
var EmailServer = require(
  '../../../../apps/email/test/marionette/lib/server_helper');
var EmeServer = require(
  '../../../../shared/test/integration/eme_server/parent');
var Home = require(
  '../../../../apps/verticalhome/test/marionette/lib/home2');
var Search = require(
  '../../../../apps/search/test/marionette/lib/search');
var Rocketbar = require('./lib/rocketbar');

marionette('Browser Chrome - Share Web Result', function() {

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

  var emailServer = EmailServer.use({
    credentials: { username: 'testy1', password: 'testy1' }
  });

  var actions, email, home, rocketbar, search, server, system;

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
    actions = new Actions(client);
    email = new Email(client);
    home = new Home(client);
    rocketbar = new Rocketbar(client);
    search = new Search(client);
    system = client.loader.getAppClass('system');
    system.waitForStartup();

    search.removeGeolocationPermission();
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
      if (link.text() === 'E-Mail') {
        link.click();
        break;
      }
    }

    // Setup e-mail and confirm that the body contains the shared link
    email.confirmWantAccount();
    email.manualSetupImapEmail(emailServer, 'waitForCompose');
    var body = email.getComposeBody();
    assert.ok(body.indexOf(linkIdentifier) !== -1);
  });
});
