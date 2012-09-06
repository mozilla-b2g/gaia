
'use strict';

var utils = window.utils || {};

if (!utils.alphaScroll) {
  (function initScrollbar(doc) {
    var alphaScroll = utils.alphaScroll = {};

    var scrollToCallback, jumper, overlay,
        overlayContent, overlayStyle, groupSelector;

    var isScrolling = false;

    var overlayTimeout = 0, scrollToTimeout = 0;
    var previous = null;

    // Callback invoked when scrolling is neded
    var P_SCROLLTO_CB = 'scrollToCb';
    // Element that represents the alpha scroll bar
    var P_JUMPER = 'jumper';
    // Element that shows the current letter
    var P_OVERLAY = 'overlay';
    // Element that has the content of the current letter
    // (can point to the same as overlay content)
    var P_OVERLAY_CONTENT = 'overlayContent';
    // Selector that will allow to get the group that should be scrolled to
    // Group will be identified by this selector plus the corresponding letter
    var P_GROUP_SELECTOR = 'groupSelector';

    var TRANSITION_DELAY = '0.3s';
    var TRANSITION_DURATION = '0.2s';

    var RESET_TRANSITION = '0s';

    alphaScroll.init = function(params) {
      scrollToCallback = params[P_SCROLLTO_CB];
      jumper = params[P_JUMPER];
      overlay = params[P_OVERLAY];
      overlayContent = params[P_OVERLAY_CONTENT];
      groupSelector = params[P_GROUP_SELECTOR];

      overlayContent.textContent = '';
      overlayStyle = overlay.style;

      jumper.addEventListener('mousedown', scrollStart);
      jumper.addEventListener('mousemove', scrollTo);
      jumper.addEventListener('mouseleave', scrollEnd);
      jumper.addEventListener('mouseup', scrollEnd);

      var alphabet = [];
      for (var i = 65; i <= 90; i++) {
        alphabet.push({ letter: String.fromCharCode(i) });
      }
      alphabet.push({ 
        letter: '#'
      });
      utils.templates.append(jumper, alphabet);
    }

    function scrollStart(evt) {
      overlayStyle.MozTransitionDelay = RESET_TRANSITION;
      overlayStyle.MozTransitionDuration = RESET_TRANSITION;
      overlayStyle.opacity = '1';
      isScrolling = true;
      scrollTo(evt);
    }

    function scrollEnd(evt) {
      evt.preventDefault();
      evt.stopPropagation();
      overlayStyle.MozTransitionDelay = TRANSITION_DELAY;
      overlayStyle.MozTransitionDuration = TRANSITION_DURATION;
      overlayStyle.opacity = '0';
      overlayContent.textContent = previous = null;
      isScrolling = false;
    }

    function scrollTo(evt) {
      evt.preventDefault();
      evt.stopPropagation();

      if (!isScrolling) {
        return;
      }

      var current = evt.target.dataset.letter;
      overlayContent.textContent = current || null;

      if (previous === current) {
        return;
      }

      var groupContainer = doc.querySelector(groupSelector + current);
      if (!groupContainer || groupContainer.clientHeight <= 0)
        return;

      previous = current;

      scrollToCallback(groupContainer);
    }

  })(document);
}
