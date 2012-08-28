
'use strict';

var utils = window.utils || {};

if (!utils.alphaScroll) {
  (function initScrollbar(doc) {
    var alphaScroll = utils.alphaScroll = {};

    var scrollToCallback, jumper, overlay, overlayContent, overlayStyle;

    var isScrolling = false;

    var overlayTimeout = 0, scrollToTimeout = 0;
    var previous = null;

    var P_SCROLLTO_CB = 'scrollToCb';
    var P_JUMPER = 'jumper';
    var P_OVERLAY = 'overlay';
    var P_OVERLAY_CONTENT = 'overlayContent';

    alphaScroll.init = function(params) {
      scrollToCallback = params[P_SCROLLTO_CB];
      jumper = params[P_JUMPER];
      overlay = params[P_OVERLAY];
      overlayContent = params[P_OVERLAY_CONTENT];

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
      utils.templates.append(jumper, alphabet);
    }

    function scrollStart(evt) {
      overlayStyle.MozTransitionDelay = '0s';
      overlayStyle.MozTransitionDuration = '0s';
      overlayStyle.opacity = '1';
      isScrolling = true;
      scrollTo(evt);
    }

    function scrollEnd(evt) {
      evt.preventDefault();
      evt.stopPropagation();
      overlayStyle.MozTransitionDelay = '0.3s';
      overlayStyle.MozTransitionDuration = '0.2s';
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

      var groupContainer = doc.querySelector('#group-' + current);
      if (!groupContainer || groupContainer.clientHeight <= 0)
        return;

      previous = current;

      scrollToCallback(groupContainer);
    }

  })(document);
}
