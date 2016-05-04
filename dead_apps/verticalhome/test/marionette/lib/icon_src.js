/* global module */

'use strict';

/**
Helper function to determine which icon an grid item element is using.

@param {Marionette.Element} element of particular icon.
@return {String} url/uri for element.
*/
module.exports = function waitForIcon(element) {
  // XXX: this syncs up with the stamping logic in `renderIcon` in gaia_grid
  return element.scriptWith(function(el) {
    return el.dataset.testIcon;
  });
};
