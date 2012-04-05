function requestUpdates(aUpdate, allowcallback, delaycallback) {
  dump("******In requestUpdates message="+aUpdate.toString()+"\n");
  // These are the UI elements we work with
  var screen = document.getElementById('updatesscreen');
  var messagediv = document.getElementById('updatesmessage');
  var allowbutton = document.getElementById('updatesallow');
  var delaybutton = document.getElementById('updatesdelay');
  var timeout = null;

  // If there is already a pending updaes request, return
  if (screen.classList.contains('visible')) {
    dump("****** Screen is already visible\n");
    return;
  }

  // Put the message in the dialog.
  // Note plain text since this may include text from
  // untrusted app manifests, for example.
  messagediv.textContent = "Update "+aUpdate.name+"?";

  // Set event listeners for the yes and no buttons
  dump("*****Adding eventListeners\n");
  nowbutton.addEventListener('click', clickHandler);
  delaybutton.addEventListener('click', clickHandler);

  // Make the screen visible
  screen.classList.add('visible');
  screen.visibility = true;
  messagediv.visibility = true;
  allowbutton.visibility = true;
  delaybutton.visibility = true;

  timeout = window.setTimeout(allowcallback, 60*1000);

  // This is the event listener function for the buttons
  function clickHandler(e) {
    // cleanup the event handlers
    dump("***** In clickHandler\n");
    updatebutton.removeEventListener('click', clickHandler);
    delaybutton.removeEventListener('click', clickHandler);
    if (timeout) {
      window.clearTimeout(timeout);
      timeout = null;
    }

    // Hide the dialog
    screen.classList.remove('visible');

    // Call the appropriate callback, if it is defined
    if (e.target === allowbutton) {
      if (yescallback)
        allowcallback();
    }
    else {
      if (delaycallback)
        delaycallback();
    }
  }
};
