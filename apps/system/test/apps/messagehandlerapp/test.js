'use strict';
(function() {
    var data = null;
    var index = 0;

    navigator.mozSetMessageHandler('notification', function(m) {
      data = m;
      var p = document.createElement('p');
      p.textContent = 'Message ' + (index++) + ': ' + JSON.stringify(m);
      document.body.appendChild(p);
    });

    window.getLastMessageData = function() {
      return data;
    };
})();
