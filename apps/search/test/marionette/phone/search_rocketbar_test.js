'use strict';

var assert = require('assert');

var Rocketbar = require('../../../../system/test/marionette/lib/rocketbar.js');
var Server = require('../../../../../shared/test/integration/server');

marionette('Search - Rocketbar Test', function() {

  var client = marionette.client(require(__dirname + '/client_options.js'));
  var home, search, rocketbar, system, server;

  var providers;
  var phoneIdentifier =
    'app://communications.gaiamobile.org/manifest.webapp-dialer';

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });
  });

  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    search = client.loader.getAppClass('search');
    rocketbar = new Rocketbar(client);
    system.waitForStartup();

    providers = {
      version: search.searchDataVersion(),
      providers: {
        'first': {
          title: 'first',
          searchUrl: server.url('sample.html'),
          suggestUrl: server.url('suggestions_one.json')
        }
      }
    };

    client.settings.set('search.suggestions.enabled', true);
    client.settings.set('search.cache', providers);
    client.settings.set('search.provider', 'first');
  });

  test('General walkthrough', function() {

    // Lauch the rocketbar and trigger its first run notice
    home.waitForLaunch();
    home.focusRocketBar();
    search.triggerFirstRun(rocketbar);

    // Clear button shouldnt be visible when no text entered
    assert.ok(!rocketbar.clear.displayed());

    // Search for an app ane make sure it exists
    rocketbar.enterText('Phone');
    search.goToResults();
    search.checkResult(phoneIdentifier, 'Phone');

    // Press rocketbar close button, ensure the homescreen is
    // now displayed
    client.switchToFrame();
    rocketbar.cancel.click();
    client.apps.switchToApp(home.URL);
    var firstIcon = client.helper.waitForElement(home.Selectors.firstIcon);
    assert.ok(firstIcon.displayed());

    // When we previously pressed close, when rocketbar reopens value
    // should be empty
    home.focusRocketBar();
    assert.equal(rocketbar.input.getAttribute('value'), '');

    // Search for an app again, this time press close after searching
    rocketbar.enterText('Phone');
    home.pressHomeButton();

    client.apps.switchToApp(home.URL);
    firstIcon = client.helper.waitForElement(home.Selectors.firstIcon);
    assert.ok(firstIcon.displayed());

    // If we press home button during a search, next time we focus the rocketbar
    // previous result should be displayed
    home.focusRocketBar();
    search.goToResults();
    search.checkResult(phoneIdentifier, 'Phone');

    // Clear button should be visible when text entered
    client.switchToFrame();
    assert.ok(rocketbar.clear.displayed());

    // Press clear button, input
    rocketbar.clear.click();
    assert.equal(rocketbar.input.getAttribute('value'), '');
    assert.ok(!rocketbar.clear.displayed());

    // Perform a search
    rocketbar.enterText('a test\uE006');
    rocketbar.switchToBrowserFrame(server.url('sample.html'));
  });

});
