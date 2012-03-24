var requestPermission = (function() {

  // A queue of pending requests.
  // Callers must be careful not to create an infinite loop!
  var pending = [];

  return function requestPermission(message, yescallback, nocallback) {

    // These are the UI elements we work with
    var screen = document.getElementById('permissionscreen');
    var messagediv = document.getElementById('permissionmessage');
    var yesbutton = document.getElementById('permissionyes');
    var nobutton = document.getElementById('permissionno');

    // If there is already a pending permission request, queue this one
    if (screen.classList.contains('visible')) {
      pending.push({
        message: message,
        yescallback: yescallback,
        nocallback: nocallback
      });
      return;
    }

    // Put the message in the dialog.
    // Note plain text since this may include text from
    // untrusted app manifests, for example.
    messagediv.textContent = message;

    // Set event listeners for the yes and no buttons
    yesbutton.addEventListener('click', clickHandler);
    nobutton.addEventListener('click', clickHandler);

    // Make the screen visible
    screen.classList.add('visible');

    // This is the event listener function for the buttons
    function clickHandler(e) {
      // cleanup the event handlers
      yesbutton.removeEventListener('click', clickHandler);
      nobutton.removeEventListener('click', clickHandler);

      // Hide the dialog
      screen.classList.remove('visible');

      // Call the appropriate callback, if it is defined
      if (e.target === yesbutton) {
        if (yescallback)
          yescallback();
      }
      else {
        if (nocallback)
          nocallback();
      }

      // And if there are pending permission requests, trigger the next one
      if (pending.length > 0) {
        var request = pending.shift();
        setTimeout(function() {
          requestPermission(request.message,
                            request.yescallback,
                            request.nocallback);
        }, 0);
      }
    }
  };
}());
