'use strict';
/* global ComponentUtils */

/**
 * The gaia-confirm component displays a dialog in which the user has a
 * choice to confirm or cancel the action. It may be displayed along with a
 * title, description, and image. Buttons may also be configured.
 * @requires GaiaButtons
 */
window.GaiaConfirm = (function(win) {
  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaConfirmBaseurl ||
    '/shared/elements/gaia_confirm/';

  proto.createdCallback = function() {
    var shadow = this.createShadowRoot();
    this._template = template.content.cloneNode(true);

    shadow.appendChild(this._template);
    ComponentUtils.style.call(this, baseurl);
  };

  proto.attachedCallback = function() {
    var confirm = this.querySelector('gaia-buttons .confirm');
    var cancel = this.querySelector('gaia-buttons .cancel');

    if (confirm) {
      confirm.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('confirm'));
      });
    }

    if (cancel) {
      confirm.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('cancel'));
      });
    }
  };

  var template = document.createElement('template');
  template.innerHTML = '<form role="dialog" class="confirm">' +
      '<section>' +
        '<content select="h1"></content>' +
        '<content select="p"></content>' +
      '</section>' +
      '<content select="gaia-buttons">' +
      '</content>' +
    '</form>';

  // Register and return the constructor
  return document.registerElement('gaia-confirm', { prototype: proto });

})(window);
