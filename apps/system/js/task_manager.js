/* global Card, eventSafety, SettingsListener, LazyLoader,
          Service, StackManager */

(function(exports) {
  'use strict';

  var DEBUG = false;
  var _idCount = 0;

  /**
   * Represent a stack of apps as cards
   * @class TaskManager
   */
  function TaskManager(appWindowManager) {
    this._id = 'TaskManager_' + _idCount++;
    this.appWindowManager = appWindowManager;
    // initialize state
    this.stack = [];
    this.unfilteredStack = [];
    this.cardsByAppID = {};

    this._settings = {};
    this._settings[this.SCREENSHOT_PREVIEWS_SETTING_KEY] = true;

    this._stackIndex = -1;
    this._shouldGoBackHome = false;
    this._active = false;

  }

  TaskManager.prototype = Object.create({
    /**
     * The setting that enables/disables using screenshots vs. icons for the
     *  card preview
     * @memberof TaskCard.prototype
     */
    SCREENSHOT_PREVIEWS_SETTING_KEY: 'app.cards_view.screenshots.enabled',

    /**
     * Cached value of the screenshots.enabled setting
     * @memberOf TaskManager.prototype
     */
    useAppScreenshotPreviews: true,

    /**
     * cardsByAppID is one:one lookup for the card associated with a given
     * app window
     * @memberof TaskManager.prototype
     */
    cardsByAppID: null,

    /**
     * array containing the possibly-filtered copy of StackManager's snapshot
     * @memberof TaskManager.prototype
     */
    stack: null,

    /**
     * array containing original StackManager snapshot
     * @memberof TaskManager.prototype
     */
    unfilteredStack: null,

   /**
     * Index into StackManager's stack array
     * @memberOf TaskManager.prototype
     */
    _stackIndex: 0,
    _shouldGoBackHome: false,
    _active: false,

    windowWidth: 0,
    windowHeight: 0,

    /**
     * Number of CSS pixels between cards
     * @memberOf TaskManager.prototype
     */
    CARD_GUTTER: 25
  }, {
    /**
     * Getter for card width
     * @memberOf TaskManager.prototype
     */
    cardWidth: {
      get: function tm_cardWidth() {
        return (this.windowWidth || window.innerWidth) / 2;
      }
    },
    cardHeight: {
      get: function tm_cardHeight() {
        return (this.windowHeight || window.innerHeight) / 2;
      }
    },
    /**
     * Getter for the current card
     * @memberOf TaskManager.prototype
     */
    currentCard: {
      get: function cs_getCurrentCard() {
        if (!this.stack.length) {
          return null;
        }
        var idx = this._getPositionFromScrollOffset(this.element.scrollLeft);
        return this.getCardAtIndex(idx);
      }
    },
    /**
     * Getter for the setting-backed screenshots.enabled flag
     * @memberOf TaskManager.prototype
     */
    useAppScreenshotPreviews: {
      get: function() {
        var key = this.SCREENSHOT_PREVIEWS_SETTING_KEY;
        return this._settings[key];
      }
    }
  });

  TaskManager.prototype.EVENT_PREFIX = 'taskmanager';
  TaskManager.prototype.name = 'TaskManager';

  TaskManager.prototype.setHierarchy = function() {
    return true;
  };
  /**
   * initialize
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.start = function() {
    this._fetchElements();
    this._registerEvents();
    this._observeSettings();
    this._appClosedHandler = this._appClosed.bind(this);
    Service.request('registerHierarchy', this);
    return LazyLoader.load([
      'js/card.js',
      'js/cards_helper.js'
    ]);
  };

  TaskManager.prototype.stop = function() {
    this._unregisterEvents();
    this._unobserveSettings();
    Service.request('unregisterHierarchy', this);
  };

  TaskManager.prototype._fetchElements = function() {
    this.element = document.getElementById('cards-view'),
    this.cardsList = document.getElementById('cards-list');
    this.screenElement = document.getElementById('screen');
  };

  TaskManager.prototype._observeSettings = function() {
    Object.keys(this._settings).forEach(name => {
      this['_handle_' + name] = (settingValue) => {
        this._settings[name] = settingValue;
      };
      SettingsListener.observe(name,
                               this._settings[name],
                               this['_handle_' + name]);
    });
  };
  TaskManager.prototype._unobserveSettings = function() {
    Object.keys(this._settings).forEach(name => {
      SettingsListener.unobserve(name,
                               this['_handle_' + name]);
      delete this['_handle_' + name];
    });
  };

  TaskManager.prototype._registerEvents = function() {
    window.addEventListener('taskmanagershow', this);
  };

  TaskManager.prototype._unregisterEvents = function() {
    window.removeEventListener('taskmanagershow', this);
  };

  TaskManager.prototype._appClosed = function cs_appClosed(evt) {
    window.removeEventListener('appclosed', this._appClosedHandler);
    window.removeEventListener('homescreenclosed', this._appClosedHandler);
    this.screenElement.classList.add('cards-view');
    this.element.classList.remove('from-home');
  };

  /**
   * Build and display the card switcher overlay
   * Note that we rebuild the switcher each time we need it rather
   * than trying to keep it in sync with app launches.
   *
   * @memberOf TaskManager.prototype
   * @param filterName {string} The name of the filter to apply. Only two fitler
   *                            types are supported at this time: 'browser-only'
   *                            and 'apps-only'.
   */
  TaskManager.prototype._setContentWidth = function(length) {
    var cardWidth = this.cardWidth;
    var margins = this.windowWidth - cardWidth;
    // total width of left/right "margin" + call cards and their gutters
    var cardStripWidth = (cardWidth * length) +
                         (this.CARD_GUTTER * (length - 1));
    var contentWidth = margins +
                       Math.max(cardWidth, cardStripWidth);
    this.cardsList.style.width = contentWidth + 'px';
  };

  TaskManager.prototype._centerCardAtPosition = function(idx, smooth) {
    var position = (this.cardWidth + this.CARD_GUTTER) * idx;
    if (smooth) {
      this.element.scrollTo({left: position, top: 0, behavior: 'smooth'});
    } else {
      this.element.scrollTo(position, 0);
    }
  };

  TaskManager.prototype.show = function cs_showCardSwitcher(filterName) {
    if (this.isShown()) {
      return;
    }
    if (document.mozFullScreen) {
      document.mozCancelFullScreen();
    }
    this.calculateDimensions();

    this.newStackPosition = null;
    // start listening for the various events we need to handle while
    // the card view is showing
    this._registerShowingEvents();

    this.unfilteredStack = StackManager.snapshot();
    if (this.filter(filterName)) {
      // Update visual style to indicate we're filtered.
      this.element.classList.add('filtered');
    }

    // First add an item to the cardsList for each running app
    var stack = this.stack;
    stack.forEach(function(app, position) {
      this.addCard(position, app);
    }, this);

    this.unfilteredStack.forEach(function(app, position) {
      app.enterTaskManager();
    });

    this._placeCards(false);
    if (this._stackIndex > 0) {
      this._centerCardAtPosition(this._stackIndex);
    }
    this.setActive(true);

    var screenElement = this.screenElement;
    var activeApp = Service.query('AppWindowManager.getActiveWindow');
    if (!activeApp) {
      screenElement.classList.add('cards-view');
      return;
    }

    if (activeApp.isHomescreen) {
      // Ensure the homescreen is in a closed state, as the user may choose
      // one of the app.
      activeApp.close('home-to-cardview');
      this.element.classList.add('from-home');
      window.addEventListener('homescreenclosed', this._appClosedHandler);
    } else {
      window.addEventListener('appclosed', this._appClosedHandler);
    }
  };

  /**
   * Hide the card switcher
   *
   * @memberOf TaskManager.prototype
   *
   */
  TaskManager.prototype.hide = function cs_hideCardSwitcher() {
    if (this.isActive()) {
      this._unregisterShowingEvents();
      this._removeCards();
      this.setActive(false);
      window.removeEventListener('appclosed', this._appClosedHandler);
      window.removeEventListener('homescreenclosed', this._appClosedHandler);
      this.screenElement.classList.remove('cards-view');

      var detail;
      if (!isNaN(this.newStackPosition)) {
        detail = { 'detail': { 'newStackPosition': this.newStackPosition }};
      }
      this.publishNextTick('cardviewclosed', detail);
    }
    this.stack = this.unfilteredStack = [];
  };


  TaskManager.prototype._showingEventsRegistered = false;

  TaskManager.prototype._registerShowingEvents = function() {
    if (this._showingEventsRegistered) {
      return;
    }
    this._showingEventsRegistered = true;
    window.addEventListener('lockscreen-appopened', this);
    window.addEventListener('attentionopened', this);
    window.addEventListener('appopen', this);
    window.addEventListener('appterminated', this);
    window.addEventListener('wheel', this);
    window.addEventListener('resize', this);

    this.element.addEventListener('click', this);
  };

  TaskManager.prototype._unregisterShowingEvents = function() {
    if (!this._showingEventsRegistered) {
      return;
    }
    window.removeEventListener('lockscreen-appopened', this);
    window.removeEventListener('attentionopened', this);
    window.removeEventListener('appopen', this);
    window.removeEventListener('appterminated', this);
    window.removeEventListener('wheel', this);
    window.removeEventListener('resize', this);
    this._showingEventsRegistered = false;
  };

  /**
   * Is the view currently active
   * @memberOf TaskManager.prototype
   *
   * XXX It would be nice to rename that to isActive, in order to be synced
   * with setActive method.
   */
  TaskManager.prototype.isShown = function() {
    return this.isActive();
  };

  /**
   * Is the view currently active
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.isActive = function() {
    return this._active;
  };

  /**
   * Toggle to activate/deactivate (mostly adding classes to elements)
   * @param {Boolean} true to activate, false to deactivate
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.setActive = function(active) {
    if (active == this._active) {
      return;
    }
    this._active = active;
    if (active) {
      this.publish(this.EVENT_PREFIX + '-activated');
    } else {
      this.publish(this.EVENT_PREFIX + '-deactivated');
    }
    this.element.classList.toggle('active', active);
    this.element.classList.toggle('empty', this.stack.length <= 1 && active);

    // XXX This code is weird as it does not seems symetric.
    // In one direction we considered that the card view is already shown,
    // while on the other this is before it is closed!
    this.publishNextTick(active ? 'cardviewshown' : 'cardviewbeforeclose');
  };

  /**
   * Apply filter 'filterName' to the card stack.
   *
   * @memberOf TaskManager.prototype
   * @param filterName {string} The name of the filter to apply.
   * @returns true if a filter was applied, false if not.
   */
  TaskManager.prototype.filter = function cs_filterCardStack(filterName) {
    var unfilteredStack = this.unfilteredStack;
    var noRecentWindows = document.getElementById('cards-no-recent-windows');
    switch (filterName) {
      // Filter out any application that is not a system browser window.
      case 'browser-only':
        this.stack = unfilteredStack.filter(function(app) {
          return app.isBrowser() ||
            (app.manifest && app.manifest.role === 'search');
        });
        navigator.mozL10n.setAttributes(noRecentWindows,
                                        'no-recent-browser-windows');
        break;

      // Filter out any application that is not an application only window.
      case 'apps-only':
        this.stack = unfilteredStack.filter(function(app) {
          return !app.isBrowser();
        });
        navigator.mozL10n.setAttributes(noRecentWindows,
                                        'no-recent-app-windows');
        break;

      default:
        this.stack = unfilteredStack;
        break;
    }

    var position = this.stack.indexOf(unfilteredStack[StackManager.position]);
    if (position === -1 || StackManager.outOfStack()) {
      this._shouldGoBackHome = true;
    } else {
      this._shouldGoBackHome = false;
    }
    this._stackIndex = position;

    return this.stack !== unfilteredStack;
  };


  /**
   * Insert a new card for the given app
   *
   * @memberOf TaskManager.prototype
   * @param {Number} position in the stack for the new card
   * @param {AppWindow} app The appWindow the card should wrap and represent
   */
  TaskManager.prototype.addCard = function cs_addCard(position, app) {
    var config = {
      manager: this,
      position: position,
      app: app,
      windowWidth: this.windowWidth,
      windowHeight: this.windowHeight
    };
    this.instantiateCard(config);
  };

  TaskManager.prototype.instantiateCard = function(config) {
    var card = new Card(config);
    this.cardsByAppID[config.app.instanceID] = card;
    this.cardsList.appendChild(card.render());
  };

  /**
   * Remove the given card
   *
   * @memberOf TaskManager.prototype
   * @param {object} card the card instance to be removed
   */
  TaskManager.prototype.removeCard = function cs_removeCard(card) {
    var element = card.element;
    var position = parseInt(element.dataset.position);
    delete this.cardsByAppID[card.app.instanceID];
    card.destroy();
    element = null;

    // stop tracking this app in our own stack.
    this.stack.splice(position, 1);

    // adjust stack pointer to next app
    if (position <= this._stackIndex) {
      this._stackIndex = Math.max(0, this._stackIndex - 1);
    }

    // Update the card positions.
    this._updateCardPositions(position);

    // Fix for non selectable cards when we remove the last card
    // Described in https://bugzilla.mozilla.org/show_bug.cgi?id=825293
    var cardsLength = this.cardsList.children.length;
    if (!cardsLength) {
      var homescreen = Service.query('getHomescreen', true);
      this.exitToApp(homescreen);
      return;
    }

    this._placeCards(position, true);
  };

  /**
   * Remove all cards
   *
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype._removeCards = function cs_removeCards() {
    this.stack.forEach(function(app, idx) {
      var card = this.cardsByAppID[app.instanceID];
      card && card.destroy();
    }, this);

    this.unfilteredStack.forEach(function(app, position) {
      app.leaveTaskManager();
    });

    this.cardsByAppID = {};
    this.element.classList.remove('filtered');
    this.cardsList.innerHTML = '';
  };

  /**
   * Handle the given action on the given card.
   *
   * @memberOf TaskManager.prototype
   * @param  {Card} card The card to call the action on.
   * @param  {String} actionName The name of the action to invoke.
   */
  TaskManager.prototype.cardAction = function cs_cardAction(card, actionName) {
    switch (actionName) {
      case 'close' :
        card.killApp();
        break;

      case 'favorite' :
        debug('cardAction: TODO: favorite ' + card.element.dataset.origin);
        break;

      case 'select' :
        if (this.currentCard == card) {
          this.exitToApp(card.app);
        } else {
          this.panToCard(card).then(() => {
            this.exitToApp(card.app);
          }).catch(() => {
            this.exitToApp(card.app);
          });
        }
        break;
    }
  };

  TaskManager.prototype.panToCard = function(card) {
    // TODO: better way to know we've arrived at the target card
    // and make the delay proportional to the distance panned
    // See: bug 1172171
    var promise = new Promise((resolve, reject) => {
      this._centerCardAtPosition(card.position, true);
      setTimeout(resolve, 200);
    });
    return promise;
  };

  TaskManager.prototype.exitToApp = function(app) {
    // The cards view class is removed here in order to let the window
    // manager repaints everything.
    this.screenElement.classList.remove('cards-view');
    // immediately stop listening for input events
    this._unregisterShowingEvents();

    if (this._shouldGoBackHome) {
      app = app || Service.query('getHomescreen', true);
    } else if (!app) {
      var currentCard = this.currentCard;
      app = (this.stack && this.stack.length) ?
              currentCard && currentCard.app :
              Service.query('getHomescreen', true);
    }
    // to know if position has changed we need index into original stack,
    var position = this.unfilteredStack ? this.unfilteredStack.indexOf(app) :
                                          -1;

    if (position !== StackManager.position) {
      this.newStackPosition = position;
    }

    setTimeout(() => {
      var finish = () => {
        this.element.classList.remove('to-home');
        this.hide();
      };
      eventSafety(app.element, '_opened', finish, 400);

      if (app.isHomescreen) {
        this.element.classList.add('to-home');
        app.open('home-from-cardview');
      } else {
        app.open('from-cardview');
      }
    }, 100);

  };

  /**
   * Handle wheel events produced by the screen reader on two finger swipe.
   * @memberOf TaskManager.prototype
   * @param  {DOMEvent} evt The event.
   */
  TaskManager.prototype.handleWheel = function cs_handleWheel(evt) {
    if (evt.deltaMode !== evt.DOM_DELTA_PAGE || evt.deltaY < 0) {
      // nothing to do, just let it scroll
    } else if (evt.deltaY > 0) {
      // Two finger swipe up.
      var card = this.currentCard;
      if (card.app.killable()) {
        card.killApp();
      }
    }
    // update  with new centered/current card
    this._setAccessibilityAttributes();
  };

  TaskManager.prototype.respondToHierarchyEvent = function(evt) {
    if (this['_handle_' + evt.type]) {
      return this['_handle_' + evt.type](evt);
    }
    return true;
  };

  TaskManager.prototype._handle_home = function() {
    if (this.isActive()) {
      this._shouldGoBackHome = true;
      this.exitToApp();
      return false;
    }
    return true;
  };

  TaskManager.prototype._handle_holdhome = function(evt) {
    if (this.isShown()) {
      return true;
    }

    var filter = null;
    if (evt.type === 'taskmanagershow') {
      filter = (evt.detail && evt.detail.filter) || null;
    }

    var currOrientation = Service.query('fetchCurrentOrientation');
    var shouldResize = (Service.query('defaultOrientation').split('-')[0] !=
                        currOrientation.split('-')[0]);
    var shouldHideKeyboard = Service.query('keyboardEnabled');

    this.publish('cardviewbeforeshow'); // Will hide the keyboard if needed

    var finish = () => {
      if (shouldHideKeyboard) {
        window.addEventListener('keyboardhidden', function kbHidden() {
          window.removeEventListener('keyboardhidden', kbHidden);
          shouldHideKeyboard = false;
          setTimeout(finish);
        });
        return;
      }

      screen.mozLockOrientation(Service.query('defaultOrientation'));
      if (shouldResize) {
        // aspect ratio change will produce resize event
        window.addEventListener('resize', function resized() {
          window.removeEventListener('resize', resized);
          shouldResize = false;
          setTimeout(finish);
        });
        return;
      }

      var app = Service.query('AppWindowManager.getActiveWindow');
      if (app && !app.isHomescreen) {
        app.getScreenshot(function onGettingRealtimeScreenshot() {
          this.show(filter);
        }.bind(this), 0, 0, 400);
      } else {
        this.show(filter);
      }
    };

    finish();
  };

  /**
   * Handle (synthetic) tap events on the card list
   *
   * @memberOf TaskManager.prototype
   * @param  {DOMEvent} evt The event.
   */
  TaskManager.prototype.handleTap = function cs_handleTap(evt) {
    if (this.element.classList.contains('empty')) {
      var homescreen = Service.query('getHomescreen', true);
      this.exitToApp(homescreen);
      return;
    }

    var targetNode = evt.target;
    var card = this.getCardForElement(targetNode);
    if (!card) {
      return;
    }

    if ('buttonAction' in targetNode.dataset) {
      this.cardAction(card, targetNode.dataset.buttonAction);
      return;
    }

    if (('position' in targetNode.dataset) || card) {
      this.cardAction(card, 'select');
      return;
    }
  };

  /**
   * Gets current sizing information on resize or render.
   * @memberOf TaskManager.prototype
   * @param  {DOMEvent} evt The event.
   */
  TaskManager.prototype.calculateDimensions =
    function cv_calculateDimensions(evt) {
    this.windowWidth = window.innerWidth;
    this.windowHeight = window.innerHeight;
    // swipe up gesture should be proportional to current viewport height
    this.SWIPE_UP_THRESHOLD = this.windowHeight / 4;
  };

  /**
   * Default event handler
   * @memberOf TaskManager.prototype
   * @param  {DOMEvent} evt The event.
   */
  TaskManager.prototype.handleEvent = function cv_handleEvent(evt) {
    var app;
    switch (evt.type) {
      case 'click':
        this.handleTap(evt);
        break;

      case 'resize':
        this.calculateDimensions();
        break;

      case 'wheel':
        this.handleWheel(evt);
        break;

      case 'lockscreen-appopened':
      case 'attentionopened':
        this.exitToApp();
        break;

      case 'taskmanagershow':
        this._handle_holdhome(evt);
        break;

      case 'taskmanagerhide':
      case 'appopen':
        this.hide();
        break;

      case 'appterminated':
        app = evt.detail;
        var card = app && this.cardsByAppID[app.instanceID];
        if (card && card.app && app.instanceID === card.app.instanceID) {
          this.removeCard(card);
        }
        break;
    }
  };

  TaskManager.prototype.publish = function tm_publish(type, detail) {
    var event = new CustomEvent(type, detail || null);
    window.dispatchEvent(event);
  };

  TaskManager.prototype.publishNextTick = function tm_publish(type, detail) {
    var event = new CustomEvent(type, detail || null);
    setTimeout(function nextTick() {
      window.dispatchEvent(event);
    });
  };

   /**
    * Return the card object at the given index into the stack
    * @memberOf TaskManager.prototype
    * @param {Number} idx index into the stack
    */
  TaskManager.prototype.getCardAtIndex = function(idx) {
    if (this.stack && idx > -1 && idx < this.stack.length) {
      var app = this.stack[idx];
      var card = app && this.cardsByAppID[app.instanceID];
      if (card) {
        return card;
      }
    }
    debug('getCardAtIndex, no card at idx: ' + idx);
    return null;
  };

  /**
   * Return the card object that owns the given element
   * @memberOf TaskManager.prototype
   * @param {DOMNode} element
   */
  TaskManager.prototype.getCardForElement = function(element) {
    while (element && element !== this.element) {
      if (element.classList.contains('card')) {
        break;
      }
      element = element.parentNode;
    }
    return element && this.cardsByAppID[element.dataset.appInstanceId];
  };

  /**
   * Add ARIA attributes to available cards.
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype._setAccessibilityAttributes = function() {
    if (!this.stack.length) {
      return;
    }
    var currentCard = this.currentCard;
    this.stack.forEach(function(app, idx) {
      var card = this.cardsByAppID[app.instanceID];
      if (!card) {
        return;
      }

      // Hide non-current apps from the screen reader.
      card.setVisibleForScreenReader(card === currentCard);
      // Update the screen reader card list size.
      card.element.setAttribute('aria-setsize', this.stack.length);
      // Update the screen reader card index.
      card.element.setAttribute('aria-posinset', idx + 1);
    }, this);
  };

  /**
   * Arrange the cards around the current position
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype._placeCards = function(firstIndex, smoothly) {
    this._setContentWidth(this.stack.length);

    var cardWidth = this.cardWidth;
    // add left margin to center the first card
    var startX = (this.windowWidth - this.cardWidth) / 2;
    var cardElements = Array.from(this.cardsList.children).slice(firstIndex);

    cardElements.forEach((elm, idx) => {
      var offset = (cardWidth + this.CARD_GUTTER);
      var left = startX + offset * (idx + firstIndex);
      elm.style.left = left + 'px';
      if (smoothly) {
        elm.style.transform = 'translateX(' +offset+ 'px)';
        setTimeout(() => {
          elm.classList.add('sliding');
          elm.style.transform = 'translateX(0)';
          eventSafety(elm, 'transitionend', function endSlide(e) {
            elm.classList.remove('sliding');
            elm.style.removeProperty('transform');
          }, 250);
        }, 0);
      }
    });

    this._setAccessibilityAttributes();
  };

  TaskManager.prototype._updateCardPositions = function(firstIndex) {
    if (!this.cardsList) {
      return;
    }
    var cardNodes = this.cardsList.children;
    var remainingCard;
    for (var i = firstIndex || 0; i < cardNodes.length; i++) {
      remainingCard = this.getCardForElement(cardNodes[i]);
      if (remainingCard) {
        remainingCard.position = i;
        cardNodes[i].dataset.position = i;
      }
    }
  };

  TaskManager.prototype._getPositionFromScrollOffset = function(offset) {
    var lastIndex = this.stack.length -1;
    if (lastIndex < 0) {
      return -1;
    }
    var pos = Math.min(lastIndex,
                       Math.floor(offset / this.cardWidth));
    return pos;
  };

  exports.TaskManager = TaskManager;

  function debug(message) {
    if (DEBUG) {
      var args = Array.from(arguments);
      if (typeof args[0] === 'string') {
        args[0] = 'TaskManager > ' + args[0];
      } else {
        args.unshift('TaskManager > ');
      }
      console.log.apply(console, args);
    }
  }
})(window);
