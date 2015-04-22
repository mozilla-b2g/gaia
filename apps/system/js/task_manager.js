/* global Card, eventSafety, SettingsListener, layoutManager,
          Service, homescreenLauncher, StackManager, OrientationManager */

(function(exports) {
  'use strict';

  var DEBUG = false;

  /**
   * Represent a stack of apps as cards
   * @class TaskManager
   */
  function TaskManager() {
    this.stack = null;
    this.cardsByAppID = {};
  }

  TaskManager.prototype = Object.create({
    /**
     * The setting that enables/disables using screenshots vs. icons for the
     *  card preview
     * @memberof TaskCard.prototype
     */
    SCREENSHOT_PREVIEWS_SETTING_KEY: 'app.cards_view.screenshots.enabled',

    DURATION: 200,

    // Arbitrarily chosen to be 4x larger than the gecko18 drag
    // threshold.  This constant should be a truemm/mozmm value, but
    // it's hard for us to evaluate that here.
    SWIPE_UP_THRESHOLD: 100,

    SWITCH_CARD_THRESHOLD: 30,

    /**
     * Cached value of the screenshots.enabled setting
     * @memberOf TaskManager.prototype
     */
    useAppScreenshotPreviews: true,

    /**
     * Index into the stack of the current app/card
     * @memberOf TaskManager.prototype
     */
    position: 0,


    _shouldGoBackHome: false,
    _active: false,

    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight
  }, {
    /**
     * Getter for the current card
     * @memberOf TaskManager.prototype
     */
    currentCard: {
      get: function cs_getCurrentCard() {
        return this.getCardAtIndex(this.position);
      }
    }
  });

  TaskManager.prototype.EVENT_PREFIX = 'taskmanager';
  TaskManager.prototype.name = 'TaskManager';

  /**
   * initialize
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.start = function() {
    this._fetchElements();
    this._registerEvents();
    this._appClosedHandler = this._appClosed.bind(this);
    Service.request('registerHierarchy', this);
  };

  TaskManager.prototype.stop = function() {
    this._unregisterEvents();
    Service.request('unregisterHierarchy', this);
  };

  TaskManager.prototype._fetchElements = function() {
    this.element = document.getElementById('cards-view'),
    this.cardsList = document.getElementById('cards-list');
    this.screenElement = document.getElementById('screen');
  };

  TaskManager.prototype._registerEvents = function() {
    window.addEventListener('taskmanagershow', this);

    this.onPreviewSettingsChange = function(settingValue) {
      this.useAppScreenshotPreviews = settingValue;
    }.bind(this);

    SettingsListener.observe(this.SCREENSHOT_PREVIEWS_SETTING_KEY,
                             this.useAppScreenshotPreviews,
                             this.onPreviewSettingsChange);
  };

  TaskManager.prototype._unregisterEvents = function() {
    window.removeEventListener('taskmanagershow', this);

    SettingsListener.unobserve(this.SCREENSHOT_PREVIEWS_SETTING_KEY,
                               this.onPreviewSettingsChange);
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

    this._placeCards();
    this.setActive(true);

    var screenElement = this.screenElement;
    var activeApp = Service.currentApp;
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
    if (!this.isActive()) {
      return;
    }
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

    this.element.addEventListener('touchstart', this);
    this.element.addEventListener('touchmove', this);
    this.element.addEventListener('touchend', this);
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
    if (this.element) {
      this.element.removeEventListener('touchstart', this);
      this.element.removeEventListener('touchmove', this);
      this.element.removeEventListener('touchend', this);
    }
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
    this.element.classList.toggle('empty', !this.stack.length && active);

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
    var unfilteredStack = this.unfilteredStack = StackManager.snapshot();

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

    this.position = this.stack.indexOf(unfilteredStack[StackManager.position]);
    if (this.position === -1 || StackManager.outOfStack()) {
      this.position = this.stack.length - 1;
      this._shouldGoBackHome = true;
    } else {
      this._shouldGoBackHome = false;
    }

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
    var card = new Card(config);
    this.cardsByAppID[app.instanceID] = card;
    this.cardsList.appendChild(card.render());

    if (position <= this.position - 2 || position >= this.position + 2) {
      card.element.style.visibility = 'hidden';
    }
  };

  /**
   * Remove the given card
   *
   * @memberOf TaskManager.prototype
   * @param {object} card the card instance to be removed
   */
  TaskManager.prototype.removeCard = function cs_removeCard(card) {
    var element = card.element;
    var position = element.dataset.position;
    delete this.cardsByAppID[card.app.instanceID];
    card.destroy();
    element = null;

    // stop tracking this app in our own stack.
    this.stack.splice(position, 1);

    // Update the card positions.
    var cardNodes = this.cardsList.childNodes;
    for (var i = position, remainingCard = null; i < cardNodes.length; i++) {
      remainingCard = this.getCardForElement(cardNodes[i]);
      if (remainingCard) {
        remainingCard.position = i;
        cardNodes[i].dataset.position = i;
      }
    }

    // Fix for non selectable cards when we remove the last card
    // Described in https://bugzilla.mozilla.org/show_bug.cgi?id=825293
    var cardsLength = cardNodes.length;
    if (!cardsLength) {
      var homescreen = homescreenLauncher.getHomescreen(true);
      this.exitToApp(homescreen);
    }

    if (cardsLength === this.position) {
      this.position--;
    }
    this.alignCurrentCard();
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

        if (this.position != card.position) {
          // Make the target app, the selected app
          this.position = card.position;
          this.alignCurrentCard();
        }

        var self = this;
        this.currentCard.element.addEventListener('transitionend',
          function afterTransition(e) {
            e.target.removeEventListener('transitionend', afterTransition);
            self.exitToApp(card.app);
          });
        this.currentCard.element.classList.add('select');

        break;
    }
  };

  TaskManager.prototype.exitToApp = function(app) {
    // The cards view class is removed here in order to let the window
    // manager repaints everything.
    this.screenElement.classList.remove('cards-view');
    // immediately stop listening for input events
    this._unregisterShowingEvents();

    if (this._shouldGoBackHome) {
      app = app || homescreenLauncher.getHomescreen(true);
    } else if (!app) {
      app = this.stack ? this.stack[this.position] :
                         homescreenLauncher.getHomescreen(true);
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
      return;
    }
    if (evt.deltaY > 0) {
      // Two finger swipe up.
      var card = this.currentCard;
      if (card.app.killable()) {
        card.killApp();
      } else {
        card.applyStyle({ MozTransform: '' });
      }
    } else if (evt.deltaX > 0 &&
      this.position < this.cardsList.childNodes.length - 1) {
      // Two finger swipe left.
      this.position++;
    } else if (evt.deltaX < 0 && this.position > 0) {
      // Two finger swipe right.
      this.position--;
    }
    this.alignCurrentCard();
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


    var shouldResize = (OrientationManager.defaultOrientation !=
                        OrientationManager.fetchCurrentOrientation());
    var shouldHideKeyboard = layoutManager.keyboardEnabled;

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

      screen.mozLockOrientation(OrientationManager.defaultOrientation);
      if (shouldResize) {
        window.addEventListener('resize', function resized() {
          window.removeEventListener('resize', resized);
          shouldResize = false;
          setTimeout(finish);
        });
        return;
      }

      var app = Service.currentApp;
      if (app && !app.isHomescreen) {
        app.getScreenshot(function onGettingRealtimeScreenshot() {
          this.show(filter);
        }.bind(this), 0, 0, 300);
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
    var targetNode = evt.target;

    var cardElem = null;
    var tmpNode = targetNode;
    while (tmpNode) {
      if (tmpNode.classList && tmpNode.classList.contains('card')) {
        cardElem = tmpNode;
        break;
      }
      tmpNode = tmpNode.parentNode;
    }

    var card = this.getCardForElement(cardElem);
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
  };

  /**
   * Default event handler
   * @memberOf TaskManager.prototype
   * @param  {DOMEvent} evt The event.
   */
  TaskManager.prototype.handleEvent = function cv_handleEvent(evt) {
    var app;
    switch (evt.type) {
      case 'touchstart':
        this.onTouchStart(evt);
        evt.preventDefault();
        evt.stopPropagation();
        break;

      case 'touchmove':
        this.onTouchMove(evt);
        evt.stopPropagation();
        evt.preventDefault();
        break;

      case 'touchend':
        this.onTouchEnd(evt);
        evt.stopPropagation();
        evt.preventDefault();
        break;

      case 'resize':
        this.calculateDimensions();
        this.alignCurrentCard();
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
    return element && this.cardsByAppID[element.dataset.appInstanceId];
  };

  /**
   * Add ARIA attributes to available cards.
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype._setAccessibilityAttributes = function() {
    this.stack.forEach(function(app, idx) {
      var card = this.cardsByAppID[app.instanceID];
      if (!card) {
        return;
      }

      // Hide non-current apps from the screen reader.
      card.setVisibleForScreenReader(idx === this.position);
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
  TaskManager.prototype._placeCards = function() {
    this.stack.forEach(function(app, idx) {
      var card = this.cardsByAppID[app.instanceID];
      if (!card) {
        return;
      }

      card.move(0, 0);
      card.element.classList.toggle('current', (idx == this.position));
    }.bind(this));

    this._setAccessibilityAttributes();
  };

  /**
   * Get the current card front and center
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.alignCurrentCard = function(duration, callback) {
    this._setupCardsTransition(duration || this.DURATION);

    setTimeout(function(self) {
      self._placeCards();
    }, 0, this);
  };

  /**
   * Adjust card positions by our current delta values
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.moveCards = function() {
    var deltaX = this.deltaX;
    var sign = (deltaX > 0) ? -1 : 1;

    // Resistance at the extremities of the strip
    if (this.onExtremity()) {
      deltaX /= 1.5;
    }

    var current = this.position;
    this.stack.forEach(function(app, idx) {
      var card = this.cardsByAppID[app.instanceID];
      if (idx >= current - 2 && idx <= current + 2) {
        card.move(Math.abs(deltaX) * sign);
      }
    }, this);
  };

  /**
   * Check if the current gesture happens at an extremity
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.onExtremity = function() {
    var sign = (this.deltaX > 0) ? -1 : 1;
    return (this.position === 0 && sign === 1 ||
            this.position === this.stack.length - 1 && sign === -1);
  };

  /**
   * @memberOf TaskManager.prototype
   * @param {DOMEvent} evt
   */
  TaskManager.prototype.onTouchMoveForDeleting = function(evt) {
    var dx = this.deltaX;
    var dy = this.deltaY;

    if (dy > 0) {
      var card = this.getCardForElement(evt.target);
      if (!card) {
        return;
      }

      if ('function' == typeof card.move) {
        card.move(dx, -dy);
      } else {
        card.applyStyle({
          transform: 'translateY(' + (-dy) + 'px)'
        });
      }
    }
  };

  /**
   * @memberOf TaskManager.prototype
   * @param {DOMEvent} evt
   */
  TaskManager.prototype.onTouchStart = function cs_onTouchStart(evt) {
    // If there is no card in the cardsView, go back to home screen
    if (this.element.classList.contains('empty')) {
      var homescreen = homescreenLauncher.getHomescreen(true);
      this.exitToApp(homescreen);
      return;
    }

    this._dragPhase = '';
    this.deltaX = 0;
    this.deltaY = 0;
    this.startTouchPosition = [evt.touches[0].pageX, evt.touches[0].pageY];
    this.startTouchDate = Date.now();
    this._resetCardsTransition();
  };

  /**
   * Handle end-of-drag events on the card list
   *
   * @memberOf TaskManager.prototype
   * @param  {DOMEvent} evt The event.
   */
  TaskManager.prototype.onTouchEnd = function cs_onTouchEnd(evt) {
    this.deltaX = evt.changedTouches[0].pageX - this.startTouchPosition[0];
    this.deltaY = evt.changedTouches[0].pageY - this.startTouchPosition[1];

    // Does the gesture is a swipe to delete a card ?
    if (this._dragPhase == 'cross-slide') {
      var element = evt.target;
      var card = this.getCardForElement(element);
      if (!card) {
        return;
      }

      if (-this.deltaY > this.SWIPE_UP_THRESHOLD && card.app.killable()) {
        card.killApp();
      } else {
        card.applyStyle({ transform: '' });
      }

      this.alignCurrentCard();
      return;
    }

    // Does the gesture is a tap ?
    if (Math.abs(this.deltaX) <= /* tap threshold */ 1) {
      this.handleTap(evt);
      return;
    }

    // The gesture is a simple swipe, move the target card at the center.
    var speed = this.deltaX / (Date.now() - this.startTouchDate);
    var inertia = speed * 250;
    var boosted = this.deltaX + inertia;
    var progress = Math.abs(boosted) / this.windowWidth;

    if (progress > 0.5) {
      progress -= 0.5;
    }

    var switching = Math.abs(boosted) >= this.SWITCH_CARD_THRESHOLD;
    if (switching) {
      if (this.deltaX < 0 &&
          this.position < this.cardsList.childNodes.length - 1) {
        this.position++;
      } else if (this.deltaX > 0 && this.position > 0) {
        this.position--;
      }
    }

    var durationLeft = Math.max(50, (1 - progress) * this.DURATION);
    this.alignCurrentCard(durationLeft);
  };


  /**
   * @memberOf TaskManager.prototype
   * @param {DOMEvent} evt
   */
  TaskManager.prototype.onTouchMove = function cs_onTouchMove(evt) {
    this.deltaX = this.startTouchPosition[0] - evt.touches[0].pageX;
    this.deltaY = this.startTouchPosition[1] - evt.touches[0].pageY;

    switch (this._dragPhase) {
      case '':
        if (this.deltaY > this.SWIPE_UP_THRESHOLD &&
            evt.target.classList.contains('card')) {
          // We don't want user to scroll the CardsView when one of the card is
          // already dragger upwards
          this._dragPhase = 'cross-slide';
          this.onTouchMoveForDeleting(evt);
        } else {
          // If we are not removing Cards now and Snapping Scrolling is enabled,
          // we want to scroll the CardList
          if (Math.abs(this.deltaX) > this.SWITCH_CARD_THRESHOLD) {
            this._dragPhase = 'scrolling';
          }

          this.moveCards();
        }
        break;

      case 'cross-slide':
        this.onTouchMoveForDeleting(evt);
        break;

      case 'scrolling':
        this.moveCards();
        break;
    }
  };

  TaskManager.prototype._setupCardsTransition = function(duration) {
    var currentCard = this.currentCard;
    var position = this.position;

    var self = this;
    this.stack.forEach(function(app, idx) {
      var card = self.cardsByAppID[app.instanceID];

      if (idx < position - 2 || idx > position + 2) {
        card.element.style.visibility = 'hidden';
        return;
      }

      // The 5 cards at the center should be visible but we need to adjust the
      // transitions durations/delays to account for the layer trickery.
      // Layer Trickery: nf, cards that should be completely outside the
      // viewport but are in fact 0.001 pixel in.
      card.element.style.visibility = '';

      var distance = card.element.dataset.keepLayerDelta;
      var currentCardDistance = Math.abs(currentCard.element.dataset.positionX);
      if (idx == position + 2 || idx == position - 2) {
        var cardWidth = self.windowWidth * 0.48;
        var destination = self.windowWidth / 2 + cardWidth / 2;
        if (card.element.dataset.positionX < 0) {
          destination *= -1;
        }

        distance = Math.abs(destination - card.element.dataset.positionX);

        var shorterDuration = distance * duration / currentCardDistance;
        var fast = { transition: 'transform ' + shorterDuration + 'ms linear'};
        card.applyStyle(fast);
        return;
      }

      if (!distance) {
        var style = { transition: 'transform ' + duration + 'ms linear'};
        card.applyStyle(style);
        return;
      }

      var delay = duration * distance / currentCardDistance;
      var delayed = { transition: 'transform ' +
                                   (duration - delay) + 'ms linear ' +
                                   delay + 'ms'};
      card.applyStyle(delayed);
    });

  };

  TaskManager.prototype._resetCardsTransition = function() {
    var zeroTransitionStyle = { transition: '' };
    this.stack.forEach(function(app, idx) {
      var card = this.cardsByAppID[app.instanceID];
      card.applyStyle(zeroTransitionStyle);
    }, this);
  };

  exports.TaskManager = TaskManager;

  function debug(message) {
    if (DEBUG) {
      console.log('TaskManager > \n  ', message);
    }
  }
})(window);
