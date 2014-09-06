/* global Card, TaskCard,
          AppWindowManager, sleepMenu, SettingsListener,
          OrientationManager, System, homescreenLauncher,
          GestureDetector, UtilityTray, StackManager */

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
    this.unfilteredStack = null;
    this.cardsByAppID = {};
    // Listen for settings changes
    this.onTaskStripEnabled = function(value) {
      debug('taskstrip.enabled: '+ value);
      this.isTaskStrip = value;
    }.bind(this);
    SettingsListener.observe('taskstrip.enabled', false,
                             this.onTaskStripEnabled);
  }

  TaskManager.prototype = Object.create({
    /**
     * Use the carousel-style card view (false) or
     * the Haida-style horizontal task strip (true)
     */
    isTaskStrip: false,

    /**
     * The setting that enables/disables using screenshots vs. icons for the
     *  card preview
     * @memberof TaskCard.prototype
     */
    SCREENSHOT_PREVIEWS_SETTING_KEY: 'app.cards_view.screenshots.enabled',

    DURATION: 200,

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

  TaskManager.prototype._registerShowingEvents = function() {
    window.addEventListener('appopen', this);
    window.addEventListener('appterminated', this);
    if (this.allowSwipeToClose) {
      this.element.addEventListener('touchstart', this);
    }
    window.addEventListener('lockscreen-appopened', this);
    window.addEventListener('tap', this);
    window.addEventListener('wheel', this);
    window.addEventListener('opencurrentcard', this);
  };
  TaskManager.prototype._unregisterShowingEvents = function() {
    window.removeEventListener('appopen', this);
    window.removeEventListener('appterminated', this);
    window.removeEventListener('lockscreen-appopened', this);
    window.removeEventListener('tap', this);
    window.removeEventListener('wheel', this);
    window.removeEventListener('opencurrentcard', this);

    this.element && this.element.removeEventListener('touchstart', this);
    window.removeEventListener('lockscreen-appopened', this);
    window.removeEventListener('tap', this);
    window.removeEventListener('opencurrentcard', this);
  };


  TaskManager.prototype._registerEvents = function() {
    window.addEventListener('home', this);
    window.addEventListener('attentionopened', this);
    window.addEventListener('taskmanagershow', this);
    window.addEventListener('holdhome', this);

    this.onPreviewSettingsChange = function(settingValue) {
      this.useAppScreenshotPreviews = settingValue;
    }.bind(this);

    SettingsListener.observe(this.SCREENSHOT_PREVIEWS_SETTING_KEY,
                             this.useAppScreenshotPreviews,
                             this.onPreviewSettingsChange);
  };

  TaskManager.prototype._unregisterEvents = function() {
    window.removeEventListener('home', this);
    window.removeEventListener('attentionopened', this);
    window.removeEventListener('taskmanagershow', this);
    window.removeEventListener('holdhome', this);

    SettingsListener.unobserve(this.SCREENSHOT_PREVIEWS_SETTING_KEY,
                               this.onPreviewSettingsChange);
    SettingsListener.unobserve('taskstrip.enabled',
                               this.onTaskStripEnabled);
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
   *
   */
  TaskManager.prototype.hide = function cs_hideCardSwitcher() {
    if (!this.isShown()) {
      return;
    }

    // events to unhandle
    this._unregisterShowingEvents();

    // Make the cardsView overlay inactive
    this.setActive(false);

    // And remove all the cards from the document after the transition
    this.removeCards();
    this.fireCardViewClosed();
  };

  /**
   * Apply filter 'filterName' to the card stack.
   *
   * @memberOf TaskManager.prototype
   * @param filterName {string} The name of the filter to apply.
   * @returns true if a filter was applied, false if not.
   */
  TaskManager.prototype.filter = function cs_filterCardStack(filterName) {
    var noRecentWindows = document.getElementById('cards-no-recent-windows');
    switch (filterName) {
      // Filter out any application that is not a system browser window.
      case 'browser-only':
        this.stack =
          this.unfilteredStack
              .filter(function(app) { return app.isBrowser(); });
        navigator.mozL10n.setAttributes(noRecentWindows,
                                        'no-recent-browser-windows');
        break;
      // Filter out any application that is not an application only window.
      case 'apps-only':
        this.stack =
          this.unfilteredStack
              .filter(function(app) { return !app.isBrowser(); });
        navigator.mozL10n.setAttributes(noRecentWindows,
                                        'no-recent-app-windows');
        break;
      default:
        return false;
    }

    // We need to figure out where we are in this filtered stack as we may have
    // removed apps from it!
    if (this.currentPosition != -1) {
      this.currentPosition =
        this.stack.indexOf(this.unfilteredStack[this.currentPosition]);
    }

    return true;
  };

  /**
   * Main entry point to show the card switcher
   *
   * @memberOf TaskManager.prototype
   * @param filterName {string} The name of the filter to apply. Only two fitler
   *                            types are supported at this time: 'browser-only'
   *                            and 'apps-only'.
   */
  TaskManager.prototype.show = function cs_showCardSwitcher(filterName) {
    // Build and display the card switcher overlay
    // Note that we rebuild the switcher each time we need it rather
    // than trying to keep it in sync with app launches.

    // Apps info from Stack Manager.
    this.unfilteredStack = StackManager.snapshot();
    this.stack = this.unfilteredStack;
    this.currentPosition = StackManager.position;
    this.newStackPosition = null;
    this.initialTouchPosition = null;

    // Apply the filter. Noop if no filterName.
    if (this.filter(filterName)) {
      // Update visual style to indicate we're filtered.
      this.element.classList.add('filtered');
    }

    // Short-hand, but we need to get reference to it here as filter can
    // change the stack that will be used.
    var stack = this.stack;

    // If we are currently displaying the homescreen but we have apps in the
    // stack we will display the most recently used application.
    if (this.currentPosition == -1 || StackManager.outOfStack()) {
      if (stack.length) {
        this.currentPosition = this.isTaskStrip ? 0 : stack.length - 1;
      } else {
      // consider homescreen the active app
        this.currentPosition = -1;
      }
    }
    this.currentDisplayed = this.currentPosition;
    var currentApp = (stack.length && this.currentPosition > -1 &&
                     stack[this.currentPosition]);

    if (!currentApp) {
      // Fire a cardchange event to notify rocketbar that there are no cards
      this.fireCardViewClosed();
      return;
    }

    // stash some measurements now to avoid unexpected reflow later
    this._windowWidth = window.innerWidth;
    this._windowHeight = window.innerHeight;

    // Close utility tray if it is opened.
    UtilityTray && UtilityTray.hide(true);

    // We're committed to showing the card switcher.
    // Homescreen fades (shows its fade-overlay) on cardviewbeforeshow events
    this.fireCardViewBeforeShow();

    if (this.isTaskStrip) {
      this.screenElement.classList.add('task-manager');
    }

    // If there is no running app, show "no recent apps" message
    if (stack.length) {
      this.element.classList.remove('empty');
    } else {
      // (we already bailed for the isTaskStrip case)
      this.element.classList.add('empty');
    }

    // Make sure we're in default orientation
    screen.mozLockOrientation(OrientationManager.defaultOrientation);

    // First add an item to the cardsList for each running app
    stack.forEach(function(app, position) {
      this.addCard(position, app);
    }, this);

    stack.forEach(function(app, idx) {
      var card = this.cardsByAppID[app.instanceID];

      if (idx >= this.currentPosition - 2 && idx <= this.currentPosition + 2) {
        card.element.style.display = 'block';
      } else {
        card.element.style.display = 'none';
      }
    }, this);

    this.placeCards();

    this.setActive(true);
    this.setAccessibilityAttributes();

    var screenElem = this.screenElement;
    var activeApp = AppWindowManager.getActiveApp();

    var finish = (function() {
      // events to handle while shown
      this._registerShowingEvents();
      // only set up for card swiping if there's cards to show
      if (!this.isTaskStrip && stack.length && !this.initialTouchPosition) {
        this.setupCardSwiping();
      }

      screenElem.classList.add('cards-view');
      screenElem.classList.add('hide-apps');
    }).bind(this);

    stack.forEach(function(app, position) {
      app.enterTaskManager();
    });

    if (!activeApp || activeApp.isHomescreen) {
      finish();
      return;
    }

    window.addEventListener('appclosed', function clWait(evt) {
      window.removeEventListener('appclosed', clWait);
      finish();
    });
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
    var card = (this.isTaskStrip) ?
                  new TaskCard(config) :
                  new Card(config);
    this.cardsByAppID[app.instanceID] = card;
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
    if (cardsLength === this.currentDisplayed) {
      this.currentPosition--;
      if (this.currentPosition < 0) {
        this.currentPosition = 0;
      }
      this.currentDisplayed = this.currentPosition;
    }

    // If there are no cards left, then dismiss the task switcher.
    if (!cardsLength && this.isShown()) {
      this.exitToApp();
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
    Object.keys(this.cardsByAppID).forEach(function(instanceID) {
      var card = this.cardsByAppID[instanceID];
      card.destroy();
    }, this);
    this.cardsByAppID = {};

    this.screenElement.classList.remove('cards-view');
    this.screenElement.classList.remove('task-manager');
    this.element.classList.remove('filtered');
    this.cardsList.innerHTML = '';
    this.currentDisplayed = -1;
    this.deltaX = null;
    this.deltaY = null;
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
        debug('cardAction: TODO: favorite ' + card.element.dataset.origin);
        return;
      case 'select' :

        var self = this;
        var showSelectedApp = function() {
          setTimeout(function() {
            self.exitToApp(
              card.app,
              'from-cardview',
              null
            );
          }, 100);
        };

        // If the selected app is not the middle app, first move it into view
        if (this.currentPosition != card.position) {
          this.currentPosition = card.position;
          this.currentDisplayed = card.position;
          this.alignCurrentCard(this.DURATION, showSelectedApp);
        } else {
          showSelectedApp();
        }

        // Card switcher will get hidden when 'appopen' is fired.
        return;
    }
  };

  TaskManager.prototype.exitToApp = function(app,
                                             openAnimation) {

    if (!app) {
      // return if possible to previous app.
      // else homescreen
      app = StackManager.getCurrent() ||
            homescreenLauncher.getHomescreen(true);
    }
    var position = this.unfilteredStack.indexOf(app);
    if (position !== StackManager.position) {
      this.newStackPosition = position;
    }

    var safetyTimeout = null;
    var finish = (function() {
      clearTimeout(safetyTimeout);
      this.hide();
    }).bind(this);

    this.screenElement.classList.remove('hide-apps');

    setTimeout(function() {
      app.open(openAnimation || 'from-cardview');
      if (app.isHomescreen) {
        finish();
      } else {
        app.element.addEventListener('_opened', function opWait() {
          app.element.removeEventListener('_opened', opWait);
          finish();
        });
      }

      safetyTimeout = setTimeout(finish, 500);
    }, 100);
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
    var wasActive = AppWindowManager.getActiveApp() === card.app;
    card.killApp();

    // if we killed the active app, make homescreen active
    if (wasActive) {
      AppWindowManager._updateActiveApp(homescreenLauncher
                                          .getHomescreen().instanceID);
    }
    this.removeCard(card, removeImmediately);
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
        // Remove the card from the Task Manager for a smooth transition.
        this.cardsList.removeChild(card.element);
        this.closeApp(card);
      } else {
        card.applyStyle({ MozTransform: '' });
      }
    } else if (evt.deltaX > 0 &&
      this.currentDisplayed < this.cardsList.childNodes.length - 1) {
      // Two finger swipe left.
      this.currentDisplayed = ++this.currentPosition;
    } else if (this.currentDisplayed > 0) {
      // Two finger swipe right.
      this.currentDisplayed = --this.currentPosition;
    }
    this.alignCurrentCard();
  };

  /**
   * Handle (synthetic) tap events on the card list
   *
   * @memberOf TaskManager.prototype
   * @param  {DOMEvent} evt The event.
   */
  TaskManager.prototype.handleTap = function cs_handleTap(evt) {
    if (!this.isShown()) {
      // ignore any bogus events received after we already started to hide
      return;
    }

    // Handle close events
    var targetNode = evt.target;

    // Screen reader lands on one of card's children.
    var cardElem;
    var card;

    var tmpNode = targetNode;
    while (tmpNode) {
      if (tmpNode.classList && tmpNode.classList.contains('card')) {
        cardElem = tmpNode;
        break;
      }
      tmpNode = tmpNode.parentNode;
    }

    if (('buttonAction' in targetNode.dataset) &&
      cardElem && (card = this.getCardForElement(cardElem))) {
      evt.stopPropagation();
      this.cardAction(card, targetNode.dataset.buttonAction);
      return;
    }

    if (('position' in targetNode.dataset) || cardElem) {
      card = this.getCardForElement(cardElem);
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
    var dx, dy;

    if (eventDetailEnd) {
      dx = eventDetail.dx;
      dy = eventDetail.dy;
    } else {
      if (evt.changedTouches) {
        dx = evt.changedTouches[0].pageX - this.initialTouchPosition[0];
        dy = evt.changedTouches[0].pageY - this.initialTouchPosition[1];
      } else {
        dx = evt.pageX - this.initialTouchPosition[0];
        dy = evt.pageY - this.initialTouchPosition[1];
      }
    }

    if (!this.draggingCardUp) {
      if (Math.abs(dx) > this.threshold) {
        var progress = Math.abs(dx) / this.windowWidth;

        // We're going to snap back to the center
        if (progress > 0.5) {
          progress -= 0.5;
        }
        var durationLeft = (1 - progress) * this.DURATION;

        // Snaping backward at the extremities
        if (this.onExtremity()) {
          durationLeft = this.DURATION - durationLeft;
        }

        durationLeft = Math.max(50, durationLeft);

        var current = this.currentDisplayed;
        if (dx < 0 && current < this.cardsList.childNodes.length - 1) {
          this.currentDisplayed = ++this.currentPosition;
        } else if (dx > 0 && current > 0) {
          this.currentDisplayed = --this.currentPosition;
        }

        this.alignCurrentCard(durationLeft);
      } else {
        this.handleTap(evt);
      }

      return;
    }

    // if the element we start dragging on is a card
    if (element.classList.contains('card') && this.allowSwipeToClose) {
      this.draggingCardUp = false;

      var card = this.getCardForElement(element);
      if (-dy > this.swipeUpThreshold && card.app.killable()) {
        // Remove the card from the Task Manager for a smooth transition.
        this.cardsList.removeChild(element);
        this.closeApp(card);
      } else {
        card.applyStyle({ transform: '' });
      }
      this.alignCurrentCard();
    }
  };

  /**
   * Hide the switcher and show the homescreen
   * @memberOf TaskManager.prototype
   * @param  {DOMEvent} evt The event.
   */
  TaskManager.prototype.goToHomescreen = function cs_goToHomescreen(evt) {
    if (!this.isShown()) {
      return;
    }

    var homescreen = homescreenLauncher.getHomescreen(true);
    window.dispatchEvent(new CustomEvent('cardviewclosedhome'));

    evt.stopImmediatePropagation();
    this.exitToApp(homescreen);
  };

  /**
   * Default event handler
   * @memberOf TaskManager.prototype
   * @param  {DOMEvent} evt The event.
   */
  TaskManager.prototype.handleEvent = function cv_handleEvent(evt) {
    var app, card;

    switch (evt.type) {
      case 'touchstart':
        this.onStartEvent(evt);
        evt.preventDefault();
        break;

      case 'touchmove':
        this.onMoveEvent(evt);
        evt.stopPropagation();
        evt.preventDefault();
        break;

      case 'touchend':
      case 'swipe':
        this.onEndEvent(evt);
        evt.preventDefault();
        break;

      case 'opencurrentcard':
        this.exitToApp(
          this.currentCard.app,
          'from-cardview',
          null);
        break;

      case 'tap':
        this.handleTap(evt);
        break;

      case 'wheel':
        this.handleWheel(evt);
        break;

      case 'home':
        if (this.isShown()) {
          evt.stopImmediatePropagation();
          this.exitToApp();
        }
        break;

      case 'lockscreen-appopened':
      case 'attentionopened':
        this.newStackPosition = null;
        this.hide(true);
        // no need to animate while in background
        this.exitToApp(null, 'immediately');
        break;

      case 'taskmanagershow':
        var filter = (evt.detail && evt.detail.filter) || null;
        this.show(filter);
        break;

      case 'taskmanagerhide':
        this.hide();
        break;

      case 'holdhome':
        if (this.isShown() || System.locked) {
          return;
        }
        sleepMenu.hide();
        if (this.isTaskStrip) {
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
        this.hide(/* immediately */ true);
        break;
      case 'appterminated':
        if (this.isShown()) {
          app = evt.detail;
          card = app && this.cardsByAppID[app.instanceID];
          if (card && card.app &&
              app.instanceID === card.app.instanceID) {
            this.removeCard(card);
          }
        }
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
  TaskManager.prototype.fireCardViewClosed = function() {
    var detail;
    if (!isNaN(this.newStackPosition)) {
      detail = { 'detail': { 'newStackPosition': this.newStackPosition }};
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
    this.deltaY = 0;

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
  TaskManager.prototype.setAccessibilityAttributes = function() {
    this.stack.forEach(function(app, idx) {
      var card = this.cardsByAppID[app.instanceID];
      // Hide non-current apps from the screen reader.
      card.setVisibleForScreenReader(idx === this.currentDisplayed);
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
  TaskManager.prototype.placeCards = function() {
    var currentCard = this.currentCard;
    if (!currentCard) {
      return;
    }

    this.stack.forEach(function(app, idx) {
      var card = this.cardsByAppID[app.instanceID];
      card.move(0, 0);
      card.element.classList.toggle('current', (idx == this.currentPosition));
    }.bind(this));
  };

  /**
   * Get the current card front and center
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.alignCurrentCard = function(duration, callback) {
    // We're going to release memory hiding card out of screen
    var currentCard = this.currentCard;
    if (!currentCard) {
      return;
    }

    duration = duration || this.DURATION;

    var self = this;
    self.setAccessibilityAttributes();

    self.stack.forEach(function(app, idx) {
      var card = self.cardsByAppID[app.instanceID];

      if (idx < self.currentPosition - 2 || idx > self.currentPosition + 2) {
        window.mozRequestAnimationFrame(function() {
          card.element.style.display = 'none';
        });
        return;
      }

      // The 5 cards at the center should be visible but we need to adjust the
      // transitions durations/delays to account for the layer trickery.
      // Layer Trickery: nf, cards that should be completely outside the
      // viewport but are in fact 0.001 pixel in.
      card.element.style.display = 'block';

      var distance = card.element.dataset.keepLayerDelta;
      var currentCardDistance = Math.abs(currentCard.element.dataset.positionX);
      if (idx == self.currentPosition + 2 || idx == self.currentPosition - 2) {
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

    var onCardTransitionEnd = function() {
      currentCard.element.removeEventListener('transitionend',
                                              onCardTransitionEnd);

      var zeroTransitionStyle = { transition: '' };
      self.stack.forEach(function(app, idx) {
        var card = self.cardsByAppID[app.instanceID];
        card.applyStyle(zeroTransitionStyle);
      });

      if (callback) {
        setTimeout(callback);
      }
    };

    currentCard.element.addEventListener('transitionend', onCardTransitionEnd);
    setTimeout(function() {
      self.placeCards();
    });

    // done with delta
    this.deltaX = 0;
    this.deltaY = 0;
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

    var current = this.currentPosition;
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
    return (this.currentPosition === 0 && sign === 1 ||
            this.currentPosition === this.stack.length - 1 && sign === -1);
  };

  /**
   * @memberOf TaskManager.prototype
   * @param {DOMEvent} evt
   */
  TaskManager.prototype.onMoveEventForDeleting = function(evt) {
    var dx = this.deltaX;
    var dy = this.deltaY;

    this.draggingCardUp = (dy > 0);
    if (this.draggingCardUp) {
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
  TaskManager.prototype.onStartEvent = function cs_onStartEvent(evt) {
    var cardsView = this.element;
    evt.stopPropagation();

    // If there is no card in the cardsView, go back to home screen
    if (cardsView.classList.contains('empty')) {
      this.goToHomescreen(evt);
      return;
    }

    evt.target.setCapture(true);
    cardsView.addEventListener('touchmove', this);
    cardsView.addEventListener('touchend', this);
    cardsView.addEventListener('swipe', this);
    this._dragPhase = '';

    var zeroTransitionStyle = { transition: '' };
    this.stack.forEach(function(app, idx) {
      var card = this.cardsByAppID[app.instanceID];
      card.applyStyle(zeroTransitionStyle);
    }, this);

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
    this.deltaX = this.initialTouchPosition[0] - evt.touches[0].pageX;
    this.deltaY = this.initialTouchPosition[1] - evt.touches[0].pageY;

    switch (this._dragPhase) {
      case 'cross-slide':
        this.onMoveEventForDeleting(evt);
        break;

      case 'scrolling':
        this.moveCards();
        break;

      default:
        if (this.allowSwipeToClose && this.deltaY > this.moveCardThreshold &&
            evt.target.classList.contains('card')) {
          // We don't want user to scroll the CardsView when one of the card is
          // already dragger upwards
          this._dragPhase = 'cross-slide';
          this.draggingCardUp = true;
          this.onMoveEventForDeleting(evt);
        } else {
          // If we are not removing Cards now and Snapping Scrolling is enabled,
          // we want to scroll the CardList
          if (Math.abs(this.deltaX) > this.switchingCardThreshold) {
            this._dragPhase = 'scrolling';
          }

          this.moveCards();
        }
        break;
    }
  };

  exports.TaskManager = TaskManager;

  function debug(message) {
    if (DEBUG) {
      console.log('TaskManager > \n  ', message);
    }
  }
})(window);
