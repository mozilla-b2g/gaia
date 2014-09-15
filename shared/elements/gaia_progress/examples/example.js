'use strict';

var toggle = document.getElementById('toggle');
var progress2 = document.getElementById('progress2');

toggle.addEventListener('click', function() {
  var animating = progress2.hasAttribute('animated');
  if (animating) {
    progress2.stop();
  } else {
    progress2.start();
  }
});
