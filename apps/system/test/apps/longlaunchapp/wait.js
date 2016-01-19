'use strict';
(function() {
  if(new Date().getTime() < window.startTime + window.launchDuration) {
    var i = 10000;
    var x;
    while (i--) { /* wasting some time */ x = Math.sqrt(i); }
    window.sleepOn();
  } else {
    window.sayDone();
  }
})();
