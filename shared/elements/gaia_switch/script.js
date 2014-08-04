'use strict';
/* global ComponentUtils */

window.GaiaSwitch = (function(win) {
  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaSwitchBaseurl ||
    '/shared/elements/gaia_switch/';

  proto.createdCallback = function() {
    var shadow = this.createShadowRoot();
    this._template = template.content.cloneNode(true);
    this._inner = this._template.firstElementChild;

    this.count = 0;
    this.checked = this.hasAttribute('checked');
    this._inner.addEventListener('click', this.onClick.bind(this));

    shadow.appendChild(this._template);
    ComponentUtils.style.call(this, baseurl);
  };

  proto.toggle = function(value) {
    this.checked = !arguments.length ? !this.hasAttribute('checked') : value;
  };

  proto.setChecked = function(value) {
    value = !!value;

    if (this._checked === value) { return; }

    var changed = this._checked !== undefined;
    this._checked = value;

    if (value) {
      this.setAttribute('checked', '');
      this._inner.setAttribute('checked', '');
    } else {
      this.removeAttribute('checked');
      this._inner.removeAttribute('checked');
    }

    if (changed) {
      var event = new CustomEvent('change');
      setTimeout(this.dispatchEvent.bind(this, event));
    }
  },

  proto.attributeChangedCallback = function(attr, oldVal, newVal) {
    if (attr === 'checked') {
      this.checked = newVal !== null;
    }
  };

  proto.onClick = function(e) {
    this.toggle();
  };

  /**
   * Proxy the checked property to the input element.
   */
  Object.defineProperty(proto, 'checked', {
    get: function() {
      return this._checked;
    },
    set: function(value) {
      this.setChecked(value);
    }
  });

  // HACK: Create a <template> in memory at runtime.
  // When the custom-element is created we clone
  // this template and inject into the shadow-root.
  // Prior to this we would have had to copy/paste
  // the template into the <head> of every app that
  // wanted to use <gaia-switch>, this would make
  // markup changes complicated, and could lead to
  // things getting out of sync. This is a short-term
  // hack until we can import entire custom-elements
  // using HTML Imports (bug 877072).
  var template = document.createElement('template');
  // template.innerHTML = '<label id="switch-label" class="pack-switch">' +
  //     '<input type="checkbox">' +
  //     '<span></span>' +
  //   '</label>';

  template.innerHTML = '<button class="inner">' +
      '<div class="track">' +
        '<div class="head">' +
          '<div class="circle-1"></div>' +
          '<div class="circle-2"></div>' +
        '</div>' +
      '</div>' +
    '</button>';

  // Register and return the constructor
  return document.registerElement('gaia-switch', { prototype: proto });
})(window);
