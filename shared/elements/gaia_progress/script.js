'use strict';
/* global ComponentUtils */

window.GaiaProgress = (function(win) {
  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaProgressBaseurl || '/shared/elements/gaia_progress/';

  proto.createdCallback = function() {
    var shadow = this.createShadowRoot();

    this._template = template.content.cloneNode(true);

    shadow.appendChild(this._template);

    ComponentUtils.style.call(this, baseurl);
  };

  var template = document.createElement('template');
  template.innerHTML = '<div id="progress"></div>';

  // Register and return the constructor
  return document.registerElement('gaia-progress', { prototype: proto });
})(window);
