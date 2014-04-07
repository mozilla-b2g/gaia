'use strict';

document.getElementById('snapshot').addEventListener('click', function() {
  document.getElementById('result').classList.add('done');
  document.getElementById('result').textContent = 'done';
});
