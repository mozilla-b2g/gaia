function requestUpdates(aUpdate, nowcallback, delaycallback) {
  dump("#####updates.js:requestUpdates\n");
  // These are the UI elements we work with
  var screen = document.getElementById('updatesscreen');
  var messagediv = document.getElementById('updatesmessage');
  var nowbutton = document.getElementById('updatesnow');
  var delaybutton = document.getElementById('updatesdelay');
  var timeout = null;

  dump("#####updates.js:requestUpdates screen="+screen.toString()+"\n");
  dump("#####updates.js:requestUpdates messagediv="+messagediv.toString()+"\n");
  dump("#####updates.js:requestUpdates nowbutton="+nowbutton.toString()+"\n");
  dump("#####updates.js:requestUpdates delaybutton="+delaybutton.toString()+"\n");
  // If there is already a pending updaes request, return
  if (screen.classList.contains('visible')) {
    dump("#####updates.js:requestUpdates UpdatesScreen is already visible\n");
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
  screen.visibility = true;
  messagediv.visibility = true;
  nowbutton.visibility = true;
  delaybutton.visibility = true;

  dump("#####updates.js:requestUpdates setting no response timeout\n");
  timeout = window.setTimeout(clickHandler, 60*1000);

  // This is the event listener function for the buttons
  function clickHandler(e) {
    dump("#####updates.js:clickHandler\n");
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
      dump("#####updates.js:clickHandler nowbutton selected\n");
      if (nowcallback)
        nowcallback();
    } else {
      dump("#####updates.js:clickHandler delaybutton selected\n");
      if (delaycallback)
        delaycallback();
    }
  }
};
