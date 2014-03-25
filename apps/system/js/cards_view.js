/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

//
// CardsView is responsible for managing opened apps
//

'use strict';

var CardsView = (function() {
  //display icon of an app on top of app's card
  var DISPLAY_APP_ICON = true;
  var DISPLAY_APP_SCREENSHOT = true;
  // if 'true' user can close the app
  // by dragging it upwards
  var MANUAL_CLOSING = true;

  var cardsView = document.getElementById('cards-view');
  var screenElement = document.getElementById('screen');
  var cardsList = document.getElementById('cards-list');
  var stack = [];
  // Unkillable apps which have attention screen now
  var attentionScreenApps = [];
  var currentDisplayed = 0;
  var currentPosition = 0;
  // Are we removing the card now?
  var draggingCardUp = false;
  // Are we moving card left or right?
  var sortingDirection;
  var HVGA = document.documentElement.clientWidth < 480;
  var cardsViewShown = false;

  var windowWidth = window.innerWidth;

  var lastInTimeCapture;

  // init events
  var gd = new GestureDetector(cardsView);
  gd.startDetecting();

  /*
   * Returns an icon URI
   *
   * @param{String} the position of the app in our cache
   */
  function getIconURI(position) {
    var app = stack[position];
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
      iconPath = app.origin + iconPath;
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

  function fireCardViewShown() {
    setTimeout(function nextTick() {
      window.dispatchEvent(new CustomEvent('cardviewshown'));
    });
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
  function showCardSwitcher(inRocketbar) {

    var inTimeCapture = lastInTimeCapture;
    lastInTimeCapture = false;

    if (cardSwitcherIsShown())
      return;

    // events to handle
    window.addEventListener('lock', CardsView);

    screenElement.classList.add('cards-view');

    // Close utility tray if it is opened.
    UtilityTray.hide(true);

    // Apps info from Stack Manager.
    stack = StackManager.snapshot();

    currentPosition = StackManager.position;

    // If we are currently displaying the homescreen but we have apps in the
    // stack we will display the most recently used application.
    if (currentPosition == -1 && stack.length) {
      currentPosition = stack.length - 1;
    }
    currentDisplayed = currentPosition;

    // Return early if inRocketbar and there are no apps.
    if (!stack.length && inRocketbar) {
      // Fire a cardchange event to notify the rocketbar that there are no cards
      fireCardViewClosed();
      return;
    } else if (inRocketbar) {
      screenElement.classList.add('task-manager');
      CC_SCALE = 0.6;
      SC_SCALE = 0.5;
    } else {
      CC_SCALE = 0.8;
      SC_SCALE = 0.6;
    }

    // Switch to homescreen
    AppWindowManager.display(null, null, 'to-cardview');
    cardsViewShown = true;

    // First add an item to the cardsList for each running app
    stack.forEach(function(app, position) {
      addCard(position, app, function showCards() {
        cardsView.classList.add('active');
        fireCardViewShown();
      });
    });

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

    // Make sure the keyboard isn't showing by blurring the active app.
    if (stack.length) {
      stack[currentPosition].blur();
    }

    placeCards();
    // At the beginning only the current card can listen to tap events
    currentCardStyle.pointerEvents = 'auto';
    window.addEventListener('tap', CardsView);
    window.addEventListener('opencurrentcard', CardsView);

    // If the stack is empty, let's go ahead and show the cards view since
    // no showCards callback will be called.
    if (!stack.length) {
      cardsView.classList.add('active');
      fireCardViewShown();
    }

    function addCard(position, app, showCardCallback) {
      // Display card switcher background first to make user focus on the
      // frame closing animation without disturbing by homescreen display.
      if (currentPosition == position && showCardCallback) {
        setTimeout(showCardCallback);
      }

      // Build a card representation of each window.
      // And add it to the card switcher
      var card = document.createElement('li');
      card.classList.add('card');
      card.dataset.origin = app.origin;
      card.dataset.position = position;

      var screenshotView = document.createElement('div');
      screenshotView.classList.add('screenshotView');
      card.appendChild(screenshotView);

      //display app icon on the tab
      var iconURI = getIconURI(position);
      if (iconURI) {
        var appIcon = document.createElement('img');
        appIcon.src = iconURI;
      } else {
        appIcon = document.createElement('span');
      }
      appIcon.classList.add('appIcon');
      card.appendChild(appIcon);
      card.classList.add('appIconPreview');

      var title = document.createElement('h1');
      title.textContent = app.name;
      card.appendChild(title);

      // only take the frame reference if we need to
      var frameForScreenshot = DISPLAY_APP_SCREENSHOT && app.iframe;

      var origin = stack[position].origin;
      if (PopupManager.getPopupFromOrigin(origin)) {
        var popupFrame =
          PopupManager.getPopupFromOrigin(origin);
        frameForScreenshot = DISPLAY_APP_SCREENSHOT && popupFrame;

        var subtitle = document.createElement('p');
        subtitle.textContent =
          PopupManager.getOpenedOriginFromOpener(origin);
        card.appendChild(subtitle);
        card.classList.add('popup');
      } else if (getOffOrigin(app.iframe.dataset.url ?
            app.iframe.dataset.url : app.iframe.src, origin)) {
        var subtitle = document.createElement('p');
        subtitle.textContent = getOffOrigin(app.iframe.dataset.url ?
            app.iframe.dataset.url : app.iframe.src, origin);
        card.appendChild(subtitle);
      }

      if (TrustedUIManager.hasTrustedUI(origin)) {
        var popupFrame = TrustedUIManager.getDialogFromOrigin(origin);
        frameForScreenshot = DISPLAY_APP_SCREENSHOT && popupFrame.frame;
        var header = document.createElement('section');
        header.setAttribute('role', 'region');
        header.classList.add('skin-organic');
        header.innerHTML = '<header><button><span class="icon icon-close">';
        header.innerHTML +=
          '</span></button><h1>' + escapeHTML(popupFrame.name, true);
        header.innerHTML += '</h1></header>';
        card.appendChild(header);
        card.classList.add('trustedui');
      } else if (attentionScreenApps.indexOf(origin) == -1) {
        var closeButton = document.createElement('div');
        closeButton.setAttribute('role', 'button');
        closeButton.classList.add('close-card');
        card.appendChild(closeButton);
      }

      cardsList.appendChild(card);

      card.addEventListener('outviewport', function outviewport() {
        card.style.display = 'none';
      });

      card.addEventListener('onviewport', function onviewport() {
        card.style.display = 'block';
        if (DISPLAY_APP_SCREENSHOT && screenshotView.style.backgroundImage) {
          return;
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

        if (!DISPLAY_APP_SCREENSHOT) {
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
          origin === stack[currentPosition].origin && !inTimeCapture)) {
          if (typeof frameForScreenshot.getScreenshot !== 'function') {
            return;
          }

          // rect is the final size (considering CSS transform) of the card.
          var rect = card.getBoundingClientRect();
          var width = isLandscape ? rect.height : rect.width;
          var height = isLandscape ? rect.width : rect.height;
          frameForScreenshot.getScreenshot(
            width, height).onsuccess =
            function gotScreenshot(screenshot) {
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
              }
            };
        }
      });
    }
  }

  function tap(e) {
    // Handle close events
    if (e.target.classList.contains('close-card') &&
        cardsList.contains(e.target.parentNode)) {
      var card = e.target.parentNode;
      cardsList.removeChild(card);
      closeApp(card, true);
    } else if ('position' in e.target.dataset) {
      AppWindowManager.display(
        stack[e.target.dataset.position].origin,
        'from-cardview',
        null
      );
      // Card switcher will get hidden when 'appopen' is fired.
      fireCardViewClosed(e.target.dataset.position);
    }
  }

  function closeApp(element, removeImmediately) {
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
    if (cardsLength === currentDisplayed) {
      currentPosition--;
      if (currentPosition < 0) {
        currentPosition = 0;
      }
      currentDisplayed = currentPosition;
    }

    // If there are no cards left, then dismiss the task switcher.
    if (!cardsLength) {
      hideCardSwitcher(removeImmediately);
    }
    else {
      alignCurrentCard();
    }
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
    if (!cardSwitcherIsShown())
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
    cardsViewShown = false;

    // And remove all the cards from the document after the transition
    function removeCards() {
      cardsView.removeEventListener('transitionend', removeCards);
      screenElement.classList.remove('cards-view');
      cardsList.innerHTML = '';
      prevCardStyle = currentCardStyle = nextCardStyle = currentCard =
      prevCard = nextCard = deltaX = null;
      screenElement.classList.remove('task-manager');
    }
    if (removeImmediately) {
      removeCards();
      cardsView.classList.remove('no-transition');
    } else {
      cardsView.addEventListener('transitionend', removeCards);
    }

    fireCardViewClosed(newStackPosition);
  }

  function cardSwitcherIsShown() {
    return cardsViewShown;
  }

  //scrolling cards (Positon 0 is x-coord and position 1 is y-coord)
  var initialTouchPosition = [0, 0];
  // If the pointer down event starts outside of a card, then there's
  // no ambiguity between tap/pan, so we don't need a transition
  // threshold.
  //
  // If pointerdown is on a card, then gecko's click detection will
  // resolve the tap/pan ambiguitiy.  So favor responsiveness of
  // switching the card.  It doesn't make sense for users to start
  // swiping because they want to stay on the same card.
  var threshold = 1;
  var thresholdOrdering = 100;
  // Distance after which dragged card starts moving
  var moveCardThreshold = window.innerHeight / 6;
  // Arbitrarily chosen to be 4x larger than the gecko18 drag
  // threshold.  This constant should be a truemm/mozmm value, but
  // it's hard for us to evaluate that here.
  var removeCardThreshold = 100;
  var switchingCardThreshold = 30;

  var prevCardStyle, currentCardStyle, nextCardStyle, deltaX;
  var currentCard, prevCard, nextCard;

  // With this object we avoid several if statements
  var pseudoCard = {
    style: {
      // Empty object
    },
    dispatchEvent: function() {
      // Do nothing
    },
    addEventListener: function() {}
  };

  var onViewPortEvent = new CustomEvent('onviewport');
  var outViewPortEvent = new CustomEvent('outviewport');

  // Scale for current card
  var CC_SCALE = 0.8;
  // Scale for current card's siblings
  var SC_SCALE = 0.6;
  // Opacity value for current card's siblings
  var SC_OPA = 0.4;
  var CARD_TRANSITION = '-moz-transform .3s, opacity .3s';

  function placeCards() {
    currentCard = cardsList.childNodes[currentDisplayed];

    if (!currentCard) {
      // Fake objects -> index out of bound exception
      currentCard = nextCard = prevCard = pseudoCard;
      currentCardStyle = nextCardStyle = prevCardStyle = pseudoCard.style;
      return;
    }

    currentCard.dispatchEvent(onViewPortEvent);
    // Link to the style objects of the cards
    currentCardStyle = currentCard.style;

    prevCard = currentCard.previousElementSibling || pseudoCard;
    prevCard.dispatchEvent(onViewPortEvent);
    prevCardStyle = prevCard.style;

    nextCard = currentCard.nextElementSibling || pseudoCard;
    nextCard.dispatchEvent(onViewPortEvent);
    nextCardStyle = nextCard.style;

    // Scaling and translating cards to reach target positions
    prevCardStyle.MozTransform = 'scale(' + SC_SCALE + ') translateX(-100%)';
    currentCardStyle.MozTransform = 'scale(' + CC_SCALE + ') translateX(0)';
    nextCardStyle.MozTransform = 'scale(' + SC_SCALE + ') translateX(100%)';

    // Current card sets the z-index to level 2 and opacity to 1
    currentCardStyle.zIndex = 2;
    currentCardStyle.opacity = 1;

    // Previous and next cards set the z-indez to level 1 and opacity to 0.4
    prevCardStyle.zIndex = nextCardStyle.zIndex = 1;
    prevCardStyle.opacity = nextCardStyle.opacity = SC_OPA;
  }

  function alignCurrentCard(noTransition) {
    // We're going to release memory hiding card out of screen
    if (deltaX < 0) {
      prevCard && prevCard.dispatchEvent(outViewPortEvent);
    } else {
      nextCard && nextCard.dispatchEvent(outViewPortEvent);
    }

    // Disable previous current card
    if (currentCardStyle) {
      currentCardStyle.pointerEvents = 'none';
    }

    placeCards();

    prevCardStyle.MozTransition = nextCardStyle.MozTransition =
                              currentCardStyle.MozTransition = CARD_TRANSITION;

    currentCard.addEventListener('transitionend', function transitionend() {
      if (!currentCard) {
        // removeCards method was called immediately without waiting
        return;
      }
      currentCard.removeEventListener('transitionend', transitionend);
      prevCardStyle.MozTransition = currentCardStyle.MozTransition =
      nextCardStyle.MozTransition = '';
      currentCardStyle.pointerEvents = 'auto';
    });

    if (noTransition) {
      currentCard.dispatchEvent(new Event('transitionend'));
    }
  }

  function moveCards() {
    var scaleFactor = Math.abs((deltaX / windowWidth) * (CC_SCALE - SC_SCALE));

    var card = prevCardStyle;
    var oppositeCard = nextCardStyle;
    var translateSign = -100;
    if (deltaX > 0) {
      var card = nextCardStyle;
      var oppositeCard = prevCardStyle;
      var translateSign = 100;
    }

    var movementFactor = Math.abs(deltaX) / windowWidth;

    // Scaling and translating next or previous sibling
    card.MozTransform = 'scale(' + (SC_SCALE + scaleFactor) +
                ') translateX(' + (translateSign * (1 - movementFactor)) + '%)';

    // Fading in new card
    card.opacity = SC_OPA + (movementFactor * (1 - SC_OPA));
    // Hiding the opposite sibling card progressively
    oppositeCard.opacity = SC_OPA - movementFactor;
    // Fading out current card
    currentCardStyle.opacity = 1 - (movementFactor * (1 - SC_OPA));

    // Scaling and translating current card
    currentCardStyle.MozTransform = 'scale(' + (CC_SCALE - scaleFactor) +
                                    ') translateX(' + -deltaX + 'px)';
  }

  function onMoveEventForScrolling(evt) {
    deltaX = initialTouchPosition[0] - (evt.touches ? evt.touches[0].pageX :
                                        evt.pageX);
    moveCards();
  }

  function onMoveEventForDeleting(evt, deltaY) {
    var dy = deltaY | initialTouchPosition[1] -
                              (evt.touches ? evt.touches[0].pageY : evt.pageY);
    if (dy > 0) {
       evt.target.style.MozTransform = 'scale(' + CC_SCALE +
                                               ') translateY(' + (-dy) + 'px)';
    }
  }

  function onStartEvent(evt) {
    evt.stopPropagation();
    evt.target.setCapture(true);
    cardsView.addEventListener('touchmove', CardsView);
    cardsView.addEventListener('touchend', CardsView);
    cardsView.addEventListener('swipe', CardsView);

    if (evt.touches) {
      initialTouchPosition = [evt.touches[0].pageX, evt.touches[0].pageY];
    } else {
      initialTouchPosition = [evt.pageX, evt.pageY];
    }
  }

  function onMoveEvent(evt) {
    evt.stopPropagation();
    var touchPosition = evt.touches ? [evt.touches[0].pageX,
                                       evt.touches[0].pageY] :
                                      [evt.pageX, evt.pageY];

    deltaX = initialTouchPosition[0] - touchPosition[0];
    var deltaY = initialTouchPosition[1] - touchPosition[1];

    if (MANUAL_CLOSING && deltaY > moveCardThreshold &&
        evt.target.classList.contains('card')) {
        // We don't want user to scroll the CardsView when one of the card is
        // already dragger upwards
        draggingCardUp = true;
        cardsView.removeEventListener('touchmove', CardsView);
        document.addEventListener('touchmove', onMoveEventForDeleting);
        onMoveEventForDeleting(evt, deltaY);
    } else {
      // If we are not removing Cards now and Snapping
      // Scrolling is enabled, we want to scroll the CardList
      if (Math.abs(deltaX) > switchingCardThreshold) {
        cardsView.removeEventListener('touchmove', CardsView);
        document.addEventListener('touchmove', onMoveEventForScrolling);
      }

      moveCards();
    }
  }

  function onEndEvent(evt) {
    evt.stopPropagation();
    var element = evt.target;
    var eventDetail = evt.detail;

    document.releaseCapture();
    cardsView.removeEventListener('touchmove', CardsView);
    document.removeEventListener('touchmove', onMoveEventForDeleting);
    document.removeEventListener('touchmove', onMoveEventForScrolling);
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
        dx = evt.changedTouches[0].pageX - initialTouchPosition[0];
        dy = evt.changedTouches[0].pageY - initialTouchPosition[1];
      } else {
        dx = evt.pageX - initialTouchPosition[0];
        dy = evt.pageY - initialTouchPosition[1];
      }
      direction = dx > 0 ? 'right' : 'left';
    }

    if (!draggingCardUp) {
      if (Math.abs(dx) > threshold) {
        deltaX = dx;
        direction = dx > 0 ? 'right' : 'left';
        if (direction === 'left' &&
            currentDisplayed < cardsList.childNodes.length - 1) {
          currentDisplayed = ++currentPosition;

        } else if (direction === 'right' && currentDisplayed > 0) {
          currentDisplayed = --currentPosition;
        }
        alignCurrentCard();
      } else {
        tap(evt);
      }

      return;
    }

    // if the element we start dragging on is a card
    if (
      element.classList.contains('card') &&
      MANUAL_CLOSING &&
      draggingCardUp
    ) {
      draggingCardUp = false;
      var origin = stack[element.dataset.position].origin;
      // Prevent user from closing the app with a attention screen
      if (-dy > removeCardThreshold &&
        attentionScreenApps.indexOf(origin) == -1
      ) {

        // Remove the icon from the task list
        cardsList.removeChild(element);

        closeApp(element);
        alignCurrentCard();
        return;
      } else {
        element.style.MozTransform = '';
        alignCurrentCard();
      }

      return;
    }
  }

  function maybeShowInRocketbar() {
    if (Rocketbar.enabled) {
      Rocketbar.render(true);
    } else {
      showCardSwitcher();
    }
  }

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
        onStartEvent(evt);
        evt.preventDefault();
        break;

      case 'touchmove':
        onMoveEvent(evt);
        evt.preventDefault();
        break;

      case 'touchend':
      case 'swipe':
        onEndEvent(evt);
        evt.preventDefault();
        break;

      case 'opencurrentcard':
        AppWindowManager.display(
          stack[currentCard.dataset.position].origin,
          'from-cardview',
          null);
        break;

      case 'tap':
        tap(evt);
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
          maybeShowInRocketbar();
        } else {
          app.getScreenshot(function onGettingRealtimeScreenshot() {
            lastInTimeCapture = true;
            maybeShowInRocketbar();
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
