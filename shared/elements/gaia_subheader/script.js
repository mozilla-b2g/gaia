
window.GaiaSubheader = (function(win) {
  'use strict';

  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaSubheaderBaseurl ||
    '/shared/elements/gaia_subheader/';

  proto.createdCallback = function() {
    this._addStyle();
  };

  proto._addStyle = function() {
    var style = document.createElement('style');
    var url = baseurl + 'style.css';
    style.innerHTML = '@import url(' + url + ')';
    this.appendChild(style);
  };

  // Register and return the constructor
  return document.registerElement('gaia-subheader', { prototype: proto });
})(window);
