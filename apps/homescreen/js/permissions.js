function permissionPrompt(aRequest, grantcallback, denycallback) {
  // These are the UI elements we work with
  var screen = document.getElementById('permissionscreen');
  var messagediv = document.getElementById('permissionmessage');
  var grantbuton = document.getElementById('permissionnow');
  var denybutton = document.getElementById('permissiondelay');
  var timeout = null;

  // If there is already a pending updaes request, return
  if (screen.classList.contains('visible')) {
    return;
  }

  // Put the message in the dialog.
  // Note plain text since this may include text from
  // untrusted app manifests, for example.
  messagediv.textContent = aRequest.uri + "would like access to "+aRequest.type;

  // Set event listeners for the yes and no buttons
  grantbutton.addEventListener('click', clickHandler);
  denybutton.addEventListener('click', clickHandler);

  // Make the screen visible
  screen.classList.add('visible');

  // This is the event listener function for the buttons
  function clickHandler(e) {
    // cleanup the event handlers
    grantbutton.removeEventListener('click', clickHandler);
    denybutton.removeEventListener('click', clickHandler);

    // Hide the dialog
    screen.classList.remove('visible');

    // Call the appropriate callback, if it is defined
    if (e.target === grantbutton) {
      if (grantcallback)
        grantcallback();
    } else {
      if (denycallback)
        denycallback();
    }
  }
};
