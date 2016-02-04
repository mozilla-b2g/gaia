/* exported showDialog */
'use strict';

function showDialog(type, message) {
  setTimeout(function() {
    switch(type) {
      case 'alert':
        alert(message);
        break;
      case 'prompt':
        var p = document.querySelector('.description');
        p.innerHTML = p.innerHTML + ' prompted';
        prompt(message);
        p.innerHTML = p.innerHTML + ' and returned';
        break;
      case 'confirm':
        confirm(message);
        break;
    }
  }, 500);
}
// showDialog('prompt', 'prompt');
// showDialog('prompt', 'showDialog');
