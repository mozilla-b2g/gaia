'use strict';

var Rocketbar = require('../../../system/test/marionette/lib/rocketbar.js');
var Server = require('../../../../shared/test/integration/server');

marionette('Search - Suggestions Test', function() {

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

  test('Test suggestions', function() {

    home.waitForLaunch();
    home.focusRocketBar();

    search.triggerFirstRun(rocketbar);
    rocketbar.enterText('sometext');
    search.goToResults();

    // Ensure we get 2 results (hardcoded in the provider results)
    client.waitFor(function() {
      return client.findElements(search.Selectors.suggestions).length === 2;
    });

    // Ensure clicking on a result opens the browser correctly
    var first = client.helper.waitForElement('#suggestions li');
    first.click();

    client.switchToFrame();
    rocketbar.switchToBrowserFrame(providers.providers.first.searchUrl);
  });

});
