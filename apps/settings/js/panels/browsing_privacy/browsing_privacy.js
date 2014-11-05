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

  return function() {
    return new BrowsingPrivacy();
  };
});
