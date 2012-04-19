function requestUpdates(aUpdate, nowcallback, delaycallback) {
  // These are the UI elements we work with
  var screen = document.getElementById('updatesscreen');
  var messagediv = document.getElementById('updatesmessage');
  var nowbutton = document.getElementById('updatesnow');
  var delaybutton = document.getElementById('updatesdelay');
  var timeout = null;

  // If there is already a pending updaes request, return
  if (screen.classList.contains('visible')) {
    return;
  }

  // Put the message in the dialog.
  // Note plain text since this may include text from
  // untrusted app manifests, for example.
  messagediv.textContent = "Update "+aUpdate.name+"?";

  // Set event listeners for the yes and no buttons
  nowbutton.addEventListener('click', clickHandler);
  delaybutton.addEventListener('click', clickHandler);

  // Make the screen visible
  screen.classList.add('visible');

  // timeout if no response in 60 seconds
  timeout = window.setTimeout(clickHandler, 60*1000);

  // This is the event listener function for the buttons
  function clickHandler(e) {
    // cleanup the event handlers
    nowbutton.removeEventListener('click', clickHandler);
    delaybutton.removeEventListener('click', clickHandler);
    if (timeout) {
      window.clearTimeout(timeout);
      timeout = null;
    }

    // Hide the dialog
    screen.classList.remove('visible');

    // Call the appropriate callback, if it is defined
    if (e == null || e.target === nowbutton) {
      if (nowcallback)
        nowcallback();
    } else {
      if (delaycallback)
        delaycallback();
    }
  }
};
