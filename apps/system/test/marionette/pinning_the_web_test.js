'use strict';

var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');

marionette('Pinning the Web', function() {

  var client = marionette.client({
    profile: {
      settings: {
        'dev.gaia.pinning_the_web': true
      }
    }
  });

  var rocketbar, server, system;

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
    system = client.loader.getAppClass('system');
    rocketbar = new Rocketbar(client);
    system.waitForFullyLoaded();
  });

  test('Shows the dialog when clicking on the siteIcon', function() {
    var url = server.url('sample.html');
    rocketbar.homescreenFocus();
    rocketbar.enterText(url, true);
    var frame = client.helper.waitForElement(
      'div[transition-state="opened"] iframe[src="' + url + '"]');
    client.switchToFrame(frame);
    client.helper.waitForElement('body');
    client.switchToFrame();
    client.waitFor(function() {
      system.siteIcon.click();
      return system.pinDialog.displayed();
    });
  });
});
