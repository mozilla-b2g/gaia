'use strict';

window.addEventListener('load', function() {
  var popup = null;
  var buttons = document.querySelectorAll('button');

  for (var i = 0; i < buttons.length; i++) {
    var button = buttons[i];
    button.addEventListener('click', function(e) {
      var target = e.target;
      var actualWindow = window;
      if (target.classList.contains('mozbrowser')) {
        actualWindow = window.parent;
      }

      switch (target.dataset.action) {
        case 'open':
          var param1 = null,
              param2 = null;
          var hash = target.dataset.url.split('#');
          if (hash.length > 1) {
            param1 = hash[1];
            param2 = hash[1];
          }
          popup = actualWindow.open(target.dataset.url, param1, param2);
          break;
        case 'close':
          popup.close();
          break;
        default:
          break;
      }
    });
  }
});
