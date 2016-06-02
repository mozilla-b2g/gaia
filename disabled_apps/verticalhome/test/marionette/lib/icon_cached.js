/* global module */

'use strict';

/**
Helper function to determine if the icon is cached in idb.

@param {Marionette.Element} element of particular icon.
@return {String} url/uri for element.
*/
module.exports = function iconCached(element) {
  // This syncs up with the logic after iconblobload event in app.js
  var list = element.getAttribute('className');
  return list && list.indexOf('test-icon-cached') !== 1;
};

