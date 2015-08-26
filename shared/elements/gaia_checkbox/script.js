'use strict';
/* global ComponentUtils */

window.GaiaCheckbox = (function(win) {
  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaCheckboxBaseurl ||
    '/shared/elements/gaia_checkbox/';

  proto.createdCallback = function() {
    var shadow = this.createShadowRoot();
    this._template = template.content.cloneNode(true);

    this._wrapper = this._template.getElementById('checkbox');
    this._wrapper.addEventListener('click', this.handleClick.bind(this));

    this.configureClass();

    shadow.appendChild(this._template);

    this.checked = this.hasAttribute('checked');
    this._wrapper.setAttribute('aria-checked', this.checked);
    this.setAttribute('role', 'presentation');

    // When events are triggered on content nodes, they do not bubble to
    // our custom element. We add an event listener on our children so we can
    // intercept the click and, process the state change, and notify listeners.
    // Platform bug 887541.
    setTimeout(function nextTick() {
      var label = this.querySelector('label');
      if (!label) {
        return;
      }
    }.bind(this));

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

  /**
   * Handles a click event on the shadow dom.
   * We handle checking/unchecking of the checkbox and proxy the click
   * event to any click listeners on the gaia-radio. This is a nice transition
   * that preserves backwards behavior and should make it easier to port apps.
   */
  proto.handleClick = function(e) {
    // We add this event listener twice (see above) on both the content and
    // custom element nodes. We need to stop the event propagation to prevent
    // this event from firing against both nodes.
    e.stopImmediatePropagation();

    // Dispatch a click event to any listeners to the app.
    // We should be able to remove this when bug 887541 lands.
    var event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    this.dispatchEvent(event);

    if (!event.defaultPrevented) {
      this.checked = !this.checked;
      this._wrapper.setAttribute('aria-checked', this.checked);
    }

    // Dispatch a change event for the gaia-switch.
    this.dispatchEvent(new CustomEvent('change', {
      bubbles: true,
      cancelable: false
    }));
  };

  /**
   * Configures the class for the element.
   */
  proto.configureClass = function() {
    this._wrapper.className = this.className;
  };

  /**
   * Proxy className property to the wrapper.
   */
  proto.attributeChangedCallback = function(name, from, to) {
    if (name === 'class') {
      this._wrapper.className = to;
    }
  };

  /**
   * Proxy the checked property to the input element.
   */
  Object.defineProperty(proto, 'checked', {
    get: function() {
      return this._checked || false;
    },
    set: function(value) {
      this._wrapper.classList.toggle('checked', value);
      this._checked = value;
    }
  });

  /**
   * Proxy the name property to the input element.
   */
  Object.defineProperty(proto, 'name', {
    get: function() {
      return this.getAttribute('name');
    },
    set: function(value) {
      this.setAttribute('name', value);
    }
  });

  var template = document.createElement('template');

  template.innerHTML =
    `<span id="checkbox" role="checkbox">
      <span role="presentation"><content select="label"></content></span>
    </span>`;

  // Register and return the constructor
  return document.registerElement('gaia-checkbox', { prototype: proto });
})(window);
