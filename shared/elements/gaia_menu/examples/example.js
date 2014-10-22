console.time("example.js");
'use strict';

(function() {
  var menu = document.getElementById('menu');
  menu.addEventListener('gaiamenu-cancel', function () {
    alert('Cancelled');
  });
})();
console.timeEnd("example.js");
