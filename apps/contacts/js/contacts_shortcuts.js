
'use strict';

(function initScrollbar(doc) {
  var jumper = doc.querySelector('.view-jumper-inner');
  jumper.addEventListener('mousedown', scrollTo);
  jumper.addEventListener('mousemove', scrollTo);

  var scrollable = doc.querySelector('#groups-container');
  var overlay = doc.querySelector('.view-jumper-current');
  var overlayContent = doc.querySelector('#current-jumper');
  var overlayStyle = overlay.style;
  overlayStyle.opacity = '0';

  var alphabet = [];
  for (var i = 65; i <= 90; i++) {
    alphabet.push({ letter: String.fromCharCode(i) });
  }
  utils.templates.append(jumper, alphabet);

  var overlayTimeout = 0, scrollToTimeout = 0;
  var previous = null;

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
    overlayStyle.opacity = '1';

    previous = current;

    clearTimeout(overlayTimeout);
    overlayTimeout = setTimeout(function hideOverlay() {
      overlayStyle.opacity = '0';
    }, 1000);

    scrollable.scrollTop = groupContainer.offsetTop;

  }

})(document);
