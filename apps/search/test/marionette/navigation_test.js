var Search = require('./lib/search');
var Homescreen = require(
  '../../../homescreen/test/marionette/lib/homescreen');
var assert = require('assert');

marionette('navigation', function() {
  var client = marionette.client(Search.ClientOptions);

  var homescreen;
  var search;

  setup(function() {
    homescreen = new Homescreen(client);
    search = new Search(client);
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

  test.skip('opens browser with url', function() {
    var url = 'http://mozilla.org/';
    // Enter the URL with enter key
    search.doSearch(url + '\uE006');

    client.switchToFrame();

    search.goToBrowser(url);
  });

});
