'use strict';

var assert = require('assert');
var Browser = require('./lib/browser');
var Homescreen = require('./lib/homescreen');
var Server = require('./lib/server');
var FlowManager = require('./lib/flow_manager');

marionette('Install bookmark on homescreen', function() {
  var client = marionette.client({
        settings: {
          // disable keyboard ftu because it blocks our display
          'keyboard.ftu.enabled': false
        }
      });
  var browser;
  var homescreen;
  var server;

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

  suite(' > Navigate to sample.html and bookmark it on homescreen',
  function() {
    var expectedTitle = 'Sample page';

    setup(function() {
      homescreen = new Homescreen(client);
      FlowManager.saveBookmark('sample.html', client, server, homescreen,
                               browser);
    });

    test(' sample.html is on homescreen with expected title',
      function() {
        client.switchToFrame();
        homescreen.launch();
        assert.ok(homescreen.getHomescreenIcon(expectedTitle) != null);
        assert.equal(
          homescreen.getLabelOfBookmark(expectedTitle).text(),
          expectedTitle);
    });

    suite(
      ' > Change the title of bookmark on homescreen to new expected title',
      function() {
        var newExpectedTitle = 'New Title';

        setup(function() {
          homescreen.bookmarkEditor.waitForDisappearance();
          browser.backToApp();
          client.helper.waitForElement(browser.bookmarkButton).click();
          client.helper.waitForElement(browser.addToHomeButton).click();
          FlowManager.setTitleToBookmark(newExpectedTitle, homescreen);
        });

        test(' And we change the title of it', function() {
          client.switchToFrame();
          homescreen.launch();
          // aria-label won't change after we change bookmark title,
          // so we select the element using previous title
          assert.ok(homescreen.getHomescreenIcon(expectedTitle) != null);
          assert.equal(
            homescreen.getLabelOfBookmark(expectedTitle).text(),
            newExpectedTitle);
        });
      });
  });
});
