/* global module */

'use strict';

/**
Determines the current state of the icon on the grid.

@param {Marionette.Element} element of particular icon.
@return {String} state of the app icon.
*/
module.exports = function iconState(element) {
  // XXX: this syncs up with the stamping logic in `renderIcon` in gaia_grid
  return element.scriptWith(function(el) {
    return el.dataset.appState;
  });
};
