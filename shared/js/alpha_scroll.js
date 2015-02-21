
'use strict';

var utils = window.utils || {};

if (!utils.alphaScroll) {
  (function initScrollbar(doc) {
    var alphaScroll = utils.alphaScroll = {};

    var scrollToCallback, jumper, overlay,
        overlayStyle, groupSelector, liSearch, liFavorites;

    var isScrolling = false;
    var alreadyRendered = false;
    var isDesktop = false;

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

    var offset = 0, lastY = 0;

    var isTouch = 'ontouchstart' in window;
    var touchstart = isTouch ? 'touchstart' : 'mousedown';
    var touchmove = isTouch ? 'touchmove' : 'mousemove';
    var touchend = isTouch ? 'touchend' : 'mouseup';

    var getY = (function getYWrapper() {
      return isTouch ? function(e) { return e.touches[0].pageY; } :
                       function(e) { return e.pageY; };
    })();

    var getTarget = (function getTargetWrapper() {
      if (isTouch) {
        return function(e) {
          var touch = e.touches[0];
          return document.elementFromPoint(touch.pageX, touch.pageY);
        };
      } else {
        return function(e) {
          return e.target;
        };
      }
    })();

    alphaScroll.init = function(params, desktop) {
      isDesktop = params && params.desktop;
      if (alreadyRendered && !isDesktop) {
        return;
      }
      scrollToCallback = params[P_SCROLLTO_CB];
      jumper = params[P_JUMPER];
      overlay = params[P_OVERLAY];
      groupSelector = params[P_GROUP_SELECTOR];

      overlay.textContent = '';
      overlayStyle = overlay.style;

      jumper.addEventListener(touchstart, scrollStart);
      jumper.addEventListener(touchmove, scrollTo);
      jumper.addEventListener(touchend, scrollEnd);

      // Determine if the content for this scrollbar is statically defined
      // in the index.html.  If there are no templates, then do not attempt
      // to render it.
      if (typeof jumper === 'string') {
        jumper = document.querySelector(jumper);
      }
      var template = jumper.querySelector('*[data-template]');
      if (!template) {
        alreadyRendered = true;
        return;
      }

      // Otherwise render the content via templating.
      var frag = document.createDocumentFragment();
      var alphabet = [];
      for (var i = 65; i <= 90; i++) {
        alphabet.push({ anchor: String.fromCharCode(i) });
      }
      alphabet.push({
        anchor: '#'
      });
      utils.templates.append(jumper, alphabet, frag);
      jumper.appendChild(frag);

      alreadyRendered = true;
    };

    // Provide a mechanism to hide/show groups at will
    alphaScroll.showGroup = function(name) {
      var selector = '[data-anchor="group-'+ name + '"]';
      var group = jumper.querySelector(selector);
      if (group) {
        group.classList.remove('hide');
      }
    };

    alphaScroll.hideGroup = function(name) {
      var selector = '[data-anchor="group-'+ name + '"]';
      var group = jumper.querySelector(selector);
      if (group) {
        group.classList.add('hide');
      }
    };

    function hideExtraItems(value) {
      if (!liSearch) {
        liSearch = jumper.querySelector('li[data-anchor="search-container"]');
      }

      if (!liFavorites) {
        liFavorites = jumper.querySelector('li[data-anchor="group-favorites"]');
      }

      liSearch.hidden = value;
      liFavorites.hidden = value;
    }

    alphaScroll.toggleFormat = function(type) {
      hideExtraItems(type === 'short');
    };

    function scrollTo(evt) {
      evt.preventDefault();
      evt.stopPropagation();

      if (!isScrolling) {
        return;
      }

      var currentY = getY(evt);
      // We set the threshold of updating the shortcut to half of the offset
      // to avoid when touch already moved to center of the certain letter but
      // shows another letter.
      if (Math.abs(lastY - currentY) < offset / 2 && !isDesktop) {
        return;
      }

      lastY = currentY;

      var elem = getTarget(evt);
      if (!elem) {
        return;
      }

      var dataset = elem.dataset;
      // Render
      if (dataset.letter) {
        overlay.textContent = dataset.letter;
      } else if (dataset.img) {
        overlay.textContent = '';
        var img = new Image();
        img.src = 'style/images/' + dataset.img;
        overlay.appendChild(img);
      }

      // The headers are sticky, and can have wrong offsetTop,
      // so scroll to the top of each section on jump click.
      var anch = dataset.anchor;
      var selector = anch === 'group-#' ? 'group-und' : anch;
      var domTarget = doc.querySelector('#section-' + selector +
        ', #' + selector);
      if (!domTarget) {
        return;
      }

      scrollToCallback(domTarget, selector.replace('group-', ''));
    }

    function scrollStart(evt) {
      var dataset = getTarget(evt).dataset;
      evt.preventDefault();
      evt.stopPropagation();

      // There is no need to show overlay if the target doesn't contain
      // any valid data for overlay block.
      if (!dataset.letter && !dataset.img) {
        return;
      }

      offset = offset || jumper.querySelector('[data-anchor]').offsetHeight;
      overlayStyle.MozTransitionDelay = RESET_TRANSITION;
      overlayStyle.MozTransitionDuration = RESET_TRANSITION;
      overlayStyle.opacity = '1';
      isScrolling = true;

      scrollTo(evt);
    }

    function scrollEnd(evt) {
      evt.preventDefault();
      evt.stopPropagation();
      var transitionDelay = TRANSITION_DELAY;
      var transitionDuration = TRANSITION_DURATION;
      // In the case of the scroll ending when we are at the
      // bottom or the top, remove the transition inmediately
      if (overlay.textContent === '#' || overlay.textContent === '') {
        transitionDelay = RESET_TRANSITION;
        transitionDuration = RESET_TRANSITION;
      }
      overlayStyle.MozTransitionDelay = transitionDelay;
      overlayStyle.MozTransitionDuration = transitionDuration;
      overlayStyle.opacity = '0';
      overlay.textContent = null;
      isScrolling = false;
      lastY = 0;
    }

    // Cache images refered in 'data-img'es
    (function(doc) {
      var images = doc.querySelectorAll('li[data-img]');
      Object.keys(images).forEach(function(value) {
        var img = new Image();
        img.src = 'contacts/style/images/' + images[value].dataset.img;
      });
    }(doc));

  })(document);
}
