
'use strict';

(function initScrollbar(doc) {
  var jumper = doc.querySelector('#shortcuts ol');
  jumper.addEventListener('mousedown', scrollStart);
  jumper.addEventListener('mousemove', scrollTo);
  jumper.addEventListener('mouseleave', scrollEnd);
  jumper.addEventListener('mouseup', scrollEnd);

  var scrollable = doc.querySelector('#mainContent');
  var overlayContent, overlay;
  overlayContent = overlay = doc.querySelector('#shortcuts #current');
  overlayContent.innerHTML = '&nbsp;';
  var overlayStyle = overlay.style;

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
    scrollTo(evt);
  }

  function scrollEnd(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    overlayStyle.MozTransitionDelay = '0.3s';
    overlayStyle.MozTransitionDuration = '0.2s';
    overlayStyle.opacity = '0';
  }

  function scrollTo(evt) {
    evt.preventDefault();
    evt.stopPropagation();

    var current = evt.target.dataset.letter;
    if (previous === current) {
      return;
    }

    var groupContainer = doc.querySelector('#group-' + current);
    if (!groupContainer || groupContainer.clientHeight <= 0)
      return;

    overlayContent.textContent = current;

    previous = current;

    scrollable.scrollTop = groupContainer.offsetTop -
                          document.querySelector('header').clientHeight -
                          document.querySelector('p#mfriends').clientHeight;

  }

})(document);
