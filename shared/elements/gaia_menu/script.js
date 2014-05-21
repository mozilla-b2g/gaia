'use strict';

window.GaiaMenu = (function(win) {
  // Extend from HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaMenuBaseurl ||
    '/shared/elements/gaia_menu/';

  proto.createdCallback = function () {
    var shadow = this.createShadowRoot();
    this._template = template.content.cloneNode(true);
    this._styleHack();

    var cancelButton = this._template.querySelector('.gaia-menu-cancel');

    cancelButton.addEventListener('click', function () {
      this.hide();
      this.dispatchEvent(new CustomEvent('gaiamenu-cancel'));
    }.bind(this));

    shadow.appendChild(this._template);
  };

  proto.show = function() {
    this.removeAttribute('hidden');
  };

  proto.hide = function() {
    this.setAttribute('hidden', 'hidden');
  };

  proto._styleHack = function() {
    var style = this._template.querySelector('style');
    this.appendChild(style.cloneNode(true));
  };

  var stylesheet = baseurl + 'style.css';
  var template = document.createElement('template');

  template.innerHTML =
    '<style scoped>' +
      '@import url(' + stylesheet + ');' +
    '</style>' +
    '<form role="dialog" data-type="action">' +
      '<content select="header"></content>' +
      '<menu>' +
        '<content select="button"></content>' +
        '<button data-l10n="cancel" class="gaia-menu-cancel">Cancel</button>' +
      '</menu>' +
    '</form>';

  // Register and return the constructor
  return document.registerElement('gaia-menu', { prototype: proto });

})(window);
