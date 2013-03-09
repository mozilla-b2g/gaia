
'use strict';

var utils = window.utils || {};

if (!utils.alphaScroll) {
  (function initScrollbar(doc) {
    var alphaScroll = utils.alphaScroll = {};

    var scrollToCallback, jumper, overlay,
        overlayStyle, groupSelector;

    var isScrolling = false;

    var overlayTimeout = 0, scrollToTimeout = 0;
    var previous = null;

    // Callback invoked when scrolling is neded
    var P_SCROLLTO_CB = 'scrollToCb';
    // Element that represents the alpha scroll bar
    var P_JUMPER = 'jumper';
    // Element that shows the current letter
    var P_OVERLAY = 'overlay';
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
      groupSelector = params[P_GROUP_SELECTOR];

      overlay.textContent = '';
      overlayStyle = overlay.style;

      jumper.addEventListener('mousedown', scrollStart);
      jumper.addEventListener('mousemove', scrollTo);
      jumper.addEventListener('mouseleave', scrollEnd);
      jumper.addEventListener('mouseup', scrollEnd);

      var alphabet = [];
      for (var i = 65; i <= 90; i++) {
        alphabet.push({ anchor: String.fromCharCode(i) });
      }
      alphabet.push({
        anchor: '#'
      });
      utils.templates.append(jumper, alphabet);
    };

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
      overlay.textContent = previous = null;
      isScrolling = false;
    }

    function scrollTo(evt) {
      var current, querySelector, domTarget, anch;

      evt.preventDefault();
      evt.stopPropagation();

      if (!isScrolling) {
        return;
      }

      current = evt.target.dataset;

      if (previous === current) {
        return;
      }

      // Render
      if (evt.target.dataset.letter) {
        overlay.textContent = evt.target.dataset.letter;
      } else if (evt.target.dataset.img) {
        overlay.textContent = '';
        var img = new Image();
        img.src = 'style/images/' + evt.target.dataset.img;
        overlay.appendChild(img);
      } else {
        overlay.textContent = '';
      }

      anch = current.anchor;
      querySelector = '#' + ((anch == 'group-#') ? 'group-und' : anch);

      domTarget = doc.querySelector(querySelector);
      if (!domTarget || domTarget.clientHeight <= 0)
        return;

      previous = current;

      scrollToCallback(domTarget);
    }

    // Cache images refered in 'data-img'es
    var imgCache = (function(doc) {
      var images = doc.querySelectorAll('li[data-img]');
      Object.keys(images).forEach(function(value) {
        var img = new Image();
        img.src = 'contacts/style/images/' + images[value].dataset.img;
      });
    }(doc));

  })(document);
}
