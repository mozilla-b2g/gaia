/*exported FixedHeader */

'use strict';

var FixedHeader = (function FixedHeader() {
  var selector;
  var view;
  var fixedContainer;
  var fixedContainerHeight;
  var currentlyFixed;
  var refreshTimeout;

  var hideClass = 'no-fixed-header';

  // matches(element, selector)
  var matches = document.documentElement.matches ||
    document.documentElement.mozMatchesSelector ||
    document.documentElement.webkitMatchesSelector ||
    document.documentElement.msMatchesSelector;
  matches = matches.call.bind(matches);

  /**
   * Start listening scroll event, and applying the fixed header effect
   * @param  {String} scrollView HTML element that is going to be scrolled.
   * @param  {String} container  HTML element that is
   *                             going to contain the top header.
   * @param  {String} select     Selector of the headers to be checked.
   */
  var init = function init(scrollView, container, select) {
    selector = select;
    view = document.querySelector(scrollView);
    fixedContainer = document.querySelector(container);
    fixedContainerHeight = fixedContainer.offsetHeight;
    refresh();
    view.addEventListener('scroll', refresh);
    refreshTimeout = null;
  };

  var refresh = function refresh() {
    if (refreshTimeout === null) {
      refreshTimeout = setTimeout(immediateRefresh);
    }
  };

  function findNextHeader(header) {
    var nextHeader = header;
    do {
      nextHeader = nextHeader.nextElementSibling;
    } while (nextHeader && !matches(nextHeader, selector));

    return nextHeader;
  }

  function immediateRefresh() {
    if (!view) {
      // init was not called yet
      return;
    }

    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }
    refreshTimeout = null;

    findFixedHeader();
    updatePosition();
  }

  function findFixedHeader() {
    var currentHeader = view.querySelector(selector);
    if (!currentHeader) {
      // empty list
      setCurrentlyFixed(null);
      return;
    }

    var prevHeader, newFixed;
    var viewPadding = currentHeader.offsetTop - view.offsetTop;

    do {
      var currentScroll = view.scrollTop;
      var headingPosition = currentHeader.offsetTop - view.offsetTop;
      var offset = headingPosition - currentScroll - viewPadding;

      // Found a header that's below the top
      // the fixed header should be the previous one
      // unless it's the first one
      if (offset > 0) {
        newFixed = prevHeader || currentHeader;
        break;
      }

      prevHeader = currentHeader;
    } while ((currentHeader = findNextHeader(currentHeader)));

    // if we found no header below the top, this means the last one should be
    // fixed
    setCurrentlyFixed(newFixed || prevHeader);
  }

  function updatePosition() {
    if (!currentlyFixed) {
      fixedContainer.classList.add(hideClass);
      return;
    }

    var nextHeader = findNextHeader(currentlyFixed);
    if (!nextHeader) {
      fixedContainer.style.transform = null;
      return;
    }

    var viewPadding = view.querySelector(selector).offsetTop - view.offsetTop;
    var currentScroll = view.scrollTop;
    var headingPosition = nextHeader.offsetTop - view.offsetTop;
    var offset = headingPosition - currentScroll - viewPadding;

    if (offset < fixedContainerHeight) {
      var toMove = offset - fixedContainerHeight;
      fixedContainer.style.transform = 'translateY(' + toMove + 'px)';
    } else {
      fixedContainer.style.transform = null;
    }
  }

  function setCurrentlyFixed(newFixed) {
    if (newFixed !== currentlyFixed) {
      currentlyFixed = newFixed;
      updateHeaderContent();
    }
  }

  function updateHeaderContent() {
    if (!fixedContainer) {
      return;
    }

    if (currentlyFixed) {
      var newContent = currentlyFixed.textContent;
      if (fixedContainer.textContent !== newContent) {
        fixedContainer.textContent = newContent;
      }
      fixedContainer.classList.remove(hideClass);
    } else {
      fixedContainer.classList.add(hideClass);
    }
  }

  var stop = function stop() {
    view.removeEventListener('scroll', refresh);
  };

  return {
    init: init,
    refresh: refresh,
    updateHeaderContent: updateHeaderContent,
    stop: stop
  };
})();
