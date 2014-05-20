'use strict';

var result = document.getElementById('result');

var elements = document.querySelectorAll('gaia-switch');

[].forEach.call(elements, function(switchEl, index) {
  switchEl.addEventListener('click', function(e) {
    result.textContent = 'Switch event for: ' + (index + 1) + ' value: ' +
      e.target.checked;
  });

});
