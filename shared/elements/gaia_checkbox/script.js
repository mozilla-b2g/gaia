'use strict';
/* global ComponentUtils */

window.GaiaCheckbox = (function(win) {
  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaCheckboxBaseurl ||
    '/shared/elements/gaia_checkbox/';

  proto.createdCallback = function() {

    // A timestamp of the last click on the checkbox.
    // We use this to throttle click events to the control.
    // This is a temporary workaround for bug 1221886.
    this.lastClick = 0;
    this.throttleTime = 250;

    var shadow = this.createShadowRoot();
    this._template = template.content.cloneNode(true);

    this._wrapper = this._template.getElementById('checkbox');
    this._wrapper.addEventListener('click', this.handleClick.bind(this));

    this.configureClass();

    this.checked = this.hasAttribute('checked');
    this._wrapper.setAttribute('aria-checked', this.checked);
    this.setAttribute('role', 'presentation');

    shadow.appendChild(this._template);

    ComponentUtils.style.call(this, baseurl);
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
    e.preventDefault();
    e.stopImmediatePropagation();

    // Workaround for bug 1221886 - throttle clicks if needed.
    if (this.lastClick + this.throttleTime > Date.now()) {
      return;
    }
    this.lastClick = Date.now();

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
