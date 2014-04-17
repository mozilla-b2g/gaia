/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

//
// CardsView is responsible for managing opened apps
//

'use strict';

var CardsView = (function() {
  //display icon of an app on top of app's card
  var DISPLAY_APP_ICON = false;
  var SCREENSHOT_PREVIEWS_SETTING_KEY = 'app.cards_view.screenshots.enabled';
  // use screenshots in cards view? tracks setting value
  var useAppScreenshotPreviews = true;

  // if 'true' user can close the app
  // by dragging it upwards
  var MANUAL_CLOSING = true;

  var cardsView = document.getElementById('cards-view');
  var screenElement = document.getElementById('screen');
  var cardsList = document.getElementById('cards-list');
  var stack = [];

  // Unkillable apps which have attention screen now
  var attentionScreenApps = [];

  var windowWidth = window.innerWidth;

  var HVGA = document.documentElement.clientWidth < 480;

  function Card(props, containerElement) {
    if (props) {
      this.element = document.createElement('li');
      this.element.dataset.position = props.position;
      this.containerElement = containerElement;

      this.init(props);
      this._registerEvents();
    }
    return this;
  }
  Card.prototype = {
    element: null,
    init: function(initProps) {
      // Build a card representation of each window.
      // And add it to the card switcher
      var card = this.element;
      card.classList.add('card');
      var position = this.position;
      var app = this.app;
      card.dataset.origin = app.origin;

      var screenshotView = document.createElement('div');
      screenshotView.classList.add('screenshotView');
      card.appendChild(screenshotView);


      // app icon overlays screenshot by default
      // and will be removed if/when we display the screenshot
      var iconURI = getIconURI(position);
      var appIconView = document.createElement('div');
      appIconView.classList.add('appIconView');
      card.appendChild(appIconView);
      if (iconURI) {
          appIconView.style.backgroundImage = 'url(' + iconURI + ')';
      }
      card.classList.add('appIconPreview');

      var title = document.createElement('h1');
      title.textContent = app.name;
      card.appendChild(title);

      // only take the frame reference if we need to
      var frameForScreenshot = this.frameForScreenshot =
            useAppScreenshotPreviews && app.iframe;
      var origin = app.origin;
      if (PopupManager.getPopupFromOrigin(origin)) {
        var popupFrame =
          PopupManager.getPopupFromOrigin(origin);
        frameForScreenshot = useAppScreenshotPreviews && popupFrame;

        var subtitle = document.createElement('p');
        subtitle.textContent =
          PopupManager.getOpenedOriginFromOpener(app.origin);
        card.appendChild(subtitle);
        card.classList.add('popup');
      } else if (getOffOrigin(app.iframe.dataset.url ?
            app.iframe.dataset.url : app.iframe.src, app.origin)) {
        var subtitle = document.createElement('p');
        subtitle.textContent = getOffOrigin(app.iframe.dataset.url ?
            app.iframe.dataset.url : app.iframe.src, app.origin);
        card.appendChild(subtitle);
      }

      if (TrustedUIManager.hasTrustedUI(app.origin)) {
        var popupFrame = TrustedUIManager.getDialogFromOrigin(app.origin);
        frameForScreenshot = useAppScreenshotPreviews && popupFrame.frame;
        var header = document.createElement('section');
        header.setAttribute('role', 'region');
        header.classList.add('skin-organic');
        header.innerHTML = '<header><button><span class="icon icon-close">';
        header.innerHTML +=
          '</span></button><h1>' + escapeHTML(popupFrame.name, true);
        header.innerHTML += '</h1></header>';
        card.appendChild(header);
        card.classList.add('trustedui');
      } else if (attentionScreenApps.indexOf(app.origin) == -1) {
        var closeButton = document.createElement('div');
        closeButton.setAttribute('role', 'button');
        closeButton.classList.add('close-card');
        card.appendChild(closeButton);
      }

      this.containerElement.appendChild(card);
    },
    close: function() {
      // TODO
    },
    get position() {
      return this.element.dataset.position;
    },
    get app() {
      return stack[this.position];
    },
    handleEvent: function(event) {
      switch (event.type) {
        case 'outviewport':
          this.onOutViewport(event);
          break;
        case 'onviewport':
          this.onViewport(event);
          break;
      }
    },
    onOutViewport: function(event) {
      this.element.style.display = 'none';
    },
    onViewport: function(event) {
      var card = this.element;
      var screenshotView = card.querySelector('.screenshotView');
      var app = this.app;
      var origin = app.origin;
      var frameForScreenshot = this.frameForScreenshot;

      card.style.display = 'block';

      if (useAppScreenshotPreviews) {
        card.classList.remove('appIconPreview');
        if (screenshotView.style.backgroundImage) {
          return;
        }
      } else {
        card.classList.add('appIconPreview');
      }

      // Handling cards in different orientations
      var degree = app.rotatingDegree;
      var isLandscape = false;
      if (degree == 90 ||
          degree == 270) {
        isLandscape = true;
      }

      // Rotate screenshotView if needed
      screenshotView.classList.add('rotate-' + degree);

      if (!useAppScreenshotPreviews) {
        return;
      }

      if (isLandscape) {
        // We must exchange width and height if it's landscape mode
        var width = card.clientHeight;
        var height = card.clientWidth;
        screenshotView.style.width = width + 'px';
        screenshotView.style.height = height + 'px';
        screenshotView.style.left = ((height - width) / 2) + 'px';
        screenshotView.style.top = ((width - height) / 2) + 'px';
      }

      // If we have a cached screenshot, use that first
      // We then 'res-in' the correctly sized version
      var cachedLayer = app.requestScreenshotURL();
      if (cachedLayer) {
        screenshotView.style.backgroundImage = 'url(' + cachedLayer + ')';
      }

      // And then switch it with screenshots when one will be ready
      // (instead of -moz-element backgrounds)
      // Only take a new screenshot if is the active app
      if (!cachedLayer || (
        origin === stack[cardSwitcher.currentPosition].origin &&
        !cardSwitcher.inTimeCapture)
      ) {
        if (typeof frameForScreenshot.getScreenshot !== 'function') {
          return;
        }

        // rect is the final size (considering CSS transform) of the card.
        var rect = card.getBoundingClientRect();
        var width = isLandscape ? rect.height : rect.width;
        var height = isLandscape ? rect.width : rect.height;
        var request = frameForScreenshot.getScreenshot(
          width, height);
        request.onsuccess = function gotScreenshot(screenshot) {
          var blob = screenshot.target.result;
          if (blob) {
            var objectURL = URL.createObjectURL(blob);

            // Overwrite the cached image to prevent flickering
            screenshotView.style.backgroundImage =
              'url(' + objectURL + '), url(' + cachedLayer + ')';

            app.renewCachedScreenshotBlob(blob);

            // setTimeout is needed to ensure that the image is fully drawn
            // before we remove it. Otherwise the rendering is not smooth.
            // See: https://bugzilla.mozilla.org/show_bug.cgi?id=844245
            setTimeout(function() {
              URL.revokeObjectURL(objectURL);
            }, 200);
          } else {
            // failed to get screenshot, fallback to using icon
            card.classList.add('appIconPreview');
          }
        };
        request.onerror = function screenshotError() {
          // failed to get screenshot, fallback to using icon
          card.classList.add('appIconPreview');
        };
      }
    },

    _registerEvents: function aw__registerEvents() {
      var card = this.element;
      if (card === null) {
        return;
      }
      card.addEventListener('outviewport', this);
      card.addEventListener('onviewport', this);
    }
  };

  var cardSwitcher = {

    currentDisplayed: 0,
    currentPosition: 0,
    // Are we removing the card now?
    draggingCardUp: false,
    // Are we moving card left or right?
    sortingDirection: null,

    _showing: false,
    isShown: function() {
      return this._showing;
    },

    lastInTimeCapture: null,
    inTimeCapture: null,

    init: function() {
      this.show();
    },

    hide: function cs_hideCardSwitcher(removeImmediately, newStackPosition) {
      if (!this.isShown())
        return;

      // events to handle
      window.removeEventListener('lock', CardsView);
      window.removeEventListener('tap', CardsView);
      window.removeEventListener('opencurrentcard', CardsView);

      if (removeImmediately) {
        cardsView.classList.add('no-transition');
      }

      // Make the cardsView overlay inactive
      cardsView.classList.remove('active');
      // Let everyone know we're about to close the cards view
      fireCardViewBeforeClose();
      // Now we can consider ourselves hidden again.
      this._showing = false;

      var self = this;
      // And remove all the cards from the document after the transition
      function removeCards() {
        cardsView.removeEventListener('transitionend', removeCards);
        screenElement.classList.remove('cards-view');
        cardsList.innerHTML = '';
        self.prevCardStyle = self.currentCardStyle = self.nextCardStyle =
        self.currentCard = self.prevCard = self.nextCard = self.deltaX = null;
        screenElement.classList.remove('task-manager');
      }
      if (removeImmediately) {
        removeCards();
        cardsView.classList.remove('no-transition');
      } else {
        cardsView.addEventListener('transitionend', removeCards);
      }

      fireCardViewClosed(newStackPosition);
    },


    show: function cs_showCardSwitcher(inRocketbar) {
      // Build and display the card switcher overlay
      // Note that we rebuild the switcher each time we need it rather
      // than trying to keep it in sync with app launches.  Performance is
      // not an issue here given that the user has to hold the HOME button down
      // for one second before the switcher will appear.
      // The second parameter, inRocketbar, determines how to display the
      // cardswitcher inside of the rocketbar. Both modes are necessary until
      // Rocketbar is enabled by default, then this will go away.

      this.inTimeCapture = this.lastInTimeCapture;
      this.lastInTimeCapture = false;

      if (this.isShown()) {
        return;
      }

      this.setupCardSwiping(inRocketbar);

      // events to handle
      window.addEventListener('lock', CardsView);

      screenElement.classList.add('cards-view');

      // Close utility tray if it is opened.
      UtilityTray.hide(true);

      // Apps info from Stack Manager.
      stack = StackManager.snapshot();

      this.currentPosition = StackManager.position;

      // If we are currently displaying the homescreen but we have apps in the
      // stack we will display the most recently used application.
      if (this.currentPosition == -1 && stack.length) {
        this.currentPosition = stack.length - 1;
      }
      this.currentDisplayed = this.currentPosition;

      // Return early if inRocketbar and there are no apps.
      if (!stack.length && inRocketbar) {
        // Fire a cardchange event to notify rocketbar that there are no cards
        fireCardViewClosed();
        return;
      } else if (inRocketbar) {
        screenElement.classList.add('task-manager');
        this.CC_SCALE = 0.6;
        this.SC_SCALE = 0.5;
      } else {
        this.CC_SCALE = 0.8;
        this.SC_SCALE = 0.6;
      }

      // Ensure homescreen is already faded when we switch to it.
      fireCardViewBeforeShow();
      // Now we can switch to the homescreen.
      AppWindowManager.display(null, null, 'to-cardview');
      // Now we're showing!
      this._showing = true;

      // First add an item to the cardsList for each running app
      stack.forEach(function(app, position) {
        this.addCard(position, app, function showCards() {
          cardsView.classList.add('active');
          fireCardViewShown();
        });
      }, this);

      if (MANUAL_CLOSING) {
        cardsView.addEventListener('touchstart', CardsView);
      }

      // If there is no running app, show "no recent apps" message
      if (stack.length) {
        cardsView.classList.remove('empty');
      } else {
        cardsView.classList.add('empty');
      }

      // Make sure we're in default orientation
      screen.mozLockOrientation(OrientationManager.defaultOrientation);

      // If there is a displayed app, take keyboard focus away
      if (this.currentPosition > -1) {
        stack[this.currentPosition].blur();
      }

      this.placeCards();
      // At the beginning only the current card can listen to tap events
      this.currentCardStyle.pointerEvents = 'auto';
      window.addEventListener('tap', CardsView);
      window.addEventListener('opencurrentcard', CardsView);

      // If the stack is empty, let's go ahead and show the cards view since
      // no showCards callback will be called.
      if (!stack.length) {
        cardsView.classList.add('active');
        fireCardViewShown();
      }
    },
    addCard: function cs_addCard(position, app, showCardCallback) {
      // Display card switcher background first to make user focus on the
      // frame closing animation without disturbing by homescreen display.
      if (this.currentPosition == position && showCardCallback) {
        setTimeout(showCardCallback);
      }
      var card = new Card({ position: position }, cardsList);
      cardsList.appendChild(card.element);
    },
    closeApp: function cs_closeApp(element, removeImmediately) {
      // Ask the App Manager to kindly end this application.
      AppWindowManager.kill(stack[element.dataset.position].origin);

      // Dead app, remove from our own stack.
      stack.splice(element.dataset.position, 1);
      // Update the card positions.
      var cards = cardsList.childNodes;
      for (var i = 0; i < cards.length; i++) {
        cards[i].dataset.position = i;
      }

      // Fix for non selectable cards when we remove the last card
      // Described in https://bugzilla.mozilla.org/show_bug.cgi?id=825293
      var cardsLength = cardsList.childNodes.length;
      if (cardsLength === this.currentDisplayed) {
        this.currentPosition--;
        if (this.currentPosition < 0) {
          this.currentPosition = 0;
        }
        this.currentDisplayed = this.currentPosition;
      }

      // If there are no cards left, then dismiss the task switcher.
      if (!cardsLength) {
        hideCardSwitcher(removeImmediately);
      }
      else {
        this.alignCurrentCard();
      }
    },

    handleTap: function cs_handleTap(e) {
      // Handle close events
      if (e.target.classList.contains('close-card') &&
          cardsList.contains(e.target.parentNode)) {
        var card = e.target.parentNode;
        cardsList.removeChild(card);
        this.closeApp(card, true);
      } else if ('position' in e.target.dataset) {
        AppWindowManager.display(
          stack[e.target.dataset.position],
          'from-cardview',
          null
        );
        // Card switcher will get hidden when 'appopen' is fired.
        fireCardViewClosed(e.target.dataset.position);
      }
    }

  };

  var gd = new GestureDetector(cardsView);
  gd.startDetecting();

  // get initial setting value for screenshot previews
  // and watch for changes
  var settingRequest = SettingsListener.getSettingsLock()
                       .get(SCREENSHOT_PREVIEWS_SETTING_KEY);

  settingRequest.onsuccess = function() {
    var settingValue = settingRequest.result[SCREENSHOT_PREVIEWS_SETTING_KEY];
    useAppScreenshotPreviews = settingValue;
  };

  SettingsListener.observe(SCREENSHOT_PREVIEWS_SETTING_KEY,
                           useAppScreenshotPreviews, function(settingValue) {
    useAppScreenshotPreviews = settingValue;
  });


  /*
   * Returns an icon URI
   *
   * @param{String} the position of the app in our cache
   */
  function getIconURI(position) {
    var app = stack[position];
    if (!app) {
      return null;
    }
    var icons = app.manifest && app.manifest.icons;
    var iconPath;

    if (icons) {
      var sizes = Object.keys(icons).map(function parse(str) {
        return parseInt(str, 10);
      });

      sizes.sort(function(x, y) { return y - x; });

      var index = sizes[(HVGA) ? sizes.length - 1 : 0];
      iconPath = icons[index];
    } else {
      iconPath = app.icon;
    }

    if (!iconPath) {
      return null;
    }

    if (iconPath.indexOf('data:') !== 0) {
      // We need to resolve iconPath as a relative url to origin, since
      // origin can be a full url in some apps.
      var base = getOriginObject(app.origin);
      var port = base.port ? (':' + base.port) : '';
      iconPath = base.protocol + '//' + base.hostname + port + iconPath;
    }

    return iconPath;
  }

  function escapeHTML(str, escapeQuotes) {
    var stringHTML = str;
    stringHTML = stringHTML.replace(/\</g, '&#60;');
    stringHTML = stringHTML.replace(/(\r\n|\n|\r)/gm, '<br/>');
    stringHTML = stringHTML.replace(/\s\s/g, ' &nbsp;');

    if (escapeQuotes)
      // The //" is to help dumb editors understand that there's not a
      // open string at EOL.
      return stringHTML.replace(/"/g, '&quot;').replace(/'/g, '&#x27;'); //"
    return stringHTML;
  }

  function fireEventNextTick(eventName) {
    setTimeout(function nextTick() {
      window.dispatchEvent(new CustomEvent(eventName));
    });
  }

  function fireCardViewBeforeShow() {
    fireEventNextTick('cardviewbeforeshow');
  }

  function fireCardViewShown() {
    fireEventNextTick('cardviewshown');
  }

  function fireCardViewBeforeClose() {
    fireEventNextTick('cardviewbeforeclose');
  }

  function fireCardViewClosed(newStackPosition) {
    var detail = null;

    if (newStackPosition) {
      detail = { 'detail': { 'newStackPosition': newStackPosition }};
    }

    var event = new CustomEvent('cardviewclosed', detail);
    setTimeout(function nextTick() {
      window.dispatchEvent(event);
    });
  }

  // Build and display the card switcher overlay
  // Note that we rebuild the switcher each time we need it rather
  // than trying to keep it in sync with app launches.  Performance is
  // not an issue here given that the user has to hold the HOME button down
  // for one second before the switcher will appear.
  // The second parameter, inRocketbar, determines how to display the
  // cardswitcher inside of the rocketbar. Both modes are necessary until
  // Rocketbar is enabled by default, then this will go away.
  function showCardSwitcher(isRocketbar) {
    cardSwitcher.show(isRocketbar);
  }

  function getOriginObject(url) {
    var parser = document.createElement('a');
    parser.href = url;

    return {
      protocol: parser.protocol,
      hostname: parser.hostname,
      port: parser.port
    };
  }

  function getOffOrigin(src, origin) {
    // Use src and origin as cache key
    var cacheKey = JSON.stringify(Array.prototype.slice.call(arguments));
    if (!getOffOrigin.cache[cacheKey]) {
      var native = getOriginObject(origin);
      var current = getOriginObject(src);
      if (current.protocol == 'http:') {
        // Display http:// protocol anyway
        getOffOrigin.cache[cacheKey] = current.protocol + '//' +
          current.hostname;
      } else if (native.protocol == current.protocol &&
        native.hostname == current.hostname &&
        native.port == current.port) {
        // Same origin policy
        getOffOrigin.cache[cacheKey] = '';
      } else if (current.protocol == 'app:') {
        // Avoid displaying app:// protocol
        getOffOrigin.cache[cacheKey] = '';
      } else {
        getOffOrigin.cache[cacheKey] = current.protocol + '//' +
          current.hostname;
      }
    }

    return getOffOrigin.cache[cacheKey];
  }

  getOffOrigin.cache = {};

  function hideCardSwitcher(removeImmediately, newStackPosition) {
    cardSwitcher.hide(removeImmediately, newStackPosition);
  }

  function cardSwitcherIsShown() {
    return cardSwitcher.isShown();
  }

  function screenshotPreviewsEnabled() {
    return useAppScreenshotPreviews;
  }

  cardSwitcher.setupCardSwiping = function(inRocketbar) {
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
    this.thresholdOrdering = 100;
    // Distance after which dragged card starts moving
    this.moveCardThreshold = window.innerHeight / 6;
    // Arbitrarily chosen to be 4x larger than the gecko18 drag
    // threshold.  This constant should be a truemm/mozmm value, but
    // it's hard for us to evaluate that here.
    this.removeCardThreshold = 100;
    this.switchingCardThreshold = 30;

    this.prevCardStyle = this.currentCardStyle = this.nextCardStyle = null;
    this.deltaX = 0;
    this.currentCard = this.prevCard = this.nextCard = null;

    // With this object we avoid several if statements
    this.pseudoCard = {
      style: {
        // Empty object
      },
      dispatchEvent: function() {
        // Do nothing
      },
      addEventListener: function() {}
    };

    // Scale for current card
    this.CC_SCALE = 0.8;
    // Scale for current card's siblings
    this.SC_SCALE = 0.6;
    // Opacity value for current card's siblings
    this.SC_OPA = 0.4;
    this.CARD_TRANSITION = '-moz-transform .3s, opacity .3s';
  };


  cardSwitcher.placeCards = function() {
    var currentCard = this.currentCard =
          cardsList.childNodes[this.currentDisplayed];
    var pseudoCard = this.pseudoCard;

    if (!currentCard) {
      // Fake objects -> index out of bound exception
      this.currentCard = currentCard = this.nextCard =
        this.prevCard = pseudoCard;
      this.currentCardStyle = this.nextCardStyle = this.prevCardStyle =
        pseudoCard.style;
      return;
    }

    currentCard.dispatchEvent(new CustomEvent('onviewport'));
    // Link to the style objects of the cards
    var currentCardStyle = this.currentCardStyle = currentCard.style;

    var prevCard = this.prevCard =
                   currentCard.previousElementSibling || pseudoCard;
    prevCard.dispatchEvent(new CustomEvent('onviewport'));
    var prevCardStyle = this.prevCardStyle = prevCard.style;

    var nextCard = this.nextCard =
                   currentCard.nextElementSibling || pseudoCard;
    nextCard.dispatchEvent(new CustomEvent('onviewport'));
    var nextCardStyle = this.nextCardStyle = nextCard.style;

    // Scaling and translating cards to reach target positions
    prevCardStyle.MozTransform =
      'scale(' + this.SC_SCALE + ') translateX(-100%)';
    currentCardStyle.MozTransform =
      'scale(' + this.CC_SCALE + ') translateX(0)';
    nextCardStyle.MozTransform =
      'scale(' + this.SC_SCALE + ') translateX(100%)';

    // Current card sets the z-index to level 2 and opacity to 1
    currentCardStyle.zIndex = 2;
    currentCardStyle.opacity = 1;

    // Previous and next cards set the z-indez to level 1 and opacity to 0.4
    prevCardStyle.zIndex = nextCardStyle.zIndex = 1;
    prevCardStyle.opacity = nextCardStyle.opacity = this.SC_OPA;

  };

  cardSwitcher.alignCurrentCard = function(noTransition) {
    // We're going to release memory hiding card out of screen
    if (this.deltaX < 0) {
      this.prevCard && this.prevCard.dispatchEvent(
        new CustomEvent('outviewport')
      );
    } else {
      this.nextCard && this.nextCard.dispatchEvent(
        new CustomEvent('outviewport')
      );
    }

    // Disable previous current card
    if (this.currentCardStyle) {
      this.currentCardStyle.pointerEvents = 'none';
    }

    this.placeCards();

    this.prevCardStyle.MozTransition = this.nextCardStyle.MozTransition =
                                       this.currentCardStyle.MozTransition =
                                       this.CARD_TRANSITION;

    var self = this;
    this.currentCard.addEventListener('transitionend',
                                      function transitionend() {
      if (!self.currentCard) {
        // removeCards method was called immediately without waiting
        return;
      }
      self.currentCard.removeEventListener('transitionend', transitionend);
      self.prevCardStyle.MozTransition = self.currentCardStyle.MozTransition =
      self.nextCardStyle.MozTransition = '';
      self.currentCardStyle.pointerEvents = 'auto';
    });

    if (noTransition) {
      this.currentCard.dispatchEvent(new Event('transitionend'));
    }
  };

  cardSwitcher.moveCards = function() {
    var deltaX = this.deltaX;
    var scaleFactor = Math.abs((deltaX / windowWidth) *
                        (this.CC_SCALE - this.SC_SCALE));

    var card = this.prevCardStyle;
    var oppositeCard = this.nextCardStyle;
    var currentCardStyle = this.currentCardStyle;
    var translateSign = -100;
    if (deltaX > 0) {
      card = this.nextCardStyle;
      oppositeCard = this.prevCardStyle;
      translateSign = 100;
    }

    var movementFactor = Math.abs(deltaX) / windowWidth;

    // Scaling and translating next or previous sibling
    card.MozTransform = 'scale(' + (this.SC_SCALE + scaleFactor) +
                ') translateX(' + (translateSign * (1 - movementFactor)) + '%)';

    // Fading in new card
    card.opacity = this.SC_OPA + (movementFactor * (1 - this.SC_OPA));
    // Hiding the opposite sibling card progressively
    oppositeCard.opacity = this.SC_OPA - movementFactor;
    // Fading out current card
    currentCardStyle.opacity = 1 - (movementFactor * (1 - this.SC_OPA));

    // Scaling and translating current card
    currentCardStyle.MozTransform = 'scale(' + (this.CC_SCALE - scaleFactor) +
                                    ') translateX(' + -deltaX + 'px)';
  };

  cardSwitcher.onMoveEventForScrolling = (function(evt) {
    this.deltaX = this.initialTouchPosition[0] - (evt.touches ?
                                                  evt.touches[0].pageX :
                                                  evt.pageX
                                                 );
    this.moveCards();
  }).bind(cardSwitcher);

  cardSwitcher.onMoveEventForDeleting = (function(evt, deltaY) {
    var dy = deltaY | this.initialTouchPosition[1] -
                              (evt.touches ? evt.touches[0].pageY : evt.pageY);
    if (dy > 0) {
       evt.target.style.MozTransform = 'scale(' + this.CC_SCALE +
                                               ') translateY(' + (-dy) + 'px)';
    }
  }).bind(cardSwitcher);

  cardSwitcher.onStartEvent = (function cs_onStartEvent(evt) {
    evt.stopPropagation();
    evt.target.setCapture(true);
    cardsView.addEventListener('touchmove', CardsView);
    cardsView.addEventListener('touchend', CardsView);
    cardsView.addEventListener('swipe', CardsView);

    if (evt.touches) {
      this.initialTouchPosition = [evt.touches[0].pageX, evt.touches[0].pageY];
    } else {
      this.initialTouchPosition = [evt.pageX, evt.pageY];
    }
  }).bind(cardSwitcher);

  cardSwitcher.onMoveEvent = (function cs_onMoveEvent(evt) {
    evt.stopPropagation();
    var touchPosition = evt.touches ? [evt.touches[0].pageX,
                                       evt.touches[0].pageY] :
                                      [evt.pageX, evt.pageY];

    this.deltaX = this.initialTouchPosition[0] - touchPosition[0];
    this.deltaY = this.initialTouchPosition[1] - touchPosition[1];

    if (MANUAL_CLOSING && this.deltaY > this.moveCardThreshold &&
        evt.target.classList.contains('card')) {
        // We don't want user to scroll the CardsView when one of the card is
        // already dragger upwards
        this.draggingCardUp = true;
        cardsView.removeEventListener('touchmove', CardsView);
        document.addEventListener('touchmove', this.onMoveEventForDeleting);
        this.onMoveEventForDeleting(evt, this.deltaY);
    } else {
      // If we are not removing Cards now and Snapping
      // Scrolling is enabled, we want to scroll the CardList
      if (Math.abs(this.deltaX) > this.switchingCardThreshold) {
        cardsView.removeEventListener('touchmove', CardsView);
        document.addEventListener('touchmove', this.onMoveEventForScrolling);
      }

      this.moveCards();
    }
  }).bind(cardSwitcher);

  cardSwitcher.onEndEvent = (function cs_onEndEvent(evt) {
    evt.stopPropagation();
    var element = evt.target;
    var eventDetail = evt.detail;

    document.releaseCapture();
    cardsView.removeEventListener('touchmove', CardsView);
    document.removeEventListener('touchmove', this.onMoveEventForDeleting);
    document.removeEventListener('touchmove', this.onMoveEventForScrolling);
    cardsView.removeEventListener('touchend', CardsView);
    cardsView.removeEventListener('swipe', CardsView);

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
            this.currentDisplayed < cardsList.childNodes.length - 1) {
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
      MANUAL_CLOSING &&
      this.draggingCardUp
    ) {
      this.draggingCardUp = false;
      var origin = stack[element.dataset.position].origin;
      // Prevent user from closing the app with a attention screen
      if (-dy > this.removeCardThreshold &&
        attentionScreenApps.indexOf(origin) == -1
      ) {

        // Remove the icon from the task list
        cardsList.removeChild(element);

        this.closeApp(element);
        this.alignCurrentCard();
        return;
      } else {
        element.style.MozTransform = '';
        this.alignCurrentCard();
      }

      return;
    }
  }).bind(cardSwitcher);

  function goToHomescreen(evt) {
    if (!cardSwitcherIsShown())
      return;

    window.dispatchEvent(new CustomEvent('cardviewclosedhome'));

    evt.stopImmediatePropagation();
    hideCardSwitcher();
  }

  function cv_handleEvent(evt) {
    switch (evt.type) {
      case 'touchstart':
        cardSwitcher.onStartEvent(evt);
        evt.preventDefault();
        break;

      case 'touchmove':
        cardSwitcher.onMoveEvent(evt);
        evt.preventDefault();
        break;

      case 'touchend':
      case 'swipe':
        cardSwitcher.onEndEvent(evt);
        evt.preventDefault();
        break;

      case 'opencurrentcard':
        AppWindowManager.display(
          stack[cardSwitcher.currentCard.dataset.position].origin,
          'from-cardview',
          null);
        break;

      case 'tap':
        cardSwitcher.handleTap(evt);
        break;

      case 'home':
        goToHomescreen(evt);
        break;

      case 'lock':
      case 'attentionscreenshow':
        attentionScreenApps = AttentionScreen.getAttentionScreenOrigins();
        hideCardSwitcher();
        break;

      case 'attentionscreenhide':
        attentionScreenApps = AttentionScreen.getAttentionScreenOrigins();
        break;

      case 'taskmanagershow':
        showCardSwitcher(true);
        break;

      case 'taskmanagerhide':
        hideCardSwitcher();
        break;

      case 'holdhome':
        if (window.lockScreen && window.lockScreen.locked)
          return;

        SleepMenu.hide();
        var app = AppWindowManager.getActiveApp();
        if (!app) {
          showCardSwitcher();
        } else {
          app.getScreenshot(function onGettingRealtimeScreenshot() {
            showCardSwitcher();
          });
        }
        break;

      case 'appopen':
        if (!evt.detail.isHomescreen) {
          hideCardSwitcher(/* immediately */ true);
        }
        break;
    }
  }

  // Public API of CardsView
  return {
    showCardSwitcher: showCardSwitcher,
    hideCardSwitcher: hideCardSwitcher,
    cardSwitcherIsShown: cardSwitcherIsShown,
    _screenshotPreviewsEnabled: screenshotPreviewsEnabled,
    _getIconURI: getIconURI,
    handleEvent: cv_handleEvent,
    _escapeHTML: escapeHTML
  };
})();

window.addEventListener('attentionscreenshow', CardsView);
window.addEventListener('attentionscreenhide', CardsView);
window.addEventListener('taskmanagershow', CardsView);
window.addEventListener('taskmanagerhide', CardsView);
window.addEventListener('holdhome', CardsView);
window.addEventListener('home', CardsView);
window.addEventListener('appopen', CardsView);
