'use strict';

document.body.addEventListener('click', onButtonClick);

function onButtonClick(e) {
  var target = e.target;
  if (target.tagName !== 'BUTTON') {
    return;
  }

  var section = findSection(target);
  var style = section.className;

  if (target.classList.contains('js-delayed')) {
    setTimeout(sendAlert.bind(null, style), 10000);
  } else {
    sendAlert(style);
  }
}

function findSection(elt) {
  while (elt && elt.nodeName !== 'SECTION') {
    elt = elt.parentNode;
  }

  return elt;
}

function sendAlert(style) {
  var title = 'Emergency Alert';
  var body =
    'Tornado warning in this area until 6.00pm PST Monday. Prepare. ' +
    'Avoid travel. Check media.';

  var url = [
    'attention.html?title=',
    encodeURIComponent(title),
    '&body=',
    encodeURIComponent(body),
    '&style=',
    encodeURIComponent(style)
  ].join('');

  window.open(url, '_blank', 'attention');
  window.close();
}
