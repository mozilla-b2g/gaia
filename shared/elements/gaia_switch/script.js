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

    // Proxy RTL changes to the shadow root so we can style for RTL.
    var dirObserver = new MutationObserver(this.updateInternalDir.bind(this));
    dirObserver.observe(document.documentElement, {
      attributeFilter: ['dir'],
      attributes: true
    });
    this.updateInternalDir();
  };

  proto.updateInternalDir = function() {
    var internal = this.shadowRoot.firstElementChild;
    if (document.documentElement.dir === 'rtl') {
      internal.setAttribute('dir', 'rtl');
    } else {
      internal.removeAttribute('dir');
    }
  };

  proto.handleClick = function(e) {
    e && e.preventDefault();
    e && e.stopImmediatePropagation();

    // Dispatch a click event.
    var event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    this.dispatchEvent(event);

    if (!event.defaultPrevented) {
      this.checked = !this.checked;
    }

    // Dispatch a change event for the gaia-switch.
    this.dispatchEvent(new CustomEvent('change', {
      bubbles: true,
      cancelable: false
    }));
  };

  /**
   * Allows users to simulate clicking through javascript.
   */
  proto.click = function() {
    this.handleClick();
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

  /**
   * Proxy the input type.
   */
  Object.defineProperty( proto, 'type', {
    get: function() {
      return 'gaia-switch';
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
  template.innerHTML = `<label id="switch-label" class="pack-switch">
      <input type="checkbox">
      <span><content select="label"></content></span>
    </label>`;

  // Register and return the constructor
  return document.registerElement('gaia-switch', { prototype: proto });
})(window);
