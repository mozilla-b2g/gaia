'use strict';
/* global ComponentUtils */

window.GaiaButtons = (function(win) {
  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaButtonsBaseurl ||
    '/shared/elements/gaia_buttons/';

  proto.createdCallback = function() {
    ComponentUtils.style.call(this, baseurl);
  };

  // Register and return the constructor
  return document.registerElement('gaia-buttons', { prototype: proto });
})(window);
