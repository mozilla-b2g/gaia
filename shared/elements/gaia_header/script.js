'use strict';
/* global ComponentUtils */

window.GaiaHeader = (function(win) {
  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaHeaderBaseurl ||
    '/shared/elements/gaia_header/';

  /**
   * Supported action types
   *
   * @type {Object}
   */
  var actionTypes = {
    menu: true,
    back: true,
    close: true
  };

  /**
   * Called when the element is first created.
   *
   * Here we create the shadow-root and
   * inject our template into it.
   *
   * @private
   */
  proto.createdCallback = function() {
    var shadow = this.createShadowRoot();

    this._template = template.content.cloneNode(true);
    this._actionButton = this._template.getElementById('action-button');
    this._header = this._template.getElementById('header');
    this._configureActionButton();
    this._configureSkin();
    this._actionButton.addEventListener(
      'click', proto._onActionButtonClick.bind(this)
    );

    shadow.appendChild(this._template);

    ComponentUtils.style.call(this, baseurl);
  };

  /**
   * Called when one of the attributes on the element changes.
   *
   * @private
   */
  proto.attributeChangedCallback = function(attr, oldVal, newVal) {
    if (attr === 'action') {
      this._configureActionButton();
    } else if (attr === 'skin') {
      this._configureSkin();
    }
  };

  /**
   * When called, trigger the action button.
   */
  proto.triggerAction = function() {
    if (this._isSupportedAction(this.getAttribute('action'))) {
      this._actionButton.click();
    }
  };

  /**
   * Configure the action button based
   * on the value of the `data-action`
   * attribute.
   *
   * @private
   */
  proto._configureActionButton = function() {
    var type = this.getAttribute('action');

    // TODO: Action button should be
    // hidden by default then shown
    // only with supported action types
    if (!this._isSupportedAction(type)) {
      this._actionButton.style.display = 'none';
      return;
    }
    this._actionButton.style.display = 'block';
    this._actionButton.setAttribute('icon', type);
  };

  /**
   * Copy the skin to the template.
   *
   * @private
   */
  proto._configureSkin = function() {
    this._header.setAttribute('skin', this.getAttribute('skin'));
  };

  /**
   * Validate action against supported list.
   *
   * @private
   */
  proto._isSupportedAction = function(action) {
    return action && actionTypes[action];
  };

  /**
   * Handle clicks on the action button.
   *
   * Fired async to allow the 'click' event
   * to finish its event path before
   * dispatching the 'action' event.
   *
   * @param  {Event} e
   * @private
   */
  proto._onActionButtonClick = function(e) {
    var config = { detail: { type: this.getAttribute('action') } };
    var actionEvent = new CustomEvent('action', config);
    setTimeout(this.dispatchEvent.bind(this, actionEvent));
  };

  // HACK: Create a <template> in memory at runtime.
  // When the custom-element is created we clone
  // this template and inject into the shadow-root.
  // Prior to this we would have had to copy/paste
  // the template into the <head> of every app that
  // wanted to use <gaia-header>, this would make
  // markup changes complicated, and could lead to
  // things getting out of sync. This is a short-term
  // hack until we can import entire custom-elements
  // using HTML Imports (bug 877072).
  var template = document.createElement('template');
  template.innerHTML = '<header id="header">' +
      '<button id="action-button"></button>' +
      '<content select="h1,button,a"></content>' +
    '</header>';

  // Register and return the constructor
  return document.registerElement('gaia-header', { prototype: proto });
})(window);
