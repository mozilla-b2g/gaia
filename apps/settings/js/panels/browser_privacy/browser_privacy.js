define(function(require) {
  'use strict';

  function BrowserPrivacy() {}

  /**
   * Clear browser history.
   */
  BrowserPrivacy.prototype.clearHistory = function() {
    navigator.mozSettings.createLock().set({'clear.browser.history': true});
  };

  /**
   * Clear browser private data.
   */
  BrowserPrivacy.prototype.clearPrivateData = function() {
    navigator.mozSettings.createLock().set({
      'clear.browser.private-data': true
    });
  };

  /**
   * Clear bookmarks data
   */
  BrowserPrivacy.prototype.clearBookmarksData = function() {
    navigator.mozSettings.createLock().set({'clear.browser.bookmarks': true});
  };

  return function() {
    return new BrowserPrivacy();
  };
});
