'use strict';
(function() {
    var fakeData = null;

    window.launchDuration = 2000;
    window.startTime = new Date().getTime();

    window.sleepOn = function() {
      var script = document.createElement('script');
      script.src = '/wait.js';
      script.async = false;
      document.head.appendChild(script);
    };

    function print(str) {
      var p = document.createElement('p');
      p.textContent = str;
      document.body.appendChild(p);
    }

    window.sayDone = function() {
      print('DONE!');
    };

    navigator.mozSetMessageHandler('notification', function(m) {
      fakeData = m;
      print('notification: ' + JSON.stringify(m));
    });

    window.getFakeData = function() {
      return fakeData;
    };

    window.sleepOn();
})();
