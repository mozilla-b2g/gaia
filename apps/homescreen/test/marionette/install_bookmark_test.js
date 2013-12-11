'use strict';

var assert = require('assert');
var Browser = require('./lib/browser');
var Homescreen = require('./lib/homescreen');
var Server = require('./lib/server');
var BookmarkEditor = require('./lib/bookmark_editor');

marionette('Install bookmark on homescreen', function() {
  var client = marionette.client({
        settings: {
          // disable keyboard ftu because it blocks our display
          'keyboard.ftu.enabled': false,
          'lockscreen.enabled': false,
          'ftu.manifestURL': null
        }
      });
  var browser;
  var homescreen;
  var bookmarkEditor;
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
    client.setSearchTimeout(10000);
  });

  suite(' > Navigate to sample.html and bookmark it on homescreen', function() {
    var url;
    var expectedTitle = 'Sample page';

    setup(function() {
      bookmarkEditor = new BookmarkEditor(client);

      url = server.url('sample.html');
      browser.searchBar.sendKeys(url);
      browser.searchButton.click();
      browser.bookmarkButton.click();
      client.helper.waitForElement(browser.addToHomeButton).click();
      bookmarkEditor.backToApp();
      bookmarkEditor.bookmarkAddButton.click();
    });

    test(' sample.html is on homescreen with expected title',
      function() {
        var iconOnHomeScreen;
        var labelOfBookmark;

        client.switchToFrame();
        homescreen = new Homescreen(client);
        homescreen.launch();

        iconOnHomeScreen =
          client.findElement('li.icon[aria-label="' + expectedTitle + '"]');
        labelOfBookmark =
          client.findElement(
            'li.icon[aria-label="' +
            expectedTitle + '"] span.labelWrapper > span');
        assert.ok(iconOnHomeScreen != null);
        assert.ok(labelOfBookmark.text(), expectedTitle);
    });

    suite(' > Change the title of bookmark on homescreen to new expected title',
      function() {
        var iconOnHomeScreen;
        var labelOfBookmark;
        var newExpectedTitle = 'New Title';

        setup(function() {
          bookmarkEditor.waitForDisappearance();
          browser.backToApp();
          client.helper.waitForElement(browser.bookmarkButton).click();
          client.helper.waitForElement(browser.addToHomeButton).click();
          bookmarkEditor.backToApp();
          bookmarkEditor.bookmarkTitleField.clear();
          bookmarkEditor.bookmarkTitleField.sendKeys(newExpectedTitle);
          // tap head element to make keyboard away
          bookmarkEditor.bookmarkEntrySheetHead.tap();
          bookmarkEditor.bookmarkAddButton.click();
        });

        test(' And we change the title of it', function() {
          client.switchToFrame();
          homescreen = new Homescreen(client);
          homescreen.launch();
          iconOnHomeScreen =
            client.findElement('li.icon[aria-label="' + expectedTitle + '"]');
          assert.ok(iconOnHomeScreen != null);
          labelOfBookmark =
            client.findElement(
              'li.icon[aria-label="' +
              expectedTitle + '"] span.labelWrapper > span');
          assert.ok(labelOfBookmark.text(), newExpectedTitle);
        });
      });
  });
});

