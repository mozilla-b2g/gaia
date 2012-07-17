
'use strict';

(function initScrollbar(doc) {
  var jumper = doc.querySelector('.view-jumper');
  jumper.addEventListener('mousedown', scrollTo);
  jumper.addEventListener('mousemove', scrollTo);

  var scrollable = doc.querySelector('.view-body-inner');
  var overlay = doc.querySelector('.view-jumper-current');

  var alphabet = [];
  for (var i = 65; i <= 90; i++) {
    alphabet.push({ letter: String.fromCharCode(i) });
  }
  utils.templates.append(doc.querySelector('.view-jumper-inner'), alphabet);

  var overlayTimeout = 0;
  var previous = null;

  function scrollTo(evt) {
    evt.preventDefault();
    evt.stopPropagation();

    var current = evt.target.textContent;
    if (!current || overlay.textContent === current) {
      return;
    }

    var groupContainer = doc.querySelector('#group-' + current);
    if (!groupContainer || groupContainer.clientHeight <= 0)
      return;

    scrollable.scrollTop = groupContainer.offsetTop;
    overlay.textContent = current;
    overlay.classList.remove('hide');

    clearTimeout(overlayTimeout);
    overlayTimeout = setTimeout(function hideOverlay() {
      overlay.classList.add('hide');
    }, 3000);
  }
})(document);

