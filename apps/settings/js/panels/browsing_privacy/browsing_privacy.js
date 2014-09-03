define(function(require) {
  'use strict';

  function BrowsingPrivacy() {}

  /**
   * Clear browser history.
   */
  BrowsingPrivacy.prototype.clearHistory = function() {
    navigator.mozSettings.createLock().set({'clear.browser.history': true});
  };

  /**
   * Clear browser private data.
   */
  BrowsingPrivacy.prototype.clearPrivateData = function() {
    navigator.mozSettings.createLock().set({
      'clear.browser.private-data': true
    });
  };

  /**
   * Clear bookmarks data
   */
  BrowsingPrivacy.prototype.clearBookmarksData = function() {
    navigator.mozSettings.createLock().set({'clear.browser.bookmarks': true});
  };

  return function() {
    return new BrowsingPrivacy();
  };
});
