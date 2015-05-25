/* exported showDialog */
'use strict';

function showDialog(type, message) {
  setTimeout(function() {
    switch(type) {
      case 'alert':
        alert(message);
        break;
      case 'prompt':
        prompt(message);
        break;
      case 'confirm':
        confirm(message);
        break;
    }
  }, 1000);
}
