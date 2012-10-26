'use strict';

var FixedHeader = (function FixedHeader() {
  var headings;
  var selector;
  var view;
  var fixedContainer;
  var currentlyFixed;

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
    refresh();
    view.addEventListener('scroll', scrolling);
  };

  var refresh = function refresh() {
    headings = view.querySelectorAll(selector);
  };

  var scrolling = function scrolling() {
    var currentScroll = view.scrollTop;
    for (var i = headings.length - 1; i >= 0; i--) {
      var currentHeader = headings[i];
      var headingPosition = currentHeader.offsetTop;
      var offset = headingPosition - currentScroll;
      var currentHeight = currentHeader.offsetHeight;
      var differentHeaders = currentlyFixed != currentHeader;
      // Effect
      if (Math.abs(offset) < currentHeight && differentHeaders) {
        var toMove = Math.abs(offset) - currentHeight;
        var inEffect = toMove <= 0;
        var translateTop = 'translateY(' + toMove + 'px)';
        var transform = inEffect ? translateTop : null;
        fixedContainer.style.transform = transform;
      }

      // Switching Header
      if (offset <= 0) {
        if (differentHeaders) {
          fixedContainer.style.transform = 'translateY(0)';
          currentlyFixed = currentHeader;
          var background = '-moz-element(#' + currentHeader.id + ')';
          fixedContainer.style.backgroundImage = background;
        }
        return;
      }
    }
    currentlyFixed = null;
    fixedContainer.style.transform = 'translateY(-100%)';
  };

  var stop = function stop() {
    view.removeEventListener('scroll', scrolling);
  };

  return {
    'init': init,
    'refresh': refresh,
    'stop': stop
  };
})();
