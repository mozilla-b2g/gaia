
window.GaiaToolbar = (function(win) {
  /*global ComponentUtils*/
  'use strict';

  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaToolbarBaseurl ||
    '/shared/elements/gaia_toolbar/';

  /**
   * Runs when an instance of the
   * element is first created.
   *
   * When use this moment to create the
   * shadow-dom, inject our template
   * content, setup event listeners
   * and set the draw state to match
   * the initial `open` attribute.
   *
   * @private
   */
  proto.createdCallback = function() {
    ComponentUtils.style.call(this, baseurl);
  };

  // Register and return the constructor
  return document.registerElement('gaia-toolbar', { prototype: proto });
})(window);
