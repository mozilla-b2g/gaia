/* globals BaseUI, CardsHelper, Sanitizer, Service */

/* exported Card */

'use strict';

(function(exports) {

  var _id = 0;

  /* Corresponds to the icon size in the footer.
   * Used to determine the proper icon size from the manifest.
   */
  const CARD_FOOTER_ICON_SIZE = 40;

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
   * The point at which we take a swipe to be intentional
   * @type {String}
   * @memberof Card.prototype
   */
  Card.prototype.SWIPE_WOBBLE_THRESHOLD = 4 * window.devicePixelRatio;

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
   * CSS visibility value to show/hide close button for this app
   * @type {String}
   * @memberof Card.prototype
   */
  Card.prototype.closeButtonVisibility = 'hidden';

  /**
   * CSS visibility value to show/hide favorite button for this app
   * @type {String}
   * @memberof Card.prototype
   */
  Card.prototype.favoriteButtonVisibility = 'hidden';

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
  Card.prototype.template = function() {
    return Sanitizer.escapeHTML `<div class="titles">
     <h1 id="${this.titleId}" dir="auto" class="title">${this.title}</h1>
     <p class="subtitle">
      <span class="subtitle-url">${this.subTitle}</span>
     </p>
    </div>

    <div class="screenshotView bb-button" data-l10n-id="openCard"
      role="link"></div>
    <div class="privateOverlay"></div>
    <div class="appIconView" style="background-image:${this.iconValue}"></div>

    <footer class="card-tray">
     <button class="appIcon" data-l10n-id="openCard"
       data-button-action="select" aria-hidden="true"></button>
     <menu class="buttonbar">
       <button class="close-button bb-button" data-l10n-id="closeCard"
         data-button-action="close" role="button"
         style="visibility: ${this.closeButtonVisibility}"></button>
      <button class="favorite-button bb-button"
        data-button-action="favorite" role="button"
        style="visibility: ${this.favoriteButtonVisibility}"></button>
     </menu>
    </footer>`;
  };

  /**
   * Card html view - builds the innerHTML for a card element
   * @memberOf Card.prototype
   */
  Card.prototype.view = function c_view() {
    return this.template();
  };

  /**
   * Populate properties on the instance before templating
   * @memberOf Card.prototype
   */
  Card.prototype._populateViewData = function() {
    var app = this.app;
    this.title = (app.isBrowser() && app.title) ? app.title : app.name;
    this.sslState = app.getSSLState();
    this.subTitle = '';
    this.iconValue = '';
    this.closeButtonVisibility = 'visible';
    this.viewClassList = ['card', 'appIconPreview'];
    this.titleId = 'card-title-' + this.instanceID;
    this.isHomescreen = Boolean(app.isHomescreen);

    if (app.isPrivate) {
      this.viewClassList.push('private');
    }

    // app icon overlays screenshot by default
    // and will be removed if/when we display the screenshot
    var size = CARD_FOOTER_ICON_SIZE * window.devicePixelRatio;
    var iconURI = CardsHelper.getIconURIForApp(this.app, size);
    if (iconURI) {
      this.iconValue = 'url(' + iconURI + ')';
    }

    var origin = app.origin;
    var frameForScreenshot = app.getFrameForScreenshot();
    var displayUrl = '';

    if (app.isBrowser()) {
      displayUrl = app.config.url || origin;
      // Do not display the URL when browsing an app page. This is
      // encountered for use-cases like the private browser splash page.
      if (displayUrl.startsWith('app://')) {
        displayUrl = false;
      }

    } else if(frameForScreenshot &&
        CardsHelper.getOffOrigin(frameForScreenshot.src, origin)) {
      displayUrl = CardsHelper.getOffOrigin(frameForScreenshot.src, origin);
    }
    if (displayUrl) {
      this.subTitle = this.getDisplayURLString(displayUrl);
      this.viewClassList.push('show-subtitle');
    }

    var topMostWindow = app.getTopMostWindow();
    if (topMostWindow && topMostWindow.CLASS_NAME === 'TrustedWindow') {
      var name = topMostWindow.name;
      this.title = name || '';
      this.viewClassList.push('trustedui');
    } else if (!this.app.killable()) {
      // unclosable app
      this.closeButtonVisibility = 'hidden';
    }
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
    // define role presentation for the card (for screen reader) in order to not
    // land on the card container.
    elem.setAttribute('role', 'presentation');
    // Indicate security state where applicable & available
    if (this.sslState) {
      elem.dataset.ssl = this.sslState;
    }

    this.viewClassList.forEach(function(cls) {
      elem.classList.add(cls);
    });

    if (this.containerElement) {
      this.containerElement.appendChild(elem);
    }

    this._fetchElements();
    this._updateDisplay();
    this._registerEvents();

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
    // we dont want any further events between now and
    // when appterminated causes the card to be destroyed
    this._unregisterEvents();
    this.app.kill();
  };

  /**
   * tear down and destroy the card
   * @memberOf Card.prototype
   */
  Card.prototype.destroy = function() {
    this.publish('willdestroy');
    this._unregisterEvents();

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

    if (isIconPreview) {
      return;
    }

    // Use a cached screenshot if we have one for the active app
    var cachedLayer;
    // We may already enter the closed state.
    if (Service.query('AppWindowManager.getActiveWindow') ===
        this.app.getBottomMostWindow()) {
      // will be null or blob url
      cachedLayer = app.requestScreenshotURL();
      screenshotView.classList.toggle('fullscreen',
                                      app.isFullScreen());
      if (app.appChrome) {
        screenshotView.classList.toggle('maximized',
                                      app.appChrome.isMaximized());
      }
    }

    elem.classList.toggle('homescreen', this.isHomescreen);

    if (this.isHomescreen) {
      this.drawHomeScreenScreenshot(cachedLayer);
    } else {
      this.drawScreenshot(cachedLayer);
    }
  };

  Card.prototype.drawScreenshot = function(screenshotUrl) {
    screenshotUrl = screenshotUrl ? 'url(' + screenshotUrl + ')' : 'none';
    this.screenshotView.style.backgroundImage =
      screenshotUrl + ',' +
      '-moz-element(#' + this.app.instanceID + ')';
  };

  Card.prototype.drawHomeScreenScreenshot = function() {
    // draw 3 background with wallpaper first
    var app = this.app;
    var cachedScreenshotUrl = app.requestScreenshotURL();
    var screenshotView = this.screenshotView;

    var wallpaperUrl = Service.query('getWallpaper');
    var wallpaperValue = wallpaperUrl ? 'url(' + wallpaperUrl + ')' : 'none';
    var screenshotValue = cachedScreenshotUrl ?
                          'url(' + cachedScreenshotUrl + ')' : 'none';
    var backgrounds = [
      wallpaperValue,
      screenshotValue,
      '-moz-element(#' + app.instanceID + ')'
    ];

    function onScreenshotReady(evt) {
      cachedScreenshotUrl = app.requestScreenshotURL();
      window.removeEventListener('homescreenscreenshotready',
                                 onScreenshotReady);
      console.log('drawHomeScreenScreenshot, ' + evt.type, cachedScreenshotUrl);
      if (screenshotView && screenshotView.parentNode &&
          cachedScreenshotUrl) {
        // should now be defined
        backgrounds[1] = 'url(' + cachedScreenshotUrl + ')';
        screenshotView.style.backgroundImage = backgrounds.join(', ');
      }
    }

    screenshotView.style.backgroundImage = backgrounds.join(', ');
    if (cachedScreenshotUrl) {
      console.log('drawHomeScreenScreenshot using cachedScreenshotUrl');
    } else {
      app.getScreenshot(function onGettingRealtimeScreenshot() {
        console.log('homescreen getScreenshot callback');
      }, 0, 0, 400);
      // update background when the homescreen screenshot is ready
      window.addEventListener('homescreenscreenshotready', onScreenshotReady);
    }
  };

  Card.prototype._fetchElements = function c__fetchElements() {
    this.screenshotView = this.element.querySelector('.screenshotView');
    this.titleNode = this.element.querySelector('h1.title');
    this.iconButton = this.element.querySelector('.appIcon');
  };

  Card.prototype._registerEvents = function c__registerEvents() {
    this.element.addEventListener('touchstart', this);
    this.element.addEventListener('touchmove', this);
    this.element.addEventListener('touchend', this);
    this._eventsRegistered = true;
  };

  Card.prototype._unregisterEvents = function c__unregisterEvents() {
    if (!this._eventsRegistered || !this.element) {
      return;
    }
    this.element.removeEventListener('touchstart', this);
    this.element.removeEventListener('touchmove', this);
    this.element.removeEventListener('touchend', this);
    this._eventsRegistered = false;
  };

  Card.prototype.handleEvent = function(evt) {
    var verticalY;
    var tapThreshold = 1;
    switch (evt.type) {
      case 'touchstart':
        evt.stopPropagation();
        this._dragPhase = '';
        this.deltaX = 0;
        this.deltaY = 0;
        this.startTouchPosition = [evt.touches[0].pageX, evt.touches[0].pageY];
        break;

      case 'touchmove':
        evt.stopPropagation();
        this.deltaX = evt.touches[0].pageX - this.startTouchPosition[0];
        this.deltaY = this._ease(
          evt.touches[0].pageY - this.startTouchPosition[1],
          this.manager.SWIPE_UP_THRESHOLD
        );
        verticalY = -1 * this.deltaY;
        switch (this._dragPhase) {
          case '':
            if (verticalY > Math.abs(this.deltaX) &&
                verticalY > this.SWIPE_WOBBLE_THRESHOLD) {
              this._dragPhase = 'cross-slide';
              // dont try and transition while dragging
              this.element.style.transition = 'transform 0s linear';
              this.onCrossSlide(evt);
            }
            break;

          case 'cross-slide':
            this.onCrossSlide(evt);
            break;
        }
        break;

      case 'touchend':
        this.deltaX = evt.changedTouches[0].pageX - this.startTouchPosition[0];
        this.deltaY = this._ease(
          evt.changedTouches[0].pageY - this.startTouchPosition[1],
          this.manager.SWIPE_UP_THRESHOLD
        );
        if (Math.abs(this.deltaX) <= tapThreshold ||
            Math.abs(this.deltaY) <= tapThreshold) {
          this._resetY();
          return;
        }
        verticalY = -1 * this.deltaY;
        // cross-slide should be more up than across
        if (verticalY > Math.abs(this.deltaX) &&
            verticalY > this.manager.SWIPE_UP_THRESHOLD &&
            this.app.killable()) {
          // leave the card where it is if it will be destroyed
          this.killApp();
        } else {
          // return it to vertical center
          this._resetY();
        }
        break;
    }
  };

  /**
   * @memberOf Card.prototype
   * @param {DOMEvent} evt
   */
  Card.prototype.onCrossSlide = function(evt) {
    // move card up by the delta - the threshold
    var offsetY = this.deltaY - this.SWIPE_WOBBLE_THRESHOLD;
    this.element.style.transform = 'translateY(' + offsetY + 'px)';
  };

  /**
   * Ease for y-axis movement to damp start of the cross-slide
   * @memberOf Card.prototype
   * @param x {number} incremental value from 0 to max
   * @param max {number}
   */
  Card.prototype._ease = function(x, max) {
    var y;
    var pt = Math.abs(x)/max;
    var sign = x >= 0 ? 1 : -1;
    var q1 = 0.25 - Math.pow(0.25, 1.675);
    if (pt <= 0.25) {
      // ease in at first
      y = Math.pow(pt, 1.675);
    } else {
      // linear (minus offet)
      y = pt - q1;
    }
    return sign * max * y;
  };

  /**
   * @memberOf Card.prototype
   */
  Card.prototype._resetY = function(evt) {
    // remove the inline transition so we transition per the stylesheet
    this.element.style.removeProperty('transition');
    this.element.style.transform = 'translateY(0)';
  };

  Card.prototype.getDisplayURLString = function(url) {
    // truncation/simplification of URL for card display
    var anURL;
    try {
      anURL = this.app ? new URL(url, this.app.origin) : new URL(url);
    } catch (e) {
      // return as-is if url was not valid
      return url;
    }
    var displayString = url.substring(url.indexOf(anURL.host));
    return displayString;
  };

  return (exports.Card = Card);

})(window);
