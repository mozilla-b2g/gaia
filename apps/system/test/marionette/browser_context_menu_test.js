'use strict';

var Server = require('../../../../shared/test/integration/server');
var Messages = require('../../../sms/test/marionette/lib/messages');
var Rocketbar = require('./lib/rocketbar');
var assert = require('assert');

marionette('Browser Context Menu', function() {

  var client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  var rocketbar, server, system, actions, home, messagesApp;

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
    home = client.loader.getAppClass('homescreen');
    rocketbar = new Rocketbar(client);
    system.waitForFullyLoaded();
    actions = client.loader.getActions();
    messagesApp = Messages.create(client);
    messagesApp.loadMocks();
  });

  test('share url', function() {
    var url = server.url('windowopen.html');
    rocketbar.goToURL(url);
    system.shareLink();

    system.getActivityOptionMatching('sms').tap();
    var smsFrame = messagesApp.waitForAppToAppear();
    client.switchToFrame(smsFrame);

    assert.equal(messagesApp.Composer.messageInput.text(), url);
  });

  test('save image', function() {
    var url = server.url('sample_image.html');
    rocketbar.goToURL(url);
    system.gotoBrowser(url);

    var image = client.helper.waitForElement('img');
    actions.longPress(image, 0.5).perform(function() {
      system.saveImage();

      client.switchToFrame();
      client.waitFor(function() {
        return system.toaster.displayed();
      });

      client.waitFor(function() {
        return !system.toaster.displayed();
      });

      // This does not work on desktop. See:
      // tests/python/gaia-ui-tests/gaiatest/tests/functional/browser/manifest.ini#L22
      // and Bug 1091622

      // assert(system.getSdCardFilesMatching('.png').length === 1);
    });
  });
});
