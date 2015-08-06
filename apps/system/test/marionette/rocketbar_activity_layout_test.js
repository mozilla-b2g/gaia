'use strict';

var Actions = require('marionette-client').Actions;
var Bookmark = require('./lib/bookmark');
var EmeServer = require(
  '../../../../shared/test/integration/eme_server/parent');
var Home = require(
  '../../../../apps/verticalhome/test/marionette/lib/home2');
var Search = require(
  '../../../../apps/search/test/marionette/lib/search');
var System = require('./lib/system');
var Rocketbar = require('./lib/rocketbar');

marionette('Rocketbar - Opened Activity From Search', function() {

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true,
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });
  var actions, bookmark, home, rocketbar, search, server, system;

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
    bookmark = new Bookmark(client);
    home = new Home(client);
    rocketbar = new Rocketbar(client);
    search = new Search(client);
    system = new System(client);
    system.waitForStartup();

    search.removeGeolocationPermission();
    EmeServer.setServerURL(client, server);
  });

  test('has proper layout', function() {
    var resultIdentifier = 'mozilla1.org/';

    rocketbar.homescreenFocus();
    rocketbar.enterText('mozilla');
    search.goToResults();
    var result = search.checkResult(resultIdentifier, 'Mozilla');
    actions.longPress(result, 1).perform();
    client.switchToFrame();

    // Bug 1104314 - On v2.1 b2g-desktop, the search app has a bug where
    // the keyboard does not dismiss when long pressing a bookmark. Since
    // this does not reproduce on device or master, we work around it here.
    client.executeScript(function() {
      window.wrappedJSObject.KeyboardManager.hideKeyboardImmediately();
    });

    client.helper.waitForElement('#search .contextmenu-list button').click();
    client.switchToFrame(bookmark.currentTabFrame);
    bookmark.bookmarkTitle.click();
    client.switchToFrame();
    var lastHeight;
    client.waitFor(function() {
      var newHeight = bookmark.currentTabFrame.size().height;
      var matches = newHeight === lastHeight;
      lastHeight = newHeight;
      var keyboardHeight = client.executeScript(function() {
        return window.wrappedJSObject.KeyboardManager.getHeight();
      });
      var frameRect = bookmark.currentTabFrame.scriptWith(function(el) {
        return el.getBoundingClientRect();
      });
      return matches && frameRect.bottom >= keyboardHeight;
    });
  });
});
