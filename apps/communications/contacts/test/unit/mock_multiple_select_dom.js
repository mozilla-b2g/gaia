/* exported MockMultipleSelectHTML */
'use strict';

var MockMultipleSelectHTML = (function() {
  var request = new XMLHttpRequest();
  request.open('GET', '/contacts/elements/multiple_select.html', false);
  request.send(null);

  var doc = document.implementation.createHTMLDocument();
  doc.documentElement.innerHTML = request.responseText;
  return doc.querySelector('element template').innerHTML;
})();
