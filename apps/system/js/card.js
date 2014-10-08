/* globals BaseUI, CardsHelper, TrustedUIManager */

/* exported Card */

'use strict';

(function(exports) {

  var _id = 0;

  /**
   * A card in a card view, representing a single app
   *
   * @class Card
   * @param {Object} config config to associate the card with a given app and
   *                        how it should be displayed
   * @extends BaseUI
   */
  function Card(config) {
    if (config) {
      for (var key in config) {
        this[key] = config[key];
      }
    }

    this.instanceID = _id++;

    return this;
  }

  Card.prototype = Object.create(BaseUI.prototype);
  Card.prototype.constructor = Card;

  /**
   * @type {String}
   * @memberof Card.prototype
   */
  Card.prototype.EVENT_PREFIX = 'card-';

  /**
   * The instance's element will get appended here if defined
   * @type {DOMNode}
   * @memberof Card.prototype
   */
  Card.prototype.containerElement = null;

  Card.prototype.CLASS_NAME = 'Card';
  Card.prototype.element = null;

  /**
   * Debugging helper to output a useful string representation of an instance.
   * @memberOf Card.prototype
  */
  Card.prototype.toString = function() {
    return '[' + this.CLASS_NAME + ' ' +
            this.position + ':' + this.title + ']';
  };

  /**
   * Get cached setting boolean value for whether to use screenshots or
   * icons in cards
   * @memberOf Card.prototype
   */
  Card.prototype.getScreenshotPreviewsSetting = function() {
    return this.manager.useAppScreenshotPreviews;
  };

  /**
   * Template string representing the innerHTML of the instance's element
   * @memberOf Card.prototype
   */
  Card.prototype._template =
    '<div class="screenshotView bb-button" data-l10n-id="openCard" ' +
    '  role="button"></div>' +
    '<div class="appIconView" style="background-image:{iconValue}"></div>' +
    '' +
    '<div class="titles">' +
    ' <h1 id="{titleId}" class="title">{title}</h1>' +
    ' <p class="subtitle">{subTitle}</p>' +
    '</div>' +
    '' +
    '<footer class="card-tray">'+
    ' <button class="appIcon" data-l10n-id="openCard" ' +
    '   data-button-action="select"></button>' +
    ' <menu class="buttonbar">' +
    '   <button class="close-button bb-button" data-l10n-id="closeCard" ' +
    '     data-button-action="close" role="button" ' +
    '     style="visibility: {closeButtonVisibility}"></button>' +
    '  <button class="favorite-button bb-button" ' +
    '    data-button-action="favorite" role="button" ' +
    '    style="visibility: {favoriteButtonVisibility}"></button>' +
    ' </menu>' +
    '</footer>';

  /**
   * Card html view - builds the innerHTML for a card element
   * @memberOf Card.prototype
   */
  Card.prototype.view = function c_view() {
    var viewData = this;
    return this._template.replace(/\{([^\}]+)\}/g, function(m, key) {
        return viewData[key];
    });
  };

  /**
   * Populate properties on the instance before templating
   * @memberOf Card.prototype
   */
  Card.prototype._populateViewData = function() {
    var app = this.app;
    this.title = (app.isBrowser() && app.title) ? app.title : app.name;
    this.subTitle = '';
    this.iconValue = '';
    this.closeButtonVisibility = 'visible';
    this.viewClassList = ['card', 'appIconPreview'];
    this.titleId = 'card-title-' + this.instanceID;

    // app icon overlays screenshot by default
    // and will be removed if/when we display the screenshot
    var iconURI = CardsHelper.getIconURIForApp(this.app);
    if (iconURI) {
        this.iconValue = 'url(' + iconURI + ')';
    }

    var origin = app.origin;
    var popupFrame;
    var frameForScreenshot = app.getFrameForScreenshot();

    if (frameForScreenshot &&
        CardsHelper.getOffOrigin(frameForScreenshot.src, origin)) {
      this.subTitle = CardsHelper.getOffOrigin(
                        frameForScreenshot.src, origin);
    }

    if (TrustedUIManager.hasTrustedUI(app.origin)) {
      popupFrame = TrustedUIManager.getDialogFromOrigin(app.origin);
      this.title = CardsHelper.escapeHTML(popupFrame.name || '', true);
      this.viewClassList.push('trustedui');
    } else if (!this.app.killable()) {
      // unclosable app
      this.closeButtonVisibility = 'hidden';
    }
  };

  Card.prototype.move = function(deltaX, deltaY) {
    deltaX = deltaX || 0;
    deltaY = deltaY || 0;

    var windowWidth = this.manager.windowWidth || window.innerWidth;
    var offset = this.position - this.manager.position;
    var positionX = deltaX + offset * (windowWidth * 0.55);
    var appliedX = positionX;

    var rightLimit =  windowWidth / 2 + windowWidth * 0.24 - 0.001;
    appliedX = Math.min(appliedX, rightLimit);
    appliedX = Math.max(appliedX, -1 * rightLimit);

    this.element.dataset.positionX = positionX;
    this.element.dataset.keepLayerDelta = Math.abs(positionX - appliedX);

    var style = { transform: '' };

    if (deltaX || offset) {
      style.transform = 'translateX(' + appliedX + 'px)';
    }

    if (deltaY) {
      style.transform = 'translateY(' + deltaY + 'px)';
    }

    this.applyStyle(style);
  };

  /**
   * Build a card representation of an app window.
   * @memberOf Card.prototype
   */
  Card.prototype.render = function() {
    this.publish('willrender');

    var elem = this.element || (this.element = document.createElement('li'));
    // we maintain position value on the instance and on the element.dataset
    elem.dataset.position = this.position;
    // we maintain instanceId on the card for unambiguous lookup
    elem.dataset.appInstanceId = this.app.instanceID;
    // keeping origin simplifies ui testing
    elem.dataset.origin = this.app.origin;

    this._populateViewData();

    // populate the view
    elem.innerHTML = this.view();

    // Label the card by title (for screen reader).
    elem.setAttribute('aria-labelledby', this.titleId);

    this.viewClassList.forEach(function(cls) {
      elem.classList.add(cls);
    });

    if (this.containerElement) {
      this.containerElement.appendChild(elem);
    }

    this._fetchElements();
    this._updateDisplay();

    this.publish('rendered');
    return elem;
  };

  /**
   * Batch apply style properties
   * @param {Object} nameValues object with style property names as keys
   *                            and values to apply to the card
   * @memberOf Card.prototype
   */
  Card.prototype.applyStyle = function(nameValues) {
    var style = this.element.style;
    for (var property in nameValues) {
      if (undefined === nameValues[property]) {
        delete style[[property]];
      } else {
        style[property] = nameValues[property];
      }
    }
  };

  /**
   * Set card's screen reader visibility.
   * @type {Boolean} A flag indicating if it should be visible to the screen
   * reader.
   * @memberOf Card.prototype
   */
  Card.prototype.setVisibleForScreenReader = function(visible) {
    this.element.setAttribute('aria-hidden', !visible);
  };

  /**
   * Call kill on the appWindow
   * @memberOf Card.prototype
   */
  Card.prototype.killApp = function() {
    this.app.kill();
  };

  /**
   * tear down and destroy the card
   * @memberOf Card.prototype
   */
  Card.prototype.destroy = function() {
    this.publish('willdestroy');
    var element = this.element;
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
    this.element = this.manager = this.app = null;
    this.publish('destroyed');
  };

  /**
   * Update the displayed content of a card
   * @memberOf Card.prototype
   */
  Card.prototype._updateDisplay = function c_updateDisplay() {
    var elem = this.element;

    var app = this.app;
    if (app.isBrowser()) {
      elem.classList.add('browser');
    }

    var screenshotView = this.screenshotView;
    var isIconPreview = !this.getScreenshotPreviewsSetting();
    if (isIconPreview) {
      elem.classList.add('appIconPreview');
    } else {
      elem.classList.remove('appIconPreview');
      if (screenshotView.style.backgroundImage) {
        return;
      }
    }

    if (this.iconValue) {
      this.iconButton.style.backgroundImage = this.iconValue;
    }

    // Handling cards in different orientations
    var degree = app.rotatingDegree;
    var isLandscape = (degree == 90 || degree == 270);

    // Rotate screenshotView if needed
    screenshotView.classList.add('rotate-' + degree);

    if (isIconPreview) {
      return;
    }

    if (isLandscape) {
      // We must exchange width and height if it's landscape mode
      var width = elem.clientHeight;
      var height = elem.clientWidth;
      screenshotView.style.width = width + 'px';
      screenshotView.style.height = height + 'px';
      screenshotView.style.left = ((height - width) / 2) + 'px';
      screenshotView.style.top = ((width - height) / 2) + 'px';
    }

    // If we have a cached screenshot, use that first
    var cachedLayer = app.requestScreenshotURL();

    if (cachedLayer && app.isActive()) {
      screenshotView.classList.toggle('fullscreen',
                                      app.isFullScreen());
      screenshotView.classList.toggle('maximized',
                                      app.appChrome.isMaximized());
      screenshotView.style.backgroundImage =
        'url(' + cachedLayer + '),' +
        '-moz-element(#' + this.app.instanceID + ')';
    } else {
      screenshotView.style.backgroundImage =
        'url(none),' +
        '-moz-element(#' + this.app.instanceID + ')';
    }

  };

  Card.prototype._fetchElements = function c__fetchElements() {
    this.screenshotView = this.element.querySelector('.screenshotView');
    this.titleNode = this.element.querySelector('h1.title');
    this.iconButton = this.element.querySelector('.appIcon');
  };

  return (exports.Card = Card);

})(window);

