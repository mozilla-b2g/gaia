'use strict';

var assert = require('assert');
var Browser = require('./lib/browser');
var Homescreen = require('./lib/homescreen');
var Server = require('./lib/server');
var FlowManager = require('./lib/flow_manager');
var Actions = require('marionette-client').Actions;

marionette('Remove bookmark on homescreen', function() {
  var client = marionette.client({
    settings: {
      'keyboard.ftu.enabled': false
    }
  }), browser, homescreen, server;

  suiteSetup(function(done) {
    Server.create(function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  setup(function() {
    browser = new Browser(client);
    browser.launch();
    client.helper.waitForElement('body.loaded');
  });

  suite(' > Navigate to sample.html and bookmark it on homescreen', function() {
    var title = 'Sample page';

    setup(function() {
      homescreen = new Homescreen(client);
      FlowManager.saveBookmark('sample.html', client, server, homescreen,
                               browser);
      homescreen.bookmarkEditor.waitForDisappearance();
      homescreen.launch();
      var icon = homescreen.getHomescreenIcon(title);
      // Edit mode
      (new Actions(client)).longPress(icon, 1.5).perform();
      var crossElem = homescreen.getCrossElementForIcon(title);
      crossElem.tap();
      homescreen.switchToBookmarkRemoverFrame();
      // Remove bookmark
      homescreen.bookmarkRemover.bookmarkRemoveButton.click();
    });

    test(' and bookmark removed', function() {
      client.switchToFrame();
      homescreen.launch();
      assert.ok(!homescreen.isHomescreenIcon(title));
    });
  });
});
