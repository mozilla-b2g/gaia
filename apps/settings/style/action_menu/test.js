
window.addEventListener('DOMContentLoaded', function() {
  var dialog = document.querySelector('form');

  // dialog.hidden = false;
  dialog.onsubmit = function forget(event) {
    console.log(event.target.innerHTML);
    dialog.hidden = true;
    return false;
  };

  dialog.onreset = function cancel() {
    dialog.hidden = true;
  };

});

