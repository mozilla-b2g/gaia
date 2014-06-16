'use strict';

var result = document.getElementById('result');

var elements = document.querySelectorAll('gaia-checkbox');

[].forEach.call(elements, function(element, index) {
  element.addEventListener('click', function(e) {
    result.textContent = 'Click event for: ' + (index + 1) + ' value: ' +
      e.target.checked;
  });

});
