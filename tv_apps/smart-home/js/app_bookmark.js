/* global Application */

(function(exports) {
  'use strict';

  function AppBookmark(options) {
    Application.prototype.constructor.call(this, options);
    this.thumbnail = options.thumbnail;
    this.launchURL = options.launchURL;
  };

  AppBookmark.prototype = Object.create(Application.prototype);

  AppBookmark.prototype.constructor = AppBookmark;

  exports.AppBookmark = AppBookmark;
}(window));
