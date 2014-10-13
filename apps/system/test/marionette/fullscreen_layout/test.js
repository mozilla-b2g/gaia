'use strict';

var trigger = document.getElementById('fullscreen');
trigger.addEventListener('click', function(e) {
  e.stopPropagation();
  e.preventDefault();
  var fsElem = document.getElementById('blue');
  fsElem.mozRequestFullScreen();
});

var blue = document.getElementById('blue');
blue.addEventListener('touchstart', function(e) {
  blue.style.backgroundColor = 'green';
});

blue.addEventListener('touchend', function(e) {
  blue.style.backgroundColor = '';
});
