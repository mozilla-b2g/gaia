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

  test('opens rocketbar from homescreen', function() {
    client.apps.switchToApp(Homescreen.URL);
    homescreen.search();

    client.switchToFrame();

    search.goToResults();
  });

});
