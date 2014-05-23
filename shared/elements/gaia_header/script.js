
window.GaiaHeader = (function(win) {
  'use strict';

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
    this._configureActionButton();
    this._configureSkin();
    this._addStyle();

    shadow.appendChild(this._template);
  };

  /**
   * We clone the scoped stylesheet and append
   * it outside the shadow-root so that we can
   * style projected <content> without the need
   * of the :content selector.
   *
   * When the :content selector lands, we won't
   * need this hack anymore and can style projected
   * <content> from stylesheets within the shadow root.
   * (bug 992249)
   *
   * @private
   */
  proto._addStyle = function() {
    var style = document.createElement('style');
    style.setAttribute('scoped', '');
    var url = baseurl + 'style.css';
    style.innerHTML = '@import url(' + url + ')';
    this.appendChild(style);
    this._template.appendChild(style.cloneNode(true));
  };

  /**
   * Configure the action button based
   * on the value of the `data-action`
   * attribute.
   *
   * @private
   */
  proto._configureActionButton = function() {
    var button = this._template.getElementById('action-button');
    var type = this.dataset.action;

    // TODO: Action button should be
    // hidden by default then shown
    // only with supported action types
    if (!type || !actionTypes[type]) {
      button.style.display = 'none';
      return;
    }

    button.dataset.icon = type;
    button.addEventListener('click', proto._onActionButtonClick.bind(this));
  };

  /**
   * Copy the skin to the template.
   *
   * @private
   */
  proto._configureSkin = function() {
    var skin = this.dataset.skin;
    if (skin) {
      var header = this._template.getElementById('header');
      header.dataset.skin = skin;
    }
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
    var config = { detail: { type: this.dataset.action } };
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
      '<menu id="menu-buttons" type="toolbar">' +
        '<content id="buttons-content" select="button,a"></content>' +
      '</menu>' +
      '<content select="h1,h2,h3,h4"></content>' +
      '<content id="content"></content>' +
    '</header>';

  // Register and return the constructor
  return document.registerElement('gaia-header', { prototype: proto });
})(window);
