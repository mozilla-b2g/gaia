'use strict';

var assert = require('assert');
var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');
var UtilityTray = require('./lib/utility_tray');

marionette('Browser - fullscreen utility tray access', function() {

  var client = marionette.client();

  var actions, utilityTray, rocketbar, system, frame, server;
  var screenHeight;

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
    system = client.loader.getAppClass('system');
    rocketbar = new Rocketbar(client);
    utilityTray = new UtilityTray(client);

    screenHeight = client.executeScript(function() {
      return window.innerHeight;
    });

    system.waitForFullyLoaded();

    var url = server.url('fullscreen_request.html');
    // Open the URL in a sheet.
    rocketbar.homescreenFocus();
    rocketbar.enterText(url, true);

    frame = client.helper.waitForElement(
      'div[transition-state="opened"] iframe[src="' + url + '"]');

    client.switchToFrame(frame);
    client.helper.waitForElement('body');
    client.findElement('#trigger').click();

    client.switchToFrame();
    client.helper.waitForElement('#permission-yes').click();
  });

  test('test fullscreen webpage utility tray access', function() {
    utilityTray.swipeDown(system.topPanel);
    utilityTray.waitForOpened();

    var sameIndex = system.utilityTray.scriptWith(function(element) {
      var fsElem = document.mozFullScreenElement;
      var fsIndex = getComputedStyle(fsElem).getPropertyValue('z-index');
      var utIndex = getComputedStyle(element).getPropertyValue('z-index');
      return fsIndex === utIndex;
    });
    assert.ok(sameIndex, 'UtilityTray has the same (maximum) zIndex value');

    var after = system.utilityTray.scriptWith(function(element) {
      var fsElem = document.mozFullScreenElement;
      var expected = Node.DOCUMENT_POSITION_FOLLOWING;
      return fsElem.compareDocumentPosition(element) === expected;
    });
    assert.ok(after, 'Utility tray is after in the DOM (on top)');
  });
});
