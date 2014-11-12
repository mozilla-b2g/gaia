'use strict';
/* global ComponentUtils */

window.GaiaSubheader = (function(win) {
  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaShelfPictureBaseurl ||
    '/shared/elements/shelf_picture/';

  proto.createdCallback = function() {
    var shadow = this.createShadowRoot();
    this._template = template.content.cloneNode(true);
    this._background = this._template.querySelector('#background');
    this._background.style.background = '#ff0000 no-repeat center center';

    shadow.appendChild(this._template);

    ComponentUtils.style.call(this, baseurl);
  };

  var template = document.createElement('template');
  template.innerHTML = `<div id="background">
  </div>`;

  // Register and return the constructor
  return document.registerElement('shelf-picture', { prototype: proto });
})(window);
