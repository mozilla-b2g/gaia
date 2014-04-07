'use strict';

/* global module */
var FlowManager = {
  saveBookmark: function(url, client, server, homescreen, browser) {
    // Running tests with B2G desktop on Linux, a 'Download complete'
    // notification-toaster will pop up and make tests failed
    client.switchToFrame();
      
    var notifToaster = client.findElement('#notification-toaster');
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
    browser.searchBar.sendKeys(server.url(url));
    browser.searchButton.click();
    // this will fail on linux because a downloaded notification poped up
    client.helper.waitForElement(browser.bookmarkButton).click();
    client.helper.waitForElement(browser.addToHomeButton).click();
    homescreen.switchToBookmarkEditorFrame();
    homescreen.bookmarkEditor.bookmarkAddButton.click();
  },

  setTitleToBookmark: function(newTitle, homescreen) {
    homescreen.switchToBookmarkEditorFrame();
    homescreen.bookmarkEditor.bookmarkTitleField.clear();
    homescreen.bookmarkEditor.bookmarkTitleField.sendKeys(newTitle);
    // tap head element to make keyboard away
    homescreen.bookmarkEditor.bookmarkEntrySheetHead.tap();
    homescreen.bookmarkEditor.bookmarkEditButton.click();
  }
};

module.exports = FlowManager;
