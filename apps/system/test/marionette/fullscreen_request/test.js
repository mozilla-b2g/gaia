'use strict';

var trigger = document.getElementById('fullscreen');
trigger.addEventListener('click', function(e) {
  e.stopPropagation();
  e.preventDefault();
  document.documentElement.mozRequestFullScreen();
});
