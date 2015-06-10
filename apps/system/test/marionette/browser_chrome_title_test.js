'use strict';

var urlUtility = require('url');
var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');

marionette('Browser Chrome - Title content', function() {

  var client = marionette.client({
    profile: {
      apps: {
        'fakechromenavapp.gaiamobile.org':
          __dirname + '/../apps/fakechromenavapp',
      }
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
    actions = client.loader.getActions();
    home = client.loader.getAppClass('verticalhome');
    rocketbar = new Rocketbar(client);
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
  });

  test('app w/o chrome should use name from manifest', function() {
    // Open up the calendar and check for the title.
    var expectedTitle = 'Calendar';
    var appOrigin = 'app://calendar.gaiamobile.org';
    client.apps.launch(appOrigin);

    client.waitFor(function(){
      return system.appUrlbar.text() === expectedTitle;
    });
  });

  test('app /w chrome navigation should use name from manifest', function() {
    // Hard-coded from app fixture.
    var expectedTitle = 'Fake Chrome Navigation';
    var appOrigin = 'app://fakechromenavapp.gaiamobile.org';
    client.apps.launch(appOrigin);

    client.waitFor(function(){
      return system.appUrlbar.text() === expectedTitle;
    });
  });

  test('website without app name should use hostname', function() {
    // Use the home-screen search box to open up the system browser
    var url = server.url('sample.html');
    var hostname = urlUtility.parse(url).hostname;
    rocketbar.homescreenFocus();
    rocketbar.enterText(url, true);
    system.gotoBrowser(url);
    client.switchToFrame();

    client.waitFor(function(){
      return system.appUrlbar.text() === hostname;
    });
  });

  test('Dont persist application-name', function() {

    // Use the home-screen search box to open up the system browser
    var customAppUrl = server.url('app-name.html');
    var sampleUrl = server.url('sample.html');
    var sampleHostname = urlUtility.parse(sampleUrl).hostname;

    rocketbar.homescreenFocus();
    rocketbar.enterText(customAppUrl, true);
    system.gotoBrowser(customAppUrl);
    client.switchToFrame();

    client.waitFor(function(){
      return system.appUrlbar.text() === 'Custom App Name';
    });

    system.appUrlbar.tap();
    rocketbar.enterText(sampleUrl, true);
    system.gotoBrowser(sampleUrl);
    client.switchToFrame();

    client.waitFor(function(){
      return system.appUrlbar.text() === sampleHostname;
    });
  });

});
