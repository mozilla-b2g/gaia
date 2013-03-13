/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

//
// CardsView is responsible for managing opened apps
//

'use strict';

var CardsView = (function() {

  //display icon of an app on top of app's card
  var DISPLAY_APP_ICON = false;
  var USER_DEFINED_ORDERING = false;
  // If 'true', scrolling moves the list one card
  // at time, and snaps the list so the current card
  // is centered in the view
  // If 'false', use free, physics-based scrolling
  // (Gaia default)
  var SNAPPING_SCROLLING = true;
  // if 'true' user can close the app
  // by dragging it upwards
  var MANUAL_CLOSING = true;

  var cardsView = document.getElementById('cards-view');
  var screenElement = document.getElementById('screen');
  var cardsList = cardsView.firstElementChild;
  var displayedApp;
  var runningApps;
  // Unkillable apps which have attention screen now
  var attentionScreenApps = [];
  // Card which we are re-ordering now
  var reorderedCard = null;
  var currentDisplayed = 0;
  // Timer between scrolling CardList further,
  // when reordering Cards
  var scrollWhileSortingTimer;
  // We don't allow user to scroll CardList
  // before the timer ticks while in reordering
  // mode
  var allowScrollingWhileSorting = false;
  // Initial margin of the reordered card
  var dragMargin = 0;
  // Are we reordering or removing the card now?
  var draggingCardUp = false;
  // Are we moving card left or right?
  var sortingDirection;
  // List of sorted apps
  var userSortedApps = [];
  var HVGA = document.documentElement.clientWidth < 480;
  var cardsViewShown = false;

  // init events
  var gd = new GestureDetector(cardsView);
  gd.startDetecting();

  /*
   * Returns an icon URI
   *
   * @param{String} the app's origin
   */
  function getIconURI(origin) {
    var icons = runningApps[origin].manifest.icons;
    if (!icons) {
      return null;
    }

    var sizes = Object.keys(icons).map(function parse(str) {
      return parseInt(str, 10);
    });

    sizes.sort(function(x, y) { return y - x; });

    var index = sizes[(HVGA) ? sizes.length - 1 : 0];
    var iconPath = icons[index];

    if (iconPath.indexOf('data:') !== 0) {
      iconPath = origin + iconPath;
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

  // Build and display the card switcher overlay
  // Note that we rebuild the switcher each time we need it rather
  // than trying to keep it in sync with app launches.  Performance is
  // not an issue here given that the user has to hold the HOME button down
  // for one second before the switcher will appear.
  function showCardSwitcher() {
    if (cardSwitcherIsShown())
      return;

    // events to handle
    window.addEventListener('lock', CardsView);

    // Close utility tray if it is opened.
    UtilityTray.hide(true);

    // Apps info from WindowManager
    displayedApp = WindowManager.getDisplayedApp();
    currentDisplayed = 0;
    runningApps = WindowManager.getRunningApps();

    // Switch to homescreen
    WindowManager.launch(null);
    cardsViewShown = true;

    // If user is not able to sort apps manualy,
    // display most recetly active apps on the far left
    if (!USER_DEFINED_ORDERING) {
      var sortable = [];
      for (var origin in runningApps)
        sortable.push({origin: origin, app: runningApps[origin]});

      sortable.sort(function(a, b) {
        return b.app.launchTime - a.app.launchTime;
      });
      runningApps = {};

      // I assume that object properties are enumerated in
      // the same order they were defined.
      // There is nothing about that in spec, but I've never
      // seen any unexpected behavior.
      sortable.forEach(function(element) {
        runningApps[element.origin] = element.app;
      });

      // First add an item to the cardsList for each running app
      for (var origin in runningApps) {
        addCard(origin, runningApps[origin], function showCards() {
          screenElement.classList.add('cards-view');
          cardsView.classList.add('active');
        });
      }

    } else { // user ordering

      // first run
      if (userSortedApps.length === 0) {
        for (var origin in runningApps) {
          userSortedApps.push(origin);
        }
      } else {
        for (var origin in runningApps) {
          // if we have some new app opened
          if (userSortedApps.indexOf(origin) === -1) {
            userSortedApps.push(origin);
          }
        }
      }

      userSortedApps.forEach(function(origin) {
        addCard(origin, runningApps[origin], function showCards() {
          screenElement.classList.add('cards-view');
          cardsView.classList.add('active');
        });
      });

      cardsView.addEventListener('contextmenu', CardsView);

    }

    if (SNAPPING_SCROLLING) {
      cardsView.style.overflow = 'hidden'; //disabling native scrolling
    }

    if (SNAPPING_SCROLLING || MANUAL_CLOSING) {
      cardsView.addEventListener('mousedown', CardsView);
    }

    // Make sure we're in portrait mode
    screen.mozLockOrientation('portrait-primary');

    // If there is a displayed app, take keyboard focus away
    if (displayedApp)
      runningApps[displayedApp].frame.blur();

    function addCard(origin, app, displayedAppCallback) {
      // Display card switcher background first to make user focus on the
      // frame closing animation without disturbing by homescreen display.
      if (displayedApp == origin && displayedAppCallback) {
        setTimeout(displayedAppCallback);
      }
      // Not showing homescreen
      if (app.frame.classList.contains('homescreen')) {
        return;
      }

      // Build a card representation of each window.
      // And add it to the card switcher
      var card = document.createElement('li');
      card.classList.add('card');
      card.dataset.origin = origin;

      //display app icon on the tab
      if (DISPLAY_APP_ICON) {
        var iconURI = getIconURI(origin);
        if (iconURI) {
          var appIcon = document.createElement('img');
          appIcon.classList.add('appIcon');
          appIcon.src = iconURI;
          card.appendChild(appIcon);
        }
      }

      var title = document.createElement('h1');
      title.textContent = app.name;
      card.appendChild(title);

      var frameForScreenshot = app.iframe;

      if (PopupManager.getPopupFromOrigin(origin)) {
        var popupFrame = PopupManager.getPopupFromOrigin(origin);
        frameForScreenshot = popupFrame;

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
        frameForScreenshot = popupFrame.frame;
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
        closeButton.classList.add('close-card');
        card.appendChild(closeButton);
      }

      cardsList.appendChild(card);

      // If we have a cached screenshot, use that first
      // We then 'res-in' the correctly sized version
      var cachedLayer = WindowManager.screenshots[origin];
      if (cachedLayer) {
        card.style.backgroundImage = 'url(' + cachedLayer + ')';
      }

      // rect is the final size (considering CSS transform) of the card.
      var rect = card.getBoundingClientRect();

      // And then switch it with screenshots when one will be ready
      // (instead of -moz-element backgrounds)
      if (typeof frameForScreenshot.getScreenshot === 'function') {
        frameForScreenshot.getScreenshot(rect.width, rect.height).onsuccess =
          function gotScreenshot(screenshot) {
            if (screenshot.target.result) {
              var objectURL = URL.createObjectURL(screenshot.target.result);

              // Overwrite the cached image to prevent flickering
              card.style.backgroundImage =
                'url(' + objectURL + '), url(' + cachedLayer + ')';

              // setTimeout is needed to ensure that the image is fully drawn
              // before we remove it. Otherwise the rendering is not smooth.
              // See: https://bugzilla.mozilla.org/show_bug.cgi?id=844245
              setTimeout(function() {

                // Override the cached image
                URL.revokeObjectURL(cachedLayer);
                WindowManager.screenshots[origin] = objectURL;
              }, 200);
            }
          };
      }

      // Set up event handling
      // A click elsewhere in the card switches to that task
      card.addEventListener('tap', runApp);
    }
  }

  function runApp(e) {
    // Handle close events
    if (e.target.classList.contains('close-card')) {
      var element = e.target.parentNode;
      cardsList.removeChild(element);
      closeApp(element, true);
      return;
    }

    var origin = this.dataset.origin;
    WindowManager.launch(origin);
  }

  function closeApp(element, removeImmediately) {
    // Stop the app itself
    WindowManager.kill(element.dataset.origin);

    // Fix for non selectable cards when we remove the last card
    // Described in https://bugzilla.mozilla.org/show_bug.cgi?id=825293
    var cardsLength = cardsList.children.length;
    if (cardsLength === currentDisplayed) {
      currentDisplayed--;
    }

    // If there are no cards left, then dismiss the task switcher.
    if (!cardsLength)
      hideCardSwitcher(removeImmediately);
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

  function hideCardSwitcher(removeImmediately) {
    if (!cardSwitcherIsShown())
      return;

    // events to handle
    window.removeEventListener('lock', CardsView);

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

      while (cardsList.firstElementChild) {
        cardsList.removeChild(cardsList.firstElementChild);
      }
    }
    if (removeImmediately) {
      removeCards();
      cardsView.classList.remove('no-transition');
    } else {
      cardsView.addEventListener('transitionend', removeCards);
    }
  }

  function cardSwitcherIsShown() {
    return cardsViewShown;
  }

  //scrolling cards
  var initialCardViewPosition;
  var initialTouchPosition = {};
  // If the pointer down event starts outside of a card, then there's
  // no ambiguity between tap/pan, so we don't need a transition
  // threshold.
  //
  // If pointerdown is on a card, then gecko's click detection will
  // resolve the tap/pan ambiguitiy.  So favor responsiveness of
  // switching the card.  It doesn't make sense for users to start
  // swiping because they want to stay on the same card.
  var threshold = 1;
  // Distance after which dragged card starts moving
  var moveCardThreshold = window.innerHeight / 6;
  // Arbitrarily chosen to be 4x larger than the gecko18 drag
  // threshold.  This constant should be a truemm/mozmm value, but
  // it's hard for us to evaluate that here.
  var removeCardThreshold = 100;

  function alignCurrentCard() {
    var number = currentDisplayed;
    if (!cardsList.children[number]) {
      return;
    }

    var target = cardsList.children[number];
    var scrollLeft = cardsView.scrollLeft;
    var targetScrollLeft = target.offsetLeft;

    var scrollDiff = scrollLeft - targetScrollLeft;
    if (!scrollDiff) {
      return;
    }

    if (Math.abs(scrollDiff) < 4) {
      cardsView.scrollLeft = targetScrollLeft;
      return;
    }

    cardsView.scrollLeft = scrollLeft + (targetScrollLeft - scrollLeft) / 2;
    target.transform = '';

    window.mozRequestAnimationFrame(function newFrameCallback() {
      alignCurrentCard();
    });
  }

  function onStartEvent(evt) {
    evt.stopPropagation();
    evt.target.setCapture(true);
    cardsView.addEventListener('mousemove', CardsView);
    cardsView.addEventListener('mouseup', CardsView);
    cardsView.addEventListener('swipe', CardsView);

    initialCardViewPosition = cardsView.scrollLeft;
    initialTouchPosition = {
        x: evt.touches ? evt.touches[0].pageX : evt.pageX,
        y: evt.touches ? evt.touches[0].pageY : evt.pageY
    };
  }

  function onMoveEvent(evt) {
    evt.stopPropagation();
    var touchPosition = {
        x: evt.touches ? evt.touches[0].pageX : evt.pageX,
        y: evt.touches ? evt.touches[0].pageY : evt.pageY
    };

    if (evt.target.classList.contains('card') && MANUAL_CLOSING) {
      var differenceY = initialTouchPosition.y - touchPosition.y;
      if (differenceY > moveCardThreshold) {
        // We don't want user to scroll the CardsView when one of the card is
        // already dragger upwards
        draggingCardUp = true;
        evt.target.style.MozTransform = 'scale(0.6) translate(0, -' +
                                        differenceY + 'px)';
      }
    }

    // If we are not reordering or removing Cards now
    // and Snapping Scrolling is enabled, we want to scroll
    // the CardList
    if (SNAPPING_SCROLLING && reorderedCard === null && !draggingCardUp) {
      var differenceX = initialTouchPosition.x - touchPosition.x;
      cardsView.scrollLeft = initialCardViewPosition + differenceX;
    }

    // If re are in reordering mode (there is a DOM element in)
    // reorderedCard variable) we are able to put this element somewere
    // among the others
    if (USER_DEFINED_ORDERING && reorderedCard !== null) {
      var differenceX = touchPosition.x - initialTouchPosition.x;
      // Probably there is more clever solution for calculating
      // position of transformed DOM element, but this was my
      // first thought and it seems to work
      var moveOffset = (cardsList.children[currentDisplayed].offsetLeft / 0.6) +
                       differenceX - (dragMargin / 0.6);

      reorderedCard.style.MozTransform =
        'scale(0.6) translate(' + moveOffset + 'px, 0)';

      if (Math.abs(differenceX) > threshold) {
        // We don't want to jump to the next page immediately,
        // We are waiting half a second for user to decide if
        // he wants to leave the Card here or scroll further
        if (allowScrollingWhileSorting) {
          allowScrollingWhileSorting = false;

          scrollWhileSortingTimer = setTimeout(function() {
            allowScrollingWhileSorting = true;
          }, 500);

          if (differenceX > 0 &&
              currentDisplayed <= cardsList.children.length) {
            currentDisplayed++;
            sortingDirection = 'right';
            alignCurrentCard();
          } else if (differenceX < 0 && currentDisplayed > 0) {
            currentDisplayed--;
            sortingDirection = 'left';
            alignCurrentCard();
          }
        }
      }
    }
  }

  function onEndEvent(evt) {
    evt.stopPropagation();
    var element = evt.target;
    var eventDetail = evt.detail;

    document.releaseCapture();
    cardsView.removeEventListener('mousemove', CardsView);
    cardsView.removeEventListener('mouseup', CardsView);
    cardsView.removeEventListener('swipe', CardsView);

    var eventDetailEnd = eventDetail.end;
    var dx, dy, direction;

    if (eventDetailEnd) {
      dx = eventDetail.dx;
      dy = eventDetail.dy;
      direction = eventDetail.direction;
    } else {
      var touchPosition = {
        x: evt.touches ? evt.touches[0].pageX : evt.pageX,
        y: evt.touches ? evt.touches[0].pageY : evt.pageY
      };
      dx = touchPosition.x - initialTouchPosition.x;
      dy = touchPosition.y - initialTouchPosition.y;
      direction = dx > 0 ? 'right' : 'left';
    }

    if (SNAPPING_SCROLLING && !draggingCardUp && reorderedCard === null) {
      if (Math.abs(dx) > threshold) {
        direction = dx > 0 ? 'right' : 'left';
        if (direction === 'left' &&
            currentDisplayed < cardsList.children.length - 1) {
          currentDisplayed++;
          alignCurrentCard();
        } else if (direction === 'right' && currentDisplayed > 0) {
          currentDisplayed--;
          alignCurrentCard();
        }
      } else {
        alignCurrentCard();
      }
    }

    // if the element we start dragging on
    // is a card and we are not in reordering mode
    if (
      element.classList.contains('card') &&
      MANUAL_CLOSING &&
      draggingCardUp &&
      reorderedCard === null
    ) {
      draggingCardUp = false;
      // Prevent user from closing the app with a attention screen
      if (-dy > removeCardThreshold &&
        attentionScreenApps.indexOf(element.dataset.origin) == -1
      ) {

        // remove the app also from the ordering list
        if (
          userSortedApps.indexOf(element.dataset.origin) !== -1 &&
          USER_DEFINED_ORDERING
        ) {
          userSortedApps.splice(
            userSortedApps.indexOf(element.dataset.origin),
            1
          );
        }

        // Without removing the listener before closing card
        // sometimes the 'click' event fires, even if 'mouseup'
        // uses stopPropagation()
        element.removeEventListener('tap', runApp);

        // Remove the icon from the task list
        cardsList.removeChild(element);

        closeApp(element);
        alignCurrentCard();
        return;
      } else {
        element.style.MozTransform = '';
        alignCurrentCard();
      }
    }

    if (USER_DEFINED_ORDERING && reorderedCard !== null) {
      // Position of the card depends on direction of scrolling
      if (sortingDirection === 'right') {
        if (currentDisplayed <= cardsList.children.length) {
          cardsList.insertBefore(
            reorderedCard,
            cardsList.children[currentDisplayed + 1]
          );
        } else {
          cardsList.appendChild(reorderedCard);
        }
      } else if (sortingDirection === 'left') {
        cardsList.insertBefore(
          reorderedCard,
          cardsList.children[currentDisplayed]
        );
      }
      reorderedCard.style.MozTransform = '';
      reorderedCard.dataset['edit'] = 'false';
      reorderedCard = null;

      alignCurrentCard();

      // remove the app origin from ordering array
      userSortedApps.splice(
        userSortedApps.indexOf(element.dataset.origin),
        1
      );
      // and put in on the new position
      userSortedApps.splice(currentDisplayed, 0, element.dataset.origin);
    }
  }

  function manualOrderStart(evt) {
    evt.preventDefault();
    reorderedCard = evt.target;
    allowScrollingWhileSorting = true;
    if (reorderedCard.classList.contains('card')) {
      dragMargin = reorderedCard.offsetLeft;
      reorderedCard.dataset['edit'] = true;
      sortingDirection = 'left';
    }
  }

  window.addEventListener('applicationuninstall',
    function removeUninstaledApp(evt) {
      var origin = evt.detail.application.origin;
      if (userSortedApps.indexOf(origin) !== -1) {
        userSortedApps.splice(userSortedApps.indexOf(origin), 1);
      }
    },
  false);

  function cv_handleEvent(evt) {
    switch (evt.type) {
      case 'mousedown':
        onStartEvent(evt);
        break;

      case 'mousemove':
        onMoveEvent(evt);
        break;

      case 'mouseup':
      case 'swipe':
        onEndEvent(evt);
        break;

      case 'contextmenu':
        manualOrderStart(evt);
        break;

      case 'home':
        if (!cardSwitcherIsShown())
          return;

        evt.stopImmediatePropagation();
        hideCardSwitcher();
        break;

      case 'lock':
      case 'attentionscreenshow':
        attentionScreenApps = AttentionScreen.getAttentionScreenOrigins();
        hideCardSwitcher();
        break;

      case 'attentionscreenhide':
        attentionScreenApps = AttentionScreen.getAttentionScreenOrigins();
        break;

      case 'holdhome':
        if (LockScreen.locked)
          return;

        SleepMenu.hide();
        showCardSwitcher();
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
window.addEventListener('holdhome', CardsView);
window.addEventListener('home', CardsView);
window.addEventListener('appopen', CardsView);

