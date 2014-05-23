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
    this._input = this._template.querySelector('input[type="checkbox"]');

    var checked = this.getAttribute('checked');
    if (checked !== null) {
      this._input.checked = true;
    }

    var label = this._template.getElementById('switch-label');
    label.addEventListener('click', this.handleClick.bind(this));

    shadow.appendChild(this._template);

    ComponentUtils.style.call(this, baseurl);
  };

  proto.handleClick = function(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    this.checked = !this.checked;
    var event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    this.dispatchEvent(event);
  };

  /**
   * Proxy the checked property to the input element.
   */
  Object.defineProperty( proto, 'checked', {
    get: function() {
      return this._input.checked;
    },
    set: function(value) {
      this._input.checked = value;
    }
  });

  /**
   * Proxy the name property to the input element.
   */
  Object.defineProperty( proto, 'name', {
    get: function() {
      return this.getAttribute('name');
    },
    set: function(value) {
      this.setAttribute('name', value);
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
  template.innerHTML = '<label id="switch-label" class="pack-switch">' +
      '<input type="checkbox">' +
      '<span><content select="label"></content></span>' +
    '</label>';

  // Register and return the constructor
  return document.registerElement('gaia-switch', { prototype: proto });
})(window);
