'use strict';

var Rocketbar = require('../../../system/test/marionette/lib/rocketbar.js');
var Server = require('../../../../shared/test/integration/server');

marionette('Search - Suggestions Test', function() {

  var client = marionette.client(require(__dirname + '/client_options.js'));
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
    system.waitForStartup();

    providers = [{
      title: 'first',
      urlTemplate: server.url('sample.html'),
      suggestionsUrlTemplate: server.url('suggestions_one.json')
    }];

    client.settings.set('search.providers', providers);
    client.settings.set('search.urlTemplate', providers[0].urlTemplate);
  });

  test('Test suggestions', function() {

    home.waitForLaunch();
    home.focusRocketBar();

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
    rocketbar.switchToBrowserFrame(providers[0].urlTemplate);
  });

});
