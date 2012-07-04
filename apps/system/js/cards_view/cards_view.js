/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

//
// CardsView is responsible for managing opened apps
//

'use strict';

var CardsView = (function() {

  //display icon of an app on top of app's card
  var DISPLAY_APP_ICON = true;
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

  var cardsView = document.getElementById('cardsView');
  var cardsList = cardsView.getElementsByTagName('ul')[0];
  var displayedApp;
  var runningApps;
  var currentDisplayed = 0;
  var HVGA = document.documentElement.clientWidth < 480;

  /*
   * Returns an icon URI
   *
   * @param{String} the app's origin
   */
  function getIconURI(origin) {
    var icons = runningApps[origin].manifest.icons;

    var sizes = Object.keys(icons).map(function parse(str) {
      return parseInt(str, 10);
    });

    sizes.sort(function(x, y) { return y - x; });

    var index = sizes[(HVGA) ? sizes.length - 1 : 0];
    
    if (icons[index].indexOf('data:') !== 0) {
      icons[index] = origin + icons[index];
    }
    
    return icons[index];
  }

  // Build and display the card switcher overlay
  // Note that we rebuild the switcher each time we need it rather
  // than trying to keep it in sync with app launches.  Performance is
  // not an issue here given that the user has to hold the HOME button down
  // for one second before the switcher will appear.
  function showCardSwitcher() {
    // Apps info from WindowManager
    displayedApp = WindowManager.getDisplayedApp();
    runningApps = WindowManager.getRunningApps();
    currentDisplayed = 0;

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
    } else {
      // user ordering actions
    }

    if (SNAPPING_SCROLLING) {
      cardsView.style.overflow = 'hidden'; //disabling native scrolling
    }

    if (SNAPPING_SCROLLING || MANUAL_CLOSING) {
      cardsView.addEventListener('mousedown', this);
    }

    // First add an item to the cardsList for each running app
    for (var origin in runningApps)
      addCard(origin, runningApps[origin]);

    // Then make the cardsView overlay active
    cardsView.classList.add('active');

    // Make sure we're in portrait mode
    screen.mozLockOrientation('portrait');

    // If there is a displayed app, take keyboard focus away
    if (displayedApp)
      runningApps[displayedApp].frame.blur();

    function addCard(origin, app) {
      // Build a card representation of each window.
      // And add it to the card switcher
      var card = document.createElement('li');
      card.classList.add('card');
      card.style.background = '-moz-element(#' + app.frame.id + ') no-repeat';
      card.dataset['origin'] = origin;

      //display app icon on the tab
      if (DISPLAY_APP_ICON) {
        var appIcon = document.createElement('img');

        appIcon.classList.add('appIcon');
        appIcon.src = getIconURI(origin);
        card.appendChild(appIcon);
      }

      var title = document.createElement('h1');
      title.textContent = app.name;
      card.appendChild(title);
      cardsList.appendChild(card);

      // Set up event handling
      // A click elsewhere in the card switches to that task
      card.addEventListener('click', runApp);
    }
  }

  function runApp() {
    hideCardSwitcher();
    WindowManager.launch(this.dataset['origin']);
  }

  function hideCardSwitcher() {
    // Make the cardsView overlay inactive
    cardsView.classList.remove('active');

    // And remove all the cards from the document.
    cardsList.textContent = '';

    // If there is a displayed app, give the keyboard focus back
    // And switch back to that's apps orientation
    if (WindowManager.getDisplayedApp()) {
      runningApps[displayedApp].frame.focus();
      WindowManager.setOrientationForApp(displayedApp);
    }
  }

  function cardSwitcherIsShown() {
    return cardsView.classList.contains('active');
  }

  //scrolling cards
  var initialCardViewPosition;
  var initialTouchPosition = {};
  var threshold = window.innerWidth / 4;
      // Distance after which dragged card starts moving
  var moveCardThreshold = window.innerHeight / 6;
  var removeCardThreshold = window.innerHeight / 4;

  function alignCard(number) {
    cardsView.scrollLeft = cardsList.children[number].offsetLeft;
  }

  function onStartEvent(evt) {
    evt.stopPropagation();
    cardsView.addEventListener('mousemove', CardsView);
    cardsView.addEventListener('mouseup', CardsView);

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
        evt.target.style.MozTransform = 'scale(0.6) translate(0, -' +
                                        differenceY + 'px)';
      }
    }

    if (SNAPPING_SCROLLING) {
      var differenceX = initialTouchPosition.x - touchPosition.x;
      cardsView.scrollLeft = initialCardViewPosition + differenceX;
    }
  }

  function onEndEvent(evt) {
    evt.stopPropagation();
    var element = evt.target;
    cardsView.removeEventListener('mousemove', CardsView);
    cardsView.removeEventListener('mouseup', CardsView);

    var touchPosition = {
        x: evt.touches ? evt.touches[0].pageX : evt.pageX,
        y: evt.touches ? evt.touches[0].pageY : evt.pageY
    };

    // if the element we start dragging on is a card
    if (evt.target.classList.contains('card') && MANUAL_CLOSING) {
      var differenceY = initialTouchPosition.y - touchPosition.y;
      if (differenceY > removeCardThreshold) {
        // Without removing the listener before closing card
        // sometimes the 'click' event fires, even if 'mouseup'
        // uses stopPropagation()
        element.removeEventListener('click', runApp);

        // Remove the icon from the task list
        cardsList.removeChild(element);

        // Stop the app itself
        // If the app is the currently displayed one,
        // this will also switch back to the homescreen
        // (though the task switcher will still be displayed over it)
        WindowManager.kill(element.dataset['origin']);

        // if there are no more running apps, then dismiss
        // the task switcher
        if (WindowManager.getNumberOfRunningApps() === 0)
          hideCardSwitcher();

        return;
      } else {
        evt.target.style.MozTransform = 'scale(0.6)';
      }
    }

    if (SNAPPING_SCROLLING) {
      var differenceX = initialTouchPosition.x - touchPosition.x;
      if (Math.abs(differenceX) > threshold) {
        if (
          differenceX > 0 &&
          currentDisplayed < WindowManager.getNumberOfRunningApps() - 1
        ) {
          currentDisplayed++;
          alignCard(currentDisplayed);
        } else if (differenceX < 0 && currentDisplayed > 0) {
          currentDisplayed--;
          alignCard(currentDisplayed);
        }
      } else {
        alignCard(currentDisplayed);
      }
    }
  }

  function cv_handleEvent(evt) {
    switch (evt.type) {
      case 'mousedown':
        onStartEvent(evt);
        break;
      case 'mousemove':
        onMoveEvent(evt);
        break;
      case 'mouseup':
        onEndEvent(evt);
        break;
    }
  }
  // Public API of CardsView
  return {
    showCardSwitcher: showCardSwitcher,
    hideCardSwitcher: hideCardSwitcher,
    cardSwitcherIsShown: cardSwitcherIsShown,
    handleEvent: cv_handleEvent
  };
})();
