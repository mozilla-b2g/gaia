'use strict';

var result = document.getElementById('result');

var elements = document.querySelectorAll('gaia-radio');

[].forEach.call(elements, function(radio, index) {
  radio.addEventListener('click', function(e) {
    result.textContent = 'Click event for: ' + (index + 1) + ' value: ' +
      e.target.checked;
  });

});
