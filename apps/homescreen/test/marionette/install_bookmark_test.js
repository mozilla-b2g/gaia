'use strict';

var assert = require('assert');
var Browser = require('./lib/browser');
var Homescreen = require('./lib/homescreen');
var Server = require('./lib/server');

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
    var url;
    var expectedTitle = 'Sample page';

    setup(function() {
      var notifToaster;
      homescreen = new Homescreen(client);

      url = server.url('sample.html');

      // Running tests with B2G desktop on Linux, a 'Download complete'
      // notification-toaster will pop up and make tests failed
      client.switchToFrame();
      notifToaster = client.findElement('#notification-toaster');
      if (notifToaster.displayed()) {
        // Bug 952377: client.helper.waitForElementToDisappear(notifToaster)
        // will failed and got timeout.
        // (notifToaster.displayed() is always true)
        // So we workaround this to wait for .displayed get removed
        // from notifToaster
        client.helper.waitFor(function() {
          return notifToaster.getAttribute('class').indexOf('displayed') < 0;
        });
      }
      browser.backToApp();

      browser.searchBar.sendKeys(url);
      browser.searchButton.click();
      // this will fail on linux because a downloaded notification poped up
      client.helper.waitForElement(browser.bookmarkButton).click();
      client.helper.waitForElement(browser.addToHomeButton).click();
      homescreen.switchToBookmarkEditorFrame();
      homescreen.bookmarkEditor.bookmarkAddButton.click();
    });

    test(' sample.html is on homescreen with expected title',
      function() {
        client.switchToFrame();
        homescreen.launch();
        assert.ok(homescreen.getHomescreenIcon(expectedTitle) != null);
        assert.ok(
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
          homescreen.switchToBookmarkEditorFrame();
          homescreen.bookmarkEditor.bookmarkTitleField.clear();
          homescreen.bookmarkEditor
            .bookmarkTitleField.sendKeys(newExpectedTitle);
          // tap head element to make keyboard away
          homescreen.bookmarkEditor.bookmarkEntrySheetHead.tap();
          homescreen.bookmarkEditor.bookmarkAddButton.click();
        });

        test(' And we change the title of it', function() {
          client.switchToFrame();
          homescreen.launch();
          // aria-label won't change after we change bookmark title,
          // so we select the element using previous title
          assert.ok(homescreen.getHomescreenIcon(expectedTitle) != null);
          assert.ok(
            homescreen.getLabelOfBookmark(expectedTitle).text(),
            newExpectedTitle);
        });
      });
  });
});
