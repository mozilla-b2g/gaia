'use strict';

var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');

marionette('Browser Chrome - Title content', function() {

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    apps: {
      'fakechromenavapp.gaiamobile.org':
        __dirname + '/../apps/fakechromenavapp',
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
    system.waitForStartup();
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
    system.gotoBrowser(url);
    client.switchToFrame();

    client.waitFor(function(){
      // Hard-coded from the fixture.
      var expectedTitle = 'Sample page';
      return system.appUrlbar.text() === expectedTitle;
    });
  });

  test('Dont persist application-name', function() {

    // Use the home-screen search box to open up the system browser
    var customAppUrl = server.url('app-name.html');
    var sampleUrl = server.url('sample.html');

    rocketbar.homescreenFocus();
    rocketbar.enterText(customAppUrl + '\uE006');
    system.gotoBrowser(customAppUrl);
    client.switchToFrame();

    client.waitFor(function(){
      return system.appUrlbar.text() === 'Custom App Name';
    });

    system.appUrlbar.tap();
    rocketbar.enterText(sampleUrl + '\uE006');
    system.gotoBrowser(sampleUrl);
    client.switchToFrame();

    client.waitFor(function(){
      return system.appUrlbar.text() === 'Sample page';
    });
  });

});
