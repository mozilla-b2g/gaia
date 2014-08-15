'use strict';

var assert = require('assert');
var Actions = require('marionette-client').Actions;
var Bookmark = require('./lib/bookmark');
var EmeServer = require(
  '../../../../shared/test/integration/eme_server/parent');
var Home = require(
  '../../../../apps/verticalhome/test/marionette/lib/home2');
var launchIcon = require(
  '../../../../apps/verticalhome/test/marionette/lib/launch_icon');
var Search = require(
  '../../../../apps/search/test/marionette/lib/search');
var System = require('./lib/system');
var Rocketbar = require('./lib/rocketbar');

marionette('Browser Chrome - Bookmark Web Result', function() {

  var client = marionette.client({
    prefs: {
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

    var chrome = client.scope({ context: 'chrome' });
    chrome.executeScript(function(url) {
      navigator.mozSettings.createLock().set({
        'everythingme.api.url': url
      });
    }, [server.url + '/{resource}']);
  });

  test('bookmark web result', function() {
    var bookmarkIdentifier = 'mozilla1.org/';

    rocketbar.homescreenFocus();
    rocketbar.enterText('mozilla');
    search.goToResults();
    var result = search.checkResult(bookmarkIdentifier, 'Mozilla');
    result.tap();
    client.switchToFrame();

    system.appChromeContextLink.click();
    assert.ok(system.appChromeContextMenu.displayed());

    var bookmarkLink = system.appChromeContextMenuBookmark;
    assert.ok(bookmarkLink.displayed());
    bookmarkLink.click();
    bookmark.add();

    // Dispatch a home event to go home.
    client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(new CustomEvent('home'));
    });
    home.waitForLaunch();

    var icon = home.getIcon(bookmarkIdentifier);
    launchIcon(icon);
  });
});
