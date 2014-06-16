/* global Card, TaskCard,
          AppWindowManager, sleepMenu, SettingsListener, AttentionScreen,
          OrientationManager, System,
          GestureDetector, UtilityTray, StackManager, Event */

'use strict';

(function(exports) {
  var DEBUG = false;

  /**
   * Represent a stack of apps as cards
   *
   * The view is built and event listeners attached when the show method
   *
   * Implements some of BaseUI interface (but does not extend that class)
   *
   * @class TaskManager
   */
  function TaskManager() {
    this.stack = null;
    this.cardsByOrigin = {};
    // Unkillable apps which have attention screen now
    this.attentionScreenApps = [];

    // Listen for settings changes
    this.onRocketbarEnabledChange = function(value) {
      debug('rocketbar.enabled: '+ value);
      this.isRocketbar = value;
    }.bind(this);
    SettingsListener.observe('rocketbar.enabled', false,
                             this.onRocketbarEnabledChange);
  }

  TaskManager.prototype = Object.create({
    /**
     * Use the carousel-style card view (false) or
     * the Haida-style horizontal task-manager (true)
     */
    isRocketbar: false,

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
     * if 'true' user can close the app by dragging it upwards
     * @memberOf TaskManager.prototype
     */
    allowSwipeToClose: true,

    /**
     * Index into the stack of the currently displayed app/card
     * @memberOf TaskManager.prototype
     */
    currentDisplayed: 0,

    /**
     * Index into the stack of the currently app/card
     * @memberOf TaskManager.prototype
     */
    currentPosition: 0,

    /**
     * Is a cross-axis drag going on?
     * @memberOf TaskManager.prototype
     */
    draggingCardUp: false,

    /**
     * Are we moving card left or right?
     * @memberOf TaskManager.prototype
     */
    sortingDirection: null,

    _showing: false
  }, {
    /**
     * Getter for the current card
     * @memberOf TaskManager.prototype
     */
    currentCard: {
      get: function cs_getCurrentCard() {
        return this.getCardAtIndex(this.currentDisplayed);
      }
    },
    /**
     * Getter for the previous card in the stack
     * @memberOf TaskManager.prototype
     */
    prevCard: {
      // e.g. stack looks like: 0:phone, 1:Contacts, 2:Settings
      // if currentDisplayed is 0, prev is -1 i.e. null
      get: function cs_getPrevCard() {
        return this.getCardAtIndex(this.currentDisplayed - 1);
      }
    },
    /**
     * Getter for the next card in the stack
     * @memberOf TaskManager.prototype
     */
    nextCard: {
      // e.g. stack looks like: 0:phone, 1:Contacts, 2:Settings
      // if currentDisplayed is 2, next is 3 i.e. null
      get: function cs_getNextCard() {
        return this.getCardAtIndex(this.currentDisplayed + 1);
      }
    },
    /**
     * Getter to access cached window innerWidth measurement
     * @memberOf TaskManager.prototype
     */
    windowWidth: {
      get: function cs_getWindowWidth() {
        return this._windowWidth;
      }
    },
    /**
     * Getter to access cached window innerHeight measurement
     * @memberOf TaskManager.prototype
     */
    windowHeight: {
      get: function cs_getWindowHeight() {
        return this._windowHeight;
      }
    }
  });

  /**
   * initialize
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.start = function() {
    this._fetchElements();
    // start gesture detecting asap, but defer most of the init until first
    // call to .show();

    var gd = this.constructor._gestureDetector;
    if (!gd) {
      gd = new GestureDetector(this.element);
      this.constructor._gestureDetector = gd;
      gd.startDetecting();
    }

    var previewSettingKey = this.SCREENSHOT_PREVIEWS_SETTING_KEY;
    // get initial setting value for screenshot previews
    // and watch for changes
    var settingRequest = SettingsListener.getSettingsLock()
                         .get(previewSettingKey);

    settingRequest.onsuccess = function() {
      var settingValue = settingRequest.result[previewSettingKey];
      this.useAppScreenshotPreviews = settingValue;
    }.bind(this);

    this._registerEvents();
    this.stop = function() {
      this._unregisterEvents();
      gd.stopDetecting();
    };
  };

  TaskManager.prototype._fetchElements = function() {
    // the DOMElement for the card switcher
    this.element = document.getElementById('cards-view'),

    this.cardsList = document.getElementById('cards-list');
    this.screenElement = document.getElementById('screen');
  };

  TaskManager.prototype._registerEvents = function() {
    window.addEventListener('attentionscreenshow', this);
    window.addEventListener('attentionscreenhide', this);
    window.addEventListener('taskmanagershow', this);
    window.addEventListener('taskmanagerhide', this);
    window.addEventListener('holdhome', this);
    window.addEventListener('home', this);
    window.addEventListener('appopen', this);

    this.onPreviewSettingsChange = function(settingValue) {
      this.useAppScreenshotPreviews = settingValue;
    }.bind(this);

    SettingsListener.observe(this.SCREENSHOT_PREVIEWS_SETTING_KEY,
                             this.useAppScreenshotPreviews,
                             this.onPreviewSettingsChange);
  };

  TaskManager.prototype._unregisterEvents = function() {
    window.removeEventListener('attentionscreenshow', this);
    window.removeEventListener('attentionscreenhide', this);
    window.removeEventListener('taskmanagershow', this);
    window.removeEventListener('taskmanagerhide', this);
    window.removeEventListener('holdhome', this);
    window.removeEventListener('home', this);
    window.removeEventListener('appopen', this);

    SettingsListener.unobserve(this.SCREENSHOT_PREVIEWS_SETTING_KEY,
                               this.onPreviewSettingsChange);
    SettingsListener.unobserve('rocketbar.enabled',
                               this.onRocketbarEnabledChange);
  };

  /**
   * Is the view currently showing
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.isShown = function() {
    return this._showing;
  };

  /**
   * Toggle to activate/deactivate (mostly adding classes to elements)
   * @param {Boolean} true to activate, false to deactivate
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.setActive = function(toActive) {
    var cardsView = this.element;
    if (toActive == cardsView.classList.contains('active')) {
      // no change
      return;
    }
    if (toActive) {
      cardsView.classList.add('active');
      this._showing = true;
      this.fireCardViewShown();
    } else {
      cardsView.classList.remove('active');
      this._showing = false;
      // Let everyone know we're about to close the cards view
      this.fireCardViewBeforeClose();
    }
  };

  /**
   * Hide the card switcher
   *
   * @memberOf TaskManager.prototype
   * @param {Boolean} removeImmediately true to skip transitions when hiding
   * @param {Number} newStackPosition to include in the event detail
   *
   */
  TaskManager.prototype.hide = function cs_hideCardSwitcher(removeImmediately,
                                                            newStackPosition) {
    if (!this.isShown()) {
      return;
    }

    var cardsView = this.element;

    // events to handle
    window.removeEventListener('lock', this);
    window.removeEventListener('tap', this);
    window.removeEventListener('opencurrentcard', this);

    if (removeImmediately) {
      this.element.classList.add('no-transition');
    }

    // Make the cardsView overlay inactive
    this.setActive(false);

    // And remove all the cards from the document after the transition
    if (removeImmediately) {
      this.removeCards();
      cardsView.classList.remove('no-transition');
    } else {
      var cardsViewHidden = (function onTransitionEnd() {
        cardsView.removeEventListener('transitionend', cardsViewHidden);
        this.removeCards();
      }).bind(this);
      cardsView.addEventListener('transitionend', cardsViewHidden);
    }

    this.fireCardViewClosed(newStackPosition);
  };

  /**
   * Main entry point to show the card switcher
   *
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.show = function cs_showCardSwitcher() {
    // Build and display the card switcher overlay
    // Note that we rebuild the switcher each time we need it rather
    // than trying to keep it in sync with app launches.

    // Apps info from Stack Manager.
    var stack = this.stack = StackManager.snapshot();
    this.currentPosition = StackManager.position;

    // If we are currently displaying the homescreen but we have apps in the
    // stack we will display the most recently used application.
    if (this.currentPosition == -1 && stack.length) {
      this.currentPosition = stack.length - 1;
    }
    this.currentDisplayed = this.currentPosition;

    var currentApp = (stack.length && this.currentPosition > -1 &&
                     stack[this.currentPosition]);

    // Return early if isRocketbar and there are no apps.
    if (!currentApp && this.isRocketbar) {
      // Fire a cardchange event to notify rocketbar that there are no cards
      this.fireCardViewClosed();
      return;
    } else {
      // We can listen to appclose event
    }

    // stash some measurements now to avoid unexpected reflow later
    this._windowWidth = window.innerWidth;
    this._windowHeight = window.innerHeight;

    if (!this.initialTouchPosition) {
      this.setupCardSwiping();
    }

    // Close utility tray if it is opened.
    UtilityTray && UtilityTray.hide(true);

    // Now we can switch to the homescreen.
    // while the task manager is shown, the active app is the homescreen
    // so selecting an app switches from homescreen to that app
    // which gets us in the right state
    AppWindowManager.display(null, null, 'to-cardview');

    // We're committed to showing the card switcher.
    // Homescreen fades (shows its fade-overlay) on cardviewbeforeshow events
    this.fireCardViewBeforeShow();

    this.screenElement.classList.add('cards-view');
    if (this.isRocketbar) {
      this.screenElement.classList.add('task-manager');
    }

    // If there is no running app, show "no recent apps" message
    if (stack.length) {
      this.element.classList.remove('empty');
    } else {
      // (we already bailed for the isRocketbar case)
      this.element.classList.add('empty');
    }

    if (this.allowSwipeToClose) {
      this.element.addEventListener('touchstart', this);
    }

    // Make sure we're in default orientation
    screen.mozLockOrientation(OrientationManager.defaultOrientation);

    // First add an item to the cardsList for each running app
    stack.forEach(function(app, position) {
      this.addCard(position, app);
    }, this);

    // events to handle while shown
    window.addEventListener('lock', this);
    window.addEventListener('tap', this);
    window.addEventListener('opencurrentcard', this);

    this.setActive(true);
    this.placeCards();

    // At the beginning only the current card can listen to tap events
    if (stack.length) {
      this.currentCard.applyStyle({pointerEvents: 'auto'});
    }
  };

  /**
   * Insert a new card for the given app
   *
   * @memberOf TaskManager.prototype
   * @param {Number} position in the stack for the new card
   * @param {AppWindow} app The appWindow the card should wrap and represent
   */
  TaskManager.prototype.addCard = function cs_addCard(position,
                                                      app) {
    var config = {
      manager: this,
      position: position,
      app: app,
      _windowWidth: this.windowWidth,
      _windowHeight: this.windowHeight
    };
    var card = (this.isRocketbar) ?
                  new TaskCard(config) :
                  new Card(config);
    this.cardsByOrigin[app.origin] = card;
    this.cardsList.appendChild(card.render());
  };

  /**
   * Remove the given card
   *
   * @memberOf TaskManager.prototype
   * @param {object} card the card instance to be removed
   * @param {Boolean} removeImmediately Whether to skip animations
   */
  TaskManager.prototype.removeCard = function cs_removeCard(card,
                                                            removeImmediately) {
    var element = card.element;
    var position = element.dataset.position;
    delete this.cardsByOrigin[element.dataset.origin];
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
    if (cardsLength === this.currentDisplayed) {
      this.currentPosition--;
      if (this.currentPosition < 0) {
        this.currentPosition = 0;
      }
      this.currentDisplayed = this.currentPosition;
    }

    // If there are no cards left, then dismiss the task switcher.
    if (!cardsLength) {
      this.hide(removeImmediately);
    }
    else {
      this.alignCurrentCard();
    }
  };

  /**
   * Remove all cards
   *
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.removeCards = function cs_removeCards() {
    // bypass normal removeCards method to efficiently batch-remove all
    Object.keys(this.cardsByOrigin).forEach(function(origin) {
      var card = this.cardsByOrigin[origin];
      card.destroy();
    }, this);
    this.cardsByOrigin = {};

    this.screenElement.classList.remove('cards-view');
    this.screenElement.classList.remove('task-manager');
    this.cardsList.innerHTML = '';
    this.currentDisplayed = -1;
    this.deltaX = null;
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
          this.closeApp(card);
        return;
      case 'favorite' :
        debug('cardAction: TODO: favorite ' + card.element.origin);
        return;
      case 'select' :
        this.newStackPosition = card.position;
        AppWindowManager.display(
          card.app,
          'from-cardview',
          null
        );
        // Card switcher will get hidden when 'appopen' is fired.
        return;
    }
  };

  /**
   * Close (kill) the app associated with the given card and remove that card
   *
   * @memberOf TaskManager.prototype
   * @param  {Card} card An instance of Card or similar
   * @param  {Boolean} removeImmediately Skip any animations when closing
   */
  TaskManager.prototype.closeApp = function cs_closeApp(card,
                                                        removeImmediately) {
    card.killApp();
    this.removeCard(card, removeImmediately);
  };

  /**
   * Handle (synthetic) tap events on the card list
   *
   * @memberOf TaskManager.prototype
   * @param  {DOMEvent} evt The event.
   */
  TaskManager.prototype.handleTap = function cs_handleTap(evt) {
    // Handle close events
    var targetNode = evt.target;
    var containerNode = targetNode.parentNode;

    var tmpNode;
    var cardElem;
    var card;

    if (this.isRocketbar && ('buttonAction' in targetNode.dataset)) {
      tmpNode = containerNode;
      while ((tmpNode = tmpNode.parentNode)) {
        if (tmpNode.classList && tmpNode.classList.contains('card')) {
          cardElem = tmpNode;
          break;
        }
      }
      if (cardElem && (card = this.getCardForElement(cardElem))) {
        evt.stopPropagation();
        this.cardAction(card, targetNode.dataset.buttonAction);
        return;
      }
    }
    if (targetNode.classList.contains('close-card') &&
        this.cardsList.contains(containerNode)) {
      card = this.getCardForElement(containerNode);
      if (card) {
        this.cardAction(card, 'close');
      }
      return;
    }
    if (('position' in targetNode.dataset) ||
        targetNode.classList.contains('card')) {
      card = this.getCardForElement(targetNode);
      if (card) {
        this.cardAction(card, 'select');
      }
      return;
    }
  };

  /**
   * Handle end-of-drag events on the card list
   *
   * @memberOf TaskManager.prototype
   * @param  {DOMEvent} evt The event.
   */
  TaskManager.prototype.onEndEvent = function cs_onEndEvent(evt) {
    evt.stopPropagation();
    var element = evt.target;
    var eventDetail = evt.detail;
    var cardsView = this.element;

    document.releaseCapture();
    cardsView.removeEventListener('touchmove', this);
    cardsView.removeEventListener('touchend', this);
    cardsView.removeEventListener('swipe', this);

    var eventDetailEnd = eventDetail.end;
    var dx, dy, direction;

    if (eventDetailEnd) {
      dx = eventDetail.dx;
      dy = eventDetail.dy;
      direction = eventDetail.direction;
    } else {
      if (evt.changedTouches) {
        dx = evt.changedTouches[0].pageX - this.initialTouchPosition[0];
        dy = evt.changedTouches[0].pageY - this.initialTouchPosition[1];
      } else {
        dx = evt.pageX - this.initialTouchPosition[0];
        dy = evt.pageY - this.initialTouchPosition[1];
      }
      direction = dx > 0 ? 'right' : 'left';
    }

    if (!this.draggingCardUp) {
      if (Math.abs(dx) > this.threshold) {
        this.deltaX = dx;
        direction = dx > 0 ? 'right' : 'left';
        if (direction === 'left' &&
              this.currentDisplayed < this.cardsList.childNodes.length - 1) {
          this.currentDisplayed = ++this.currentPosition;

        } else if (direction === 'right' && this.currentDisplayed > 0) {
          this.currentDisplayed = --this.currentPosition;
        }
        this.alignCurrentCard();
      } else {
        this.handleTap(evt);
      }
      return;
    }

    // if the element we start dragging on is a card
    if (
      element.classList.contains('card') &&
      this.allowSwipeToClose &&
      this.draggingCardUp
    ) {
      this.draggingCardUp = false;
      var card = this.getCardForElement(element);
      if (-dy > this.swipeUpThreshold &&
          this.attentionScreenApps.indexOf(element.dataset.origin) == -1) {
        // Remove the card from the Task Manager for a smooth transition.
        this.cardsList.removeChild(element);
        this.closeApp(card);
      } else {
        card.applyStyle({ MozTransform: undefined });
      }
      this.alignCurrentCard();

      return;
    }
  };

  /**
   * Handle home events - hide the switcher and show the homescreen
   * @memberOf TaskManager.prototype
   * @param  {DOMEvent} evt The event.
   */
  TaskManager.prototype.goToHomescreen = function cs_goToHomescreen(evt) {
    if (!this.isShown()) {
      return;
    }

    window.dispatchEvent(new CustomEvent('cardviewclosedhome'));

    evt.stopImmediatePropagation();
    this.hide();
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
        this.onStartEvent(evt);
        evt.preventDefault();
        break;

      case 'touchmove':
        this.onMoveEvent(evt);
        evt.preventDefault();
        break;

      case 'touchend':
      case 'swipe':
        this.onEndEvent(evt);
        evt.preventDefault();
        break;

      case 'opencurrentcard':
        AppWindowManager.display(
          this.currentCard.app.origin,
          'from-cardview',
          null);
        break;

      case 'tap':
        this.handleTap(evt);
        break;

      case 'home':
        this.goToHomescreen(evt);
        break;

      case 'lock':
      case 'attentionscreenshow':
        this.attentionScreenApps =
            AttentionScreen.getAttentionScreenOrigins();
        this.hide();
        break;

      case 'attentionscreenhide':
        this.attentionScreenApps =
            AttentionScreen.getAttentionScreenOrigins();
        break;

      case 'taskmanagershow':
        this.show();
        break;

      case 'taskmanagerhide':
        this.hide();
        break;

      case 'holdhome':
        if (this.isShown() || System.locked) {
          return;
        }
        sleepMenu.hide();
        if (this.isRocketbar) {
          this.show();
        } else {
          app = AppWindowManager.getActiveApp();
          if (app) {
            app.getScreenshot(function onGettingRealtimeScreenshot() {
              this.show();
            }.bind(this));
          } else {
            // empty list entry point
            this.show();
          }
        }
        break;

      case 'appopen':
        if (!evt.detail.isHomescreen) {
          this.hide(/* immediately */ true, this.newStackPosition);
        }
        break;
    }
  };

  /**
   * @memberOf TaskManager.prototype
   * @param  {String} eventName
   */
  TaskManager.prototype.fireEventNextTick = function(eventName) {
    setTimeout(function nextTick() {
      window.dispatchEvent(new CustomEvent(eventName));
    });
  };

  /**
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.fireCardViewBeforeShow = function() {
    window.dispatchEvent(new CustomEvent('cardviewbeforeshow'));
  };

  /**
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.fireCardViewShown = function() {
    this.fireEventNextTick('cardviewshown');
  };

  /**
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.fireCardViewBeforeClose = function() {
    this.fireEventNextTick('cardviewbeforeclose');
  };

  /**
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.fireCardViewClosed = function(newStackPosition) {
    var detail = null;

    if (!isNaN(newStackPosition)) {
      detail = { 'detail': { 'newStackPosition': newStackPosition }};
    }

    var event = new CustomEvent('cardviewclosed', detail);
    setTimeout(function nextTick() {
      window.dispatchEvent(event);
    });
  };


  /**
   * Set/reset state to prepare for swipe/panning of the card list
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.setupCardSwiping = function() {
    //scrolling cards (Positon 0 is x-coord and position 1 is y-coord)
    this.initialTouchPosition = [0, 0];
    // If the pointer down event starts outside of a card, then there's
    // no ambiguity between tap/pan, so we don't need a transition
    // threshold.
    //
    // If pointerdown is on a card, then gecko's click detection will
    // resolve the tap/pan ambiguitiy.  So favor responsiveness of
    // switching the card.  It doesn't make sense for users to start
    // swiping because they want to stay on the same card.
    this.threshold = 1;
    // Distance after which dragged card starts moving
    this.moveCardThreshold = this.windowWidth / 6;

    // Arbitrarily chosen to be 4x larger than the gecko18 drag
    // threshold.  This constant should be a truemm/mozmm value, but
    // it's hard for us to evaluate that here.
    this.swipeUpThreshold = 100;
    this.switchingCardThreshold = 30;

    this.deltaX = 0;

    // With this object we avoid several if statements
    this.pseudoCard = {
      applyStyle: function() {},
      element: {
        style: {
          // Empty object
        },
        dataset: {},
        dispatchEvent: function() {
          // Do nothing
        },
        addEventListener: function() {}
      }
    };
  };

  /**
   * Return the card object at the given index into the stack
   * @memberOf TaskManager.prototype
   * @param {Number} idx index into the stack
   */
  TaskManager.prototype.getCardAtIndex = function(idx) {
    if (idx > -1) {
      var element = this.cardsList.childNodes[idx];
      if (!element) {
        debug('getCardAtIndex, no element at idx: ' + idx);
      }
      return element && this.cardsByOrigin[element.dataset.origin];
    }
    return null;
  };

  /**
   * Return the card object that owns the given element
   * @memberOf TaskManager.prototype
   * @param {DOMNode} element
   */
  TaskManager.prototype.getCardForElement = function(element) {
    return element && this.cardsByOrigin[element.dataset.origin];
  };

  /**
   * Arrange the cards around the current position
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.placeCards = function() {
    var currentCard = this.currentCard;
    if (!currentCard) {
      return;
    }

    var pseudoCard = this.pseudoCard;
    var currentPosition = this.currentPosition;
    var siblingScale = currentCard.SIBLING_SCALE_FACTOR;
    var currentScale = currentCard.SCALE_FACTOR;
    var siblingOpacity = currentCard.SIBLING_OPACITY;

    currentCard.element.dispatchEvent(new CustomEvent('onviewport'));
    // accumulate style property values on an object
    // which we'll send to that card's applyStyle method
    var currentCardStyle = {};

    var prevCard = this.prevCard || pseudoCard;
    prevCard.element.dispatchEvent(new CustomEvent('onviewport'));
    var prevCardStyle = {};

    var nextCard = this.nextCard || pseudoCard;
    nextCard.element.dispatchEvent(new CustomEvent('onviewport'));
    var nextCardStyle = {};

    if (this.isRocketbar) {
      // Scaling and translating cards to reach target positions
      this.stack.forEach(function(app, idx) {
        var offset = idx - currentPosition;
        var card = this.cardsByOrigin[app.origin];
        card.move(0, 0);
        var style = {
          opacity: 1
        };
        switch (offset) {
          case -1:
            card.element.dataset.cardPosition = 'previous';
            break;
          case 0:
            card.element.dataset.cardPosition = 'current';
            break;
          case 1:
            card.element.dataset.cardPosition = 'next';
            break;
        }
        card.applyStyle(style);
      }, this);
    } else {
      // Scaling and translating cards to reach target positions
      prevCardStyle.MozTransform =
        'scale(' + siblingScale + ') translateX(-100%)';
      currentCardStyle.MozTransform =
        'scale(' + currentScale + ') translateX(0)';
      nextCardStyle.MozTransform =
        'scale(' + siblingScale + ') translateX(100%)';

      // Current card sets the z-index to level 2 and opacity to 1
      currentCardStyle.zIndex = 2;
      currentCardStyle.opacity = 1;

      // Previous and next cards set the z-index to level 1 and opacity to 0.4
      prevCardStyle.zIndex = nextCardStyle.zIndex = 1;
      prevCardStyle.opacity = nextCardStyle.opacity = siblingOpacity;

      currentCard.applyStyle(currentCardStyle);
      prevCard.applyStyle(prevCardStyle);
      nextCard.applyStyle(nextCardStyle);
    }
  };

  /**
   * Get the current card front and center
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.alignCurrentCard = function(noTransition) {
    // We're going to release memory hiding card out of screen
    var currentCard = this.currentCard;
    if (!currentCard) {
      return;
    }
    var pseudoCard = this.pseudoCard;
    var prevCard = this.prevCard || pseudoCard;
    var nextCard = this.nextCard || pseudoCard;
    var prevCardStyle = {
      pointerEvents: 'none',
      MozTransition: currentCard.MOVE_TRANSITION
    };
    var nextCardStyle = {
      pointerEvents: 'none',
      MozTransition: currentCard.MOVE_TRANSITION
    };
    var currentCardStyle = {
      pointerEvents: 'auto',
      MozTransition: currentCard.MOVE_TRANSITION
    };

    if (this.deltaX < 0) {
      prevCard && prevCard.element.dispatchEvent(
        new CustomEvent('outviewport')
      );
    } else {
      nextCard && nextCard.element.dispatchEvent(
        new CustomEvent('outviewport')
      );
    }

    this.placeCards();

    currentCard.applyStyle(currentCardStyle);
    nextCard.applyStyle(nextCardStyle);
    prevCard.applyStyle(prevCardStyle);

    var onCardTransitionEnd = function transitionend() {
      currentCard.element.removeEventListener(onCardTransitionEnd);
      if (!this.currentCard) {
        // removeCards method was called immediately without waiting
        return;
      }
      var zeroTransitionStyle = { 'MozTransition' : undefined };
      (this.prevCard || pseudoCard).applyStyle(zeroTransitionStyle);
      (this.nextCard || pseudoCard).applyStyle(zeroTransitionStyle);
      this.currentCard.applyStyle(zeroTransitionStyle);
    }.bind(this);

    currentCard.element.addEventListener('transitionend', onCardTransitionEnd);

    if (noTransition) {
      currentCard.element.dispatchEvent(new Event('transitionend'));
    }
    // done with delta
    this.deltaX = 0;
  };

  /**
   * Adjust card positions by our current delta values
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.moveCards = function() {
    var deltaX = this.deltaX;
    var pseudoCard = this.pseudoCard;
    var nextStyle = {};
    var prevStyle = {};
    var currentCardStyle = {};
    var translateSign = (deltaX > 0) ? 100 : -100;
    var sign = (deltaX > 0) ? -1 : 1;
    var movementFactor = Math.abs(deltaX) / this.windowWidth;
    var currentCard = this.currentCard;

    if (this.isRocketbar) {

      this.stack.forEach(function(app, idx) {
        var card = this.cardsByOrigin[app.origin];
        card.move(Math.abs(deltaX) * sign);
      }, this);

    } else {
      var siblingScale = currentCard.SIBLING_SCALE_FACTOR;
      var currentScale = currentCard.SCALE_FACTOR;
      var scaleFactor = Math.abs((deltaX / this.windowWidth) *
                        (currentScale - siblingScale));
      var siblingOpacity = currentCard.SIBLING_OPACITY;

      // Scaling and translating next or previous sibling
      nextStyle.MozTransform = 'scale(' + (siblingScale + scaleFactor) +
          ') translateX(' + (translateSign * (1 - movementFactor)) + '%)';
      // Fading in new card
      nextStyle.opacity = siblingOpacity + (movementFactor *
                                            (1 - siblingOpacity));
      // Hiding the opposite sibling card progressively
      prevStyle.opacity = siblingOpacity - movementFactor;
      // Fading out current card
      currentCardStyle.opacity = 1 - (movementFactor * (1 - siblingOpacity));

      // Scaling and translating current card
      currentCardStyle.MozTransform = 'scale(' + (currentScale - scaleFactor) +
                                      ') translateX(' + -deltaX + 'px)';

      this.currentCard.applyStyle(currentCardStyle);
      if (deltaX > 0) {
        (this.nextCard || pseudoCard).applyStyle(nextStyle);
        (this.prevCard || pseudoCard).applyStyle(prevStyle);
      } else {
        (this.prevCard || pseudoCard).applyStyle(nextStyle);
        (this.nextCard || pseudoCard).applyStyle(prevStyle);
      }
    }

  };

  /**
   * @memberOf TaskManager.prototype
   * @param {DOMEvent} evt
   */
  TaskManager.prototype.onMoveEventForScrolling = function(evt) {
    this.deltaX = this.initialTouchPosition[0] - (evt.touches ?
                                                  evt.touches[0].pageX :
                                                  evt.pageX
                                                 );
    this.moveCards();
  };

  /**
   * @memberOf TaskManager.prototype
   * @param {DOMEvent} evt
   */
  TaskManager.prototype.onMoveEventForDeleting = function(evt, deltaY) {
    var dy = deltaY | this.initialTouchPosition[1] -
                              (evt.touches ? evt.touches[0].pageY : evt.pageY);
    this.draggingCardUp = (dy > 0);
    if (this.draggingCardUp) {
      var card = this.getCardForElement(evt.target);
      if (!card) {
        return;
      }
      if ('function' == typeof card.move) {
        card.move(this.deltaX, -dy);
      } else {
        card.applyStyle({
          MozTransform: 'scale(' + card.SCALE_FACTOR + ') ' +
                        'translateY(' + (-dy) + 'px)'
        });
      }
    }
  };

  /**
   * @memberOf TaskManager.prototype
   * @param {DOMEvent} evt
   */
  TaskManager.prototype.onStartEvent = function cs_onStartEvent(evt) {
    var cardsView = this.element;
    evt.stopPropagation();
    evt.target.setCapture(true);
    cardsView.addEventListener('touchmove', this);
    cardsView.addEventListener('touchend', this);
    cardsView.addEventListener('swipe', this);
    this._dragPhase = '';

    if (evt.touches) {
      this.initialTouchPosition = [evt.touches[0].pageX, evt.touches[0].pageY];
    } else {
      this.initialTouchPosition = [evt.pageX, evt.pageY];
    }
  };

  /**
   * @memberOf TaskManager.prototype
   * @param {DOMEvent} evt
   */
  TaskManager.prototype.onMoveEvent = function cs_onMoveEvent(evt) {
    evt.stopPropagation();
    var touchPosition = evt.touches ? [evt.touches[0].pageX,
                                       evt.touches[0].pageY] :
                                      [evt.pageX, evt.pageY];

    var deltaY = this.initialTouchPosition[1] - touchPosition[1];

    switch (this._dragPhase) {
      case 'cross-slide':
        this.onMoveEventForDeleting(evt, deltaY);
        break;
      case 'scrolling':
        this.onMoveEventForScrolling(evt);
        break;
      default:
        this.deltaX = this.initialTouchPosition[0] - touchPosition[0];
        if (this.allowSwipeToClose && deltaY > this.moveCardThreshold &&
            evt.target.classList.contains('card')) {
          // We don't want user to scroll the CardsView when one of the card is
          // already dragger upwards
          this._dragPhase = 'cross-slide';
          this.draggingCardUp = true;
          this.onMoveEventForDeleting(evt, deltaY);
        } else {
          // If we are not removing Cards now and Snapping Scrolling is enabled,
          // we want to scroll the CardList
          if (Math.abs(this.deltaX) > this.switchingCardThreshold) {
            this._dragPhase = 'scrolling';
          }
          this.moveCards();
        }
    }
  };

  exports.TaskManager = TaskManager;

  function debug(message) {
    if (DEBUG) {
      console.log('TaskManager > \n  ', message);
    }
  }
})(window);
