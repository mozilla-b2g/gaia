'use strict';

document.querySelector('body').classList.add('loaded');

document.getElementById('snapshot').addEventListener('click', function() {
  document.getElementById('result').classList.add('done');
  document.getElementById('result').textContent = 'done';
});
