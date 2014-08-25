'use strict';

var Actions = require('marionette-client').Actions;
var Home = require(
  '../../../../apps/verticalhome/test/marionette/lib/home2');
var Search = require(
  '../../../../apps/search/test/marionette/lib/search');
var Server = require('../../../../shared/test/integration/server');
var System = require('./lib/system');
var Rocketbar = require('./lib/rocketbar');

marionette('Browser Chrome - Title content', function() {

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    },
    apps: {
      'fakechromenavapp.gaiamobile.org': __dirname + '/fakechromenavapp',
    }
  });

  var actions, home, rocketbar, search, server, system;

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
    actions = new Actions(client);
    home = new Home(client);
    rocketbar = new Rocketbar(client);
    search = new Search(client);
    system = new System(client);
    system.waitForStartup();

    search.removeGeolocationPermission();
  });

  test('app w/o chrome should use placeholder', function() {
    // Open up the dialer and check for the title.
    var expectedTitle = 'Search the web';
    var appOrigin = 'app://calendar.gaiamobile.org';
    client.apps.launch(appOrigin);

    client.waitFor(function(){
      return system.appUrlbar.text() === expectedTitle;
    });
  });

  test('app /w chrome navigation should use manifest title', function() {
    // Hard-coded from app fixture.
    var expectedTitle = 'Fake Chrome Navigation';
    var appOrigin = 'app://fakechromenavapp.gaiamobile.org';
    client.apps.launch(appOrigin);

    client.waitFor(function(){
      return system.appUrlbar.text() === expectedTitle;
    });
  });

  test('website title uses page title', function() {
    // Use the home-screen search box to open up the system browser
    var url = server.url('sample.html');
    rocketbar.homescreenFocus();
    rocketbar.enterText(url + '\uE006');

    // Confirm title of the website.
    client.switchToFrame();
    client.waitFor(function(){
      // Hard-coded from the fixture.
      var expectedTitle = 'Sample page';
      return system.appUrlbar.text() === expectedTitle;
    });
  });
});
