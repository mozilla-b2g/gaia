'use strict';

var assert = require('assert');

var Rocketbar = require('../../../system/test/marionette/lib/rocketbar.js');
var Server = require('../../../../shared/test/integration/server');

marionette('Search - Notice Test', function() {

  var client = marionette.client({
    profile: require(__dirname + '/client_options.js')
  });
  var home, search, rocketbar, system, server;

  var providers;

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
    system.waitForFullyLoaded();

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

  test('Search Notice', function() {

    home.waitForLaunch();
    home.focusRocketBar();

    var confirmSelector = search.Selectors.firstRunConfirm;
    // Notice should not be displayed if we type < 3 characters
    rocketbar.enterText('ab');
    rocketbar.enterText('cd');
    search.goToResults();
    assert.ok(!client.findElement(confirmSelector).displayed());

    // Should not show notice if suggestions are disabled
    client.settings.set('search.suggestions.enabled', false);
    client.switchToFrame();
    rocketbar.enterText('abc');
    search.goToResults();
    client.helper.waitForElementToDisappear(confirmSelector);

    // Notice should be displayed if we show > 3 characters
    client.settings.set('search.suggestions.enabled', true);
    client.switchToFrame();
    rocketbar.enterText('abc');
    search.goToResults();
    client.helper.waitForElement(confirmSelector);

    // Notice should be dismissed if we press enter
    client.switchToFrame();
    var searchText = 'abc';
    rocketbar.enterText(searchText, true);
    rocketbar.switchToSearchFrame(server.url('sample.html'), searchText);
    client.switchToFrame();
    home.pressHomeButton();
    client.apps.switchToApp(home.URL);
    home.focusRocketBar();
    search.goToResults();
    assert.ok(!client.findElement(confirmSelector).displayed());
  });

});
