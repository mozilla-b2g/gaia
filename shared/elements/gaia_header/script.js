'use strict';
/* global ComponentUtils */

window.GaiaHeader = (function(win) {
  // The maximum ratio at which the text can be scale down.
  // a font of 23px can become as small as 18px (= 23px * MAX_ZOOM_LEVEL).
  const MAX_ZOOM_LEVEL = 0.8;

  // The width of a button in rem.
  const BUTTON_WIDTH = 5;

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

    this.hasActionButton = false;
    this.isHeaderCentered = true;
    this.zoomLevel = 1;
    this.numSideButtons = 0;
    this.text = this.querySelector('h1,h2,h3,h4');

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

    this._center();
    this._attachEventListeners();
  };

  /**
   * Attach the event listeners to the header.
   *
   * @private
   */
  proto._attachEventListeners = function() {
    this.text.addEventListener('overflow',
      this._handleTextFlowChange.bind(this));
    this.text.addEventListener('underflow',
      this._handleTextFlowChange.bind(this));

    // @todo Listen to modification on the header and readjust zooming after
    // bugzil.la/1007743 lands.
  };

  /**
   * Called whenever the header content over/underflows.
   * Scale down or up the header to best fit the container. This is achieved
   * using the dichotomy method, we use the average between the current and the
   * target zoom factor, and continue as long as a flow event happens.
   *
   * @param {Object} evt
   * @private
   */
  proto._handleTextFlowChange = function(evt) {
    var style = evt.target.style;

    switch (evt.type) {
      case 'overflow':
        if (this.zoomLevel > MAX_ZOOM_LEVEL) {
          // We can still scale down the text a little bit.
          this.zoomLevel =
            Math.floor((this.zoomLevel + MAX_ZOOM_LEVEL) / 2 * 10) / 10;
          style.transform = 'scale(' + this.zoomLevel + ')';
        } else {
          // We won't scale down the text further.
          // The text won't be centered and may get truncated.
          style.marginLeft = style.marginRight = 0;
          style.textOverflow = 'ellipsis';
          this.isHeaderCentered = false;
        }
        break;

      case 'underflow':
        // We have some more room, so let's scale up and see what happens.
        this.zoomLevel = Math.ceil((this.zoomLevel + 1) / 2 * 10) / 10;
        style.transform = 'scale(' + this.zoomLevel + ')';
        break;
    }

    if (this.isHeaderCentered) {
      // Scale changes the width but not the margins, so we need to increase
      // the margins by the same factor to compensate and stay centered.
      style.marginLeft = style.marginRight =
        (this.numSideButtons * BUTTON_WIDTH / this.zoomLevel) + 'rem';
    }
  };

  /**
   * Center the header by adding margins on each side.
   * Also computes the value of this.numSideButtons.
   *
   * @private
   */
  proto._center = function() {
    // We determine the number of buttons of each side:
    //   * Optional action button on the left
    //   * 0 or more buttons on the right
    var numLeftButton = Number(this.hasActionButton);
    var numRightButtons = this.querySelectorAll('button').length;

    this.numSideButtons = Math.max(numLeftButton, numRightButtons);

    this.text.style.marginLeft = this.text.style.marginRight =
      (this.numSideButtons * BUTTON_WIDTH) + 'rem';
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
    this.hasActionButton = true;
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
      '<menu id="menu-buttons" type="toolbar">' +
        '<content id="buttons-content" select="button,a"></content>' +
      '</menu>' +
      '<content select="h1,h2,h3,h4"></content>' +
      '<content id="content"></content>' +
    '</header>';

  // Register and return the constructor
  return document.registerElement('gaia-header', { prototype: proto });
})(window);
