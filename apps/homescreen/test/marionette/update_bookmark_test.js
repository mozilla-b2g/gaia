'use strict';

var assert = require('assert');
var Browser = require('./lib/browser');
var Homescreen = require('./lib/homescreen');
var Server = require('./lib/server');
var FlowManager = require('./lib/flow_manager');
var Actions = require('marionette-client').Actions;

marionette('Update bookmark on homescreen', function() {
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
    var title = 'Sample page',
        newTitle = 'Sample page 2';

    setup(function() {
      homescreen = new Homescreen(client);
      FlowManager.saveBookmark('sample.html', client, server, homescreen,
                               browser);
      homescreen.bookmarkEditor.waitForDisappearance();
      homescreen.launch();
      var icon = homescreen.getHomescreenIcon(title);
      (new Actions(client)).longPress(icon, 1.5).perform();
      // Waiting for icon scales and in the end icons start to dancing
      homescreen.waitForHomescreenIcon(title).tap();
      FlowManager.setTitleToBookmark(newTitle, homescreen);
    });

    test(' sample.html has a new title', function() {
      client.switchToFrame();
      homescreen.launch();
      assert.ok(homescreen.getHomescreenIcon(title) !== null);
      assert.equal(homescreen.getLabelOfBookmark(title).text(), newTitle);
    });
  });
});
