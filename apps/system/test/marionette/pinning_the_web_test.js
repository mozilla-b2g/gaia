'use strict';

var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');
var assert = require('assert');


marionette('Pinning the Web', function() {

  var client = marionette.client({
    profile: {
      settings: {
        'dev.gaia.pinning_the_web': true
      }
    }
  });

  var rocketbar, server, system, actions;

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
    actions = client.loader.getActions();
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

  test('Pin browser chrome', function() {
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
    // Check that browser chrome is smaller after pinning
    var chromeRectBefore = system.appChrome.scriptWith(function(e) {
      return e.getBoundingClientRect();
    });
    system.pinButton.click();
    var chromeRectAfter = system.appChrome.scriptWith(function(e) {
      return e.getBoundingClientRect();
    });
    assert.ok(chromeRectBefore.height > chromeRectAfter.height);
  });

  test('Manually expand browser chrome', function() {
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
    // Check that browser chrome is smaller after pinning
    var chromeRectBefore = system.appChrome.scriptWith(function(e) {
      return e.getBoundingClientRect();
    });
    system.pinButton.click();
    var chromeRectAfterPin = system.appChrome.scriptWith(function(e) {
      return e.getBoundingClientRect();
    });
    assert.ok(chromeRectBefore.height > chromeRectAfterPin.height);
    // Check that browser chrome expands when tapped
    actions.wait(1).tap(system.appUrlbar).perform();
    client.waitFor(function() {
      var chromeRectAfterExpand = system.appChrome.scriptWith(function(e) {
        return e.getBoundingClientRect();
      });
      return chromeRectAfterExpand.height == chromeRectBefore.height;
    });
    // Check that browser chrome focuses on second tap
    actions.tap(system.appUrlbar).perform();
    client.waitFor(function() {
      return rocketbar.backdrop.displayed();
    });
  });
});
