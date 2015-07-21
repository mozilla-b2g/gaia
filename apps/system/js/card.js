/* globals BaseUI, CardsHelper, Sanitizer, Service,
   eventSafety  */

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
  Card.DEBUG = false;

  Card.prototype = Object.create(BaseUI.prototype, {
    // .frontApp always points to the top-most app in the card's group
    frontApp: {
      get: function() {
        return (this.apps && this.apps.length) ?
          this.apps[0] : null;
      }
    }
  });
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
            this.position + ':' + this.pageTitle + ']';
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
    return Sanitizer.escapeHTML `<header class="card-header titles">
       <h1 id="${this.titleId}" class="title page-title"
           dir="auto">${this.pageTitle}</h1>
       <p class="subtitle">
        <span class="subtitle-url">${this.subTitle}</span>
       </p>
    </header>
    <section class="screenshots" data-l10n-id="openCard" role="link">
      <div class="screenshotView bb-button"></div>
      <div class="screenshotView bb-button"></div>
      <div class="screenshotView bb-button"></div>
    </section>
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
      <h1 dir="auto"
        class="card-title title">${this.cardTitle}</h1>
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
    var app = this.frontApp;
    var isBrowser = app.isBrowser();
    this.cardTitle = ''; // NOTE(sfoster): not in use yet
    this.pageTitle = (isBrowser && app.title) ? app.title : app.name;
    this.sslState = app.getSSLState();
    this.subTitle = '';
    this.iconValue = '';
    this.iconPending = true;
    this.closeButtonVisibility = 'visible';
    this.viewClassList = ['card', 'appIconPreview'];
    this.titleId = 'card-title-' + this.instanceID;
    this.isTrustedUI = false;

    var currentUrl = app.config.url;
    var iconSize;
    var appIconURI;

    if (isBrowser) {
      app.getSiteIconUrl(CARD_FOOTER_ICON_SIZE).then(iconUrl => {
        this._updateIcon(iconUrl);
      }).catch(err => {
        debug('card for %s, error from getSiteIconUrl: %s, ',
                     currentUrl, err);
        this._updateIcon();
      });
    } else {
      iconSize = CARD_FOOTER_ICON_SIZE * window.devicePixelRatio;
      appIconURI = CardsHelper.getIconURIForApp(app, iconSize);
      if (appIconURI) {
        this.iconValue = 'url(' + appIconURI + ')';
      }
      this.iconPending = false;
    }

    var origin = app.origin;
    var frameForScreenshot = app.getFrameForScreenshot();
    var displayUrl = '';

    if (isBrowser) {
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
    }

    var topMostWindow = app.getTopMostWindow();
    if (topMostWindow && topMostWindow.CLASS_NAME === 'TrustedWindow') {
      var name = topMostWindow.name;
      this.cardTitle = name || '';
      this.isTrustedUI = true;
    } else if (!app.killable()) {
      // unclosable app
      this.closeButtonVisibility = 'hidden';
    }
  };

  /**
   * Build a card representation of >=1 app windows.
   * @memberOf Card.prototype
   */
  Card.prototype.render = function() {
    this.publish('willrender');

    var elem = this.element || (this.element = document.createElement('li'));
    // we maintain position value on the instance and on the element.dataset
    elem.dataset.position = this.position;

    this._populateViewData();

    // populate the view
    elem.innerHTML = this.view();

    // Label the card by title (for screen reader).
    elem.setAttribute('aria-labelledby', this.titleId);
    // define role presentation for the card (for screen reader) in order to not
    // land on the card container.
    elem.setAttribute('role', 'presentation');

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
   * @memberOf Card.prototype
   */
  Card.prototype._cssTransition = function(className) {
    return new Promise((resolve, reject) => {
      var elem = this.element;
      elem.classList.add(className);
      eventSafety(this.element, 'transitionend', () => {
        if (elem && elem.parentNode) {
          elem.classList.remove(className);
        }
        resolve(true);
      }, 300);
    });
  };

  /**
   * @memberOf Card.prototype
   */
  Card.prototype.closeFrontApp = function() {
    var app = this.frontApp;
    // dont respond to touch events while transitioning
    this._unregisterEvents();
    return this._cssTransition('closing').then(() => {
      this.killApp(app);
      if (this.element) {
        this._registerEvents();
      }
    });
  };

  /**
   * Call kill on the appWindow
   * @memberOf Card.prototype
   */
  Card.prototype.killApp = function(app) {
    var group = this.apps;
    app = app || this.frontApp;
    var position = group.indexOf(app);
    var releasedContainer = this.screenshotViews[position];
    if (releasedContainer) {
      releasedContainer.style.backgroundImage = 'none';
    }

    // stop tracking this app
    this.apps.splice(position, 1);
    app.kill(); // triggers appterminated event which is handled in TaskManager
    if (this.frontApp && position === 0) {
      // update card if the front-app was killed
      this._populateViewData();
      this._updateDisplay();
    }
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
    this.element = this.manager = this.apps = null;
    this.publish('destroyed');
  };

  Card.prototype._updateIcon = function updateIcon(iconUrl) {
    if (!this.iconButton) {
      return;
    }
    if (!iconUrl) {
      var size = CARD_FOOTER_ICON_SIZE * window.devicePixelRatio;
      iconUrl = CardsHelper.getIconURIForApp(this.frontApp, size);
    }
    this.iconValue = iconUrl ? 'url(' + iconUrl + ')' : '';
    // TODO: better transition options here if we use an image element
    this.iconButton.style.backgroundImage = this.iconValue;
    this.iconPending = false;
    this.iconButton.classList.remove('pending');
  };

  /**
   * Update the displayed content of a card
   * @memberOf Card.prototype
   */
  Card.prototype._updateDisplay = function c_updateDisplay() {
    // update view with properties from front app
    var app = this.frontApp;
    var elem = this.element;
    var screenshotViews = this.screenshotViews;
    var isBrowser = app.isBrowser();

    // we maintain instanceId on the card for unambiguous lookup
    elem.dataset.appInstanceId = app.instanceID;
    // NOTE(sfoster): should data-origin be stable for the lifetime
    //                of the card?
    // keeping origin simplifies ui testing
    elem.dataset.origin = app.origin;

    elem.classList.toggle('private',
                          Boolean(app.isPrivate || app.isPrivateBrowser()));

    // Indicate security state where applicable & available
    if (this.sslState) {
      elem.dataset.ssl = this.sslState;
    } else {
      delete elem.dataset.ssl;
    }
    elem.classList.toggle('browser', isBrowser);
    elem.classList.toggle('show-subtitle', !!this.subTitle);
    elem.classList.toggle('trustedui', this.isTrustedUI);

    this.iconButton.style.backgroundImage = this.iconValue || '';
    this.iconButton.classList.toggle('pending', this.iconPending);

    var isIconPreview = !this.getScreenshotPreviewsSetting();
    elem.classList.toggle('appIconPreview', isIconPreview);

    this.pageTitleNode.textContent = this.pageTitle;
    this.subTitleNode.textContent = this.subTitle;

    var apps = this.apps.slice(0, screenshotViews.length);
    Array.from(screenshotViews).forEach((screenshotView, idx) => {
      var app = apps[idx];
      if (app) {
        screenshotView.dataset.groupindex = idx;

        var hasScreenshot = (!isIconPreview &&
                             screenshotView.style.backgroundImage &&
                             screenshotView.style.backgroundImage !== 'none');
        // TODO: only add screenshot for top-most window in group?
        if (hasScreenshot) {
          debug('Card, keeping existing backgroundImage:',
                      screenshotView.style.backgroundImage);
          return;
        }
        // Use a cached screenshot if we have one for the active app
        var isActive = (Service.query('AppWindowManager.getActiveWindow') ===
               app.getBottomMostWindow());

        // will be null or blob url
        var cachedLayer = isActive && app.requestScreenshotURL();
        screenshotView.classList.toggle('fullscreen',
                                        isActive && app.isFullScreen());
        screenshotView.classList.toggle('maximized',
                                      isActive && app.appChrome &&
                                      app.appChrome.isMaximized());
        screenshotView.style.backgroundImage =
          (cachedLayer ? 'url(' + cachedLayer + ')' : 'none' ) + ',' +
          '-moz-element(#' + app.instanceID + ')';
      } else {
        screenshotView.style.backgroundImage = '';
        delete screenshotView.dataset.groupindex;
      }
    });
  };

  Card.prototype._fetchElements = function c__fetchElements() {
    this.screenshotContainer = this.element.querySelector('.screenshots');
    this.screenshotViews = this.element.querySelectorAll('.screenshotView');
    this.pageTitleNode = this.element.querySelector('h1.page-title');
    this.subTitleNode = this.element.querySelector('.subtitle-url');
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
            this.frontApp.killable()) {
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
      anURL = this.frontApp ? new URL(url, this.frontApp.origin) : new URL(url);
    } catch (e) {
      // return as-is if url was not valid
      return url;
    }
    var displayString = url.substring(url.indexOf(anURL.host));
    return displayString;
  };

  function debug(message) {
    if (Card.DEBUG) {
      var args = Array.from(arguments);
      if (typeof args[0] === 'string') {
        args[0] = 'Card > ' + args[0];
      } else {
        args.unshift('Card > ');
      }
      console.log.apply(console, args);
    }
  }

  return (exports.Card = Card);

})(window);
