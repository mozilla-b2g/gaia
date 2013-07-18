'use strict';

var FixedHeader = (function FixedHeader() {
  var selector;
  var view;
  var fixedContainer;
  var currentlyFixed;
  var notApplyEffect;
  var refreshTimeout;

  /**
   * Start listening scroll event, and applying the fixed header effect
   * @param  {String} scrollView HTML element that is going to be scrolled.
   * @param  {String} container  HTML element that is
   *                             going to contain the top header.
   * @param  {String} select     Selector of the headers to be checked.
   */
  var init = function init(scrollView, container, select, noEffect) {
    selector = select;
    view = document.querySelector(scrollView);
    fixedContainer = document.querySelector(container);
    refresh();
    view.addEventListener('scroll', refresh);
    notApplyEffect = typeof noEffect === 'undefined' ? false : noEffect;
    refreshTimeout = null;
  };

  var refresh = function refresh() {
    if (refreshTimeout === null) {
      refreshTimeout = setTimeout(immediateRefresh);
    }
  };

  function immediateRefresh() {
    if (!view) {
      // init was not called yet
      return;
    }

    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }
    refreshTimeout = null;

    var headings = view.querySelectorAll(selector);

    var currentScroll = view.scrollTop;
    for (var i = headings.length - 1; i >= 0; i--) {
      var currentHeader = headings[i];
      var headingPosition = currentHeader.offsetTop - view.offsetTop;
      var offset = headingPosition - currentScroll;
      var currentHeight = currentHeader.offsetHeight;
      var differentHeaders = currentlyFixed != currentHeader;

      // Effect
      if (!notApplyEffect && Math.abs(offset) < currentHeight &&
          differentHeaders) {
        var toMove = Math.abs(offset) - currentHeight;
        var inEffect = toMove <= 0;
        var translateTop = 'translateY(' + toMove + 'px)';
        var transform = inEffect ? translateTop : null;
        fixedContainer.style.transform = transform;
      }

      // Found a header
      if (offset <= 0) {
        if (differentHeaders) {
          if (!notApplyEffect) {
            fixedContainer.style.transform = 'translateY(0)';
          }

          currentlyFixed = currentHeader;
          updateHeaderContent();
        }

        return;
      }
    }

    // guess no header is above the top of the view
    currentlyFixed = null;
    if (!notApplyEffect) {
      fixedContainer.style.transform = 'translateY(-100%)';
    }
  }

  function updateHeaderContent() {
    if (fixedContainer && currentlyFixed) {
      var newContent = currentlyFixed.textContent;
      if (fixedContainer.textContent !== newContent) {
        fixedContainer.textContent = newContent;
      }
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
