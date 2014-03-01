'use strict';

window.addEventListener('load', function() {
  var timer = window.setInterval(function() {
    if (!document.mozFullScreen) {
      document.body.mozRequestFullScreen();
    } else {
      window.clearInterval(timer);
      window.alert('Hello alive!');
    }
  }, 1000);
  document.body.classList.add('loaded');
});
