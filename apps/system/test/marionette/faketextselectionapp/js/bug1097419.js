'use strict';

window.onload = function() {
  var frame = document.getElementById('bug-iframe');
  frame.contentWindow.document.body.innerHTML = '<input value="testvalue">';
}; 
