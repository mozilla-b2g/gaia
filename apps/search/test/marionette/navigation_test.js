var Search = require('./lib/search');
var Homescreen = require('../../../homescreen/test/marionette/lib/homescreen');
var Server = require('../../../../shared/test/integration/server');

var assert = require('assert');

marionette('navigation', function() {
  var client = marionette.client(Search.ClientOptions);

  var homescreen;
  var search;
  var server;

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  setup(function() {
    homescreen = new Homescreen(client);
    search = new Search(client);
  });

  // Disabled due to focus issues
  // https://bugzilla.mozilla.org/show_bug.cgi?id=952443
  test.skip('opening rocketbar does not resize current app', function() {
    client.apps.switchToApp(Homescreen.URL);

    // Add a listener to check if we resize
    client.executeScript(function() {
      window.wrappedJSObject.addEventListener('resize', function() {
        window.wrappedJSObject.IS_RESIZED = true;
      });
    });

    // Go to the search frame and open the rocketbar
    client.switchToFrame();
    search.openRocketbar();

    // Return to the homescreen and make sure we have not resized
    client.apps.switchToApp(Homescreen.URL);
    var isResized = client.executeScript(function() {
      return window.wrappedJSObject.IS_RESIZED;
    });
    assert(!isResized);
  });

  test('cancel button closes rocketbar', function() {
    search.openRocketbar();
    search.cancelRocketbar();
  });

  test('opens rocketbar from homescreen', function() {
    client.apps.switchToApp(Homescreen.URL);
    homescreen.search();

    client.switchToFrame();

    search.goToResults();
  });

  test('opens browser with url', function() {
    var url = server.url('sample.html');

    // Enter the URL with enter key
    search.doSearch(url + '\uE006');

    client.switchToFrame();

    search.goToBrowser(url);
  });

});
