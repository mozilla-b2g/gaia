'use strict';

var assert = require('assert');

var Rocketbar = require('../../../system/test/marionette/lib/rocketbar.js');
var Server = require('../../../../shared/test/integration/server');

marionette('Search - Rocketbar Test', function() {

  var client = marionette.client({
    profile: require(__dirname + '/client_options.js'),
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var home, search, rocketbar, system, server;

  var providers, searchTemplate;
  var phoneIdentifier =
    'app://communications.gaiamobile.org/manifest.webapp-dialer';

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });
  });

  setup(function() {
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    search = client.loader.getAppClass('search');
    rocketbar = new Rocketbar(client);
    system.waitForFullyLoaded();
    searchTemplate = server.url('sample.html') + '?q=';
    providers = {
      version: search.searchDataVersion(),
      providers: {
        'first': {
          title: 'first',
          searchUrl: searchTemplate + '{searchTerms}',
          suggestUrl: server.url('suggestions_one.json')
        }
      }
    };
    mockSearch();
    home.waitForLaunch();
    rocketbar.homescreenFocus();
  });

  function mockSearch() {
    client.settings.set('search.suggestions.enabled', true);
    client.settings.set('search.cache', providers);
    client.settings.set('search.provider', 'first');
  }

  function assertThatUrlContains(text) {
    rocketbar.appTitleFocus();
    client.waitFor(function() {
      var value = rocketbar.input.getAttribute('value');
      var searchText = text.replace(' ', '%20');
      return value === (searchTemplate + searchText);
    });
  }

  test('General walkthrough', function() {
    search.triggerFirstRun(rocketbar);
    var textToSearch = 'a test';

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
    client.waitFor(function() {
      return home.visibleIcons.length && home.visibleIcons[0].displayed();
    });

    // When we previously pressed close, when rocketbar reopens value
    // should be empty
    rocketbar.homescreenFocus();
    assert.equal(rocketbar.input.getAttribute('value'), '');

    // Search for an app again, this time press close after searching
    rocketbar.enterText('Phone');
    home.pressHomeButton();

    client.waitFor(function() {
      return home.visibleIcons.length && home.visibleIcons[0].displayed();
    });

    // If we press home button during a search, next time we focus the rocketbar
    // previous result should be displayed
    rocketbar.homescreenFocus();
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
    rocketbar.enterText(textToSearch, true);
    rocketbar.switchToBrowserFrame(searchTemplate);
  });

  test('Browser search', function() {
    home.waitForLaunch();
    rocketbar.homescreenFocus();
    var textToSearch = 'a test';
    rocketbar.performSearchInBrowser(textToSearch);
    assertThatUrlContains(textToSearch);
  });

});
