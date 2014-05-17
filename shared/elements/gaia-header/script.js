
window.GaiaHeader = (function(win) {
  'use strict';

  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow user to override the stylesheet url if need be
  var stylesheet = win.GaiaHeaderCSS || '/shared/style/headers.css';


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
    this._header = this._template.getElementById('header');
    this._button = this._template.getElementById('action-button');
    this._buttonInner = this._template.getElementById('action-button-inner');
    
    this._configureActionButton();
    this._configureSkin();
    this._styleHack();

    shadow.appendChild(this._template);
  };

  /**
   * Called when one of the attributes on the element changes.
   *
   * @private
   */
  proto.attributeChangedCallback = function(attr, oldVal, newVal) {
    if (attr === 'data-action') {
      this._configureActionButton(oldVal);
    } else if (attr === 'data-skin') {
      this._configureSkin(oldVal);
    }
  };

  /**
   * When called, trigger the action button.
   */
  proto.triggerAction = function() {
    if (this._button.style.display === 'block') {
      this._button.click();
    }
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
  proto._styleHack = function() {
    var style = this._template.querySelector('style');
    this.appendChild(style.cloneNode(true));
  };

  /**
   * Configure the action button based
   * on the value of the `data-action`
   * attribute.
   *
   * @private
   */
  proto._configureActionButton = function(oldAction) {
    var type = this.dataset.action;

    // TODO: Action button should be
    // hidden by default then shown
    // only with supported action types
    if (!type || !actionTypes[type]) {
      this._button.style.display = 'none';
      return;
    }
    this._button.style.display = 'block';

    // Remove previous icon class from inner
    if (oldAction) {
      this._buttonInner.classList.remove('icon-' + oldAction);
    }
    // Add icon class to inner
    this._buttonInner.classList.add('icon-' + type);

    this._button.dataset.action = type;
    this._button.addEventListener('click', proto._onActionButtonClick.bind(this));
  };

  /**
   * Configure the skin based on the
   * `data-skin` attribute.
   *
   * @private
   */
  proto._configureSkin = function(oldSkin) {
    // Remove previous skin class
    if (oldSkin) {
      this._header.parentNode.classList.remove('skin-' + oldSkin);
    }
    // Add skin class
    var skin = this.dataset.skin;
    if (skin) {
      this._header.parentNode.classList.add('skin-' + skin);
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
  template.innerHTML = '<style scoped>' +
    '@import url(' + stylesheet + ');</style>' +
    '<section role="region">' +
      '<header id="header">' +
        '<button id="action-button">' +
          '<span id="action-button-inner" class="icon"></span></button>' +
        '<menu id="menu-buttons" type="toolbar">' +
          '<content id="buttons-content" select="button,a"></content>' +
        '</menu>' +
        '<content select="h1,h2,h3,h4"></content>' +
        '<content id="content"></content>' +
      '</header>' +
    '</section>';

  // Register and return the constructor
  return document.registerElement('gaia-header', { prototype: proto });
})(window);
