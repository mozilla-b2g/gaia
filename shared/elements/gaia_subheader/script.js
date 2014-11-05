'use strict';
/* global ComponentUtils */

window.GaiaSubheader = (function(win) {
  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaSubheaderBaseurl ||
    '/shared/elements/gaia_subheader/';

  proto.createdCallback = function() {
    ComponentUtils.style.call(this, baseurl);
  };

  // Register and return the constructor
  return document.registerElement('gaia-subheader', { prototype: proto });
})(window);
