
'use strict';

(function initScrollbar(doc) {
  var jumper = doc.querySelector('.view-jumper-inner');
  jumper.addEventListener('mousedown', scrollStart);
  jumper.addEventListener('mousemove', scrollTo);
  jumper.addEventListener('mouseleave', scrollEnd);
  jumper.addEventListener('mouseup', scrollEnd);

  var scrollable = doc.querySelector('#groups-container');
  var overlay = doc.querySelector('.view-jumper-current');
  var overlayContent = doc.querySelector('#current-jumper');
  overlayContent.textContent = '';
  var overlayStyle = overlay.style;

  var isScrolling = false;

  var alphabet = [];
  for (var i = 65; i <= 90; i++) {
    alphabet.push({ letter: String.fromCharCode(i) });
  }
  utils.templates.append(jumper, alphabet);

  var overlayTimeout = 0, scrollToTimeout = 0;
  var previous = null;

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

    scrollable.scrollTop = groupContainer.offsetTop;

  }

})(document);
