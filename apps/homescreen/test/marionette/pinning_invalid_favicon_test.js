'use strict';
/* global __dirname */

var Pinning = require(
  '../../../../apps/system/test/marionette/lib/pinning_the_web');
var Server = require('../../../../shared/test/integration/server');

var assert = require('assert');

marionette('Homescreen - Pinning Favicon Failure', function() {
  var client = marionette.client();

  var pinning, home, server, system;

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/invalid_favicon/',
      function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  var url;
  setup(function() {
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    pinning = new Pinning(client, server);
    system.waitForFullyLoaded();
    home.waitForLaunch();

    url = server.url('sample.html');
    client.switchToFrame();
    pinning.openAndPinPage(url);

    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());
  });

  test('Invalid icons get default icon assigned', function() {
    var card = home.getCard(url);
    assert.equal('', home.getCardImageUrl(card), 'Card has no bg image');
  });

});
