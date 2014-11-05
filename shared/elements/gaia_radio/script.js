'use strict';
/* global ComponentUtils */

window.GaiaRadio = (function(win) {
  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaRadioBaseurl ||
    '/shared/elements/gaia_Radio/';

  proto.createdCallback = function() {
    var shadow = this.createShadowRoot();
    this._template = template.content.cloneNode(true);

    this._wrapper = this._template.getElementById('radio');
    this._wrapper.addEventListener('click', this.handleClick.bind(this));

    // The default 'radio' accessibility role could be overridden.
    if (this.dataset.role) {
      this._wrapper.setAttribute('role', this.dataset.role);
    }

    if (!this.hasAttribute('role')) {
      // The root element has no accessibility use, purge it from the tree.
      this.setAttribute('role', 'presentation');
    }

    this.configureClass();

    shadow.appendChild(this._template);

    this.checked = this.hasAttribute('checked');
    this._wrapper.setAttribute('aria-checked', this.checked);

    // When events are triggered on content nodes, they do not bubble to
    // our custom element. We add an event listener on our children so we can
    // intercept the click and, process the state change, and notify listeners.
    // Platform bug 887541.
    setTimeout(function nextTick() {
      var label = this.querySelector('label, p');
      if (!label) {
        return;
      }
      label.addEventListener('click', this.handleClick.bind(this));
    }.bind(this));

    ComponentUtils.style.call(this, baseurl);
  };

  /**
   * Handles a click event on the shadow dom.
   * We handle checking/unchecking of radio elements and proxy the click
   * event to any click listeners on the gaia-radio. This is a nice transition
   * that preserves backwards behavior and should make it easier to port apps.
   */
  proto.handleClick = function(e) {

    // Uncheck other radio elements with the same name and check this one.
    var relevant = document.querySelectorAll(
      'gaia-radio[name="' + this.getAttribute('name') + '"]');
    for (var i = 0, iLen = relevant.length; i < iLen; i++) {
      relevant[i].checked = false;
    }
    this.checked = !this.checked;

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
  };

  /**
   * Configures the class for the element.
   */
  proto.configureClass = function() {
    this._wrapper.className = this.className;
  };

  /**
   * Handle setting/getting of the checked property.
   */
  Object.defineProperty(proto, 'checked', {
    get: function() {
      return this._checked;
    },
    set: function(value) {
      this._wrapper.classList.toggle('checked', value);
      this._wrapper.setAttribute('aria-checked', value);
      this._checked = value;
    }
  });

  // Handle both p and label elements for now to support existing
  // building blocks. Mainly radio labels and inputs inside a list
  // as this is a rather common use case.
  var template = document.createElement('template');
  template.innerHTML = '<span role="radio" id="radio">' +
      '<span><content select="p,label"></content></span>' +
    '</span>';

  // Register and return the constructor
  return document.registerElement('gaia-radio', { prototype: proto });
})(window);
