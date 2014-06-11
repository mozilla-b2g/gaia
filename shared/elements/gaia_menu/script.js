'use strict';
/* global ComponentUtils */

window.GaiaMenu = (function(win) {
  // Extend from HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaMenuBaseurl ||
    '/shared/elements/gaia_menu/';

  proto.createdCallback = function () {
    var shadow = this.createShadowRoot();

    navigator.mozL10n.translate(template);
    this._template = template.content.cloneNode(true);

    var cancelButton = this._template.querySelector('.gaia-menu-cancel');

    cancelButton.addEventListener('click', function () {
      this.hide();
      this.dispatchEvent(new CustomEvent('gaiamenu-cancel'));
    }.bind(this));

    shadow.appendChild(this._template);

    ComponentUtils.style.call(this, baseurl);

    window.addEventListener('localized', this.localize.bind(this));
  };

  proto.localize = function() {
    navigator.mozL10n.translate(this.shadowRoot.querySelector('button'));
  };

  proto.show = function() {
    this.removeAttribute('hidden');
  };

  proto.hide = function() {
    this.setAttribute('hidden', 'hidden');
  };

  var template = document.createElement('template');

  template.innerHTML =
    '<form role="dialog" data-type="action">' +
      '<content select="header"></content>' +
      '<menu>' +
        '<content select="button"></content>' +
        '<button data-l10n-id="cancel" class="gaia-menu-cancel">' +
          'Cancel</button>' +
      '</menu>' +
    '</form>';

  // Register and return the constructor
  return document.registerElement('gaia-menu', { prototype: proto });

})(window);
