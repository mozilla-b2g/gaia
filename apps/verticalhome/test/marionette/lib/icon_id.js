/* global module */

'use strict';

/**
Return the id of a particular icon.

@param {Marionette.Element} element of particular icon.
@return {String} id for the icon.
*/
module.exports = function iconId(element) {
  return element.scriptWith(function(el) {
    return el.dataset.identifier;
  });
};
