'use strict';

// Code for the IMEngine to register itself
IMEManager.IMEngines.jspinying = {

  // init is called when the engine us being loaded.
  // currently it is called during start-up;
  // do not do heavy ops, e.g. populate database.

  init: function jspinying_init(glue) {
    // glue contains three functions:
    // glue.sendString(string)
    //   output string to app
    // glue.sendChoices([[selection, selectionData], ...])
    //   update candidate panel
    //   empty candidate panel to close the panel
    // glue.sendKey(keyCode)
    //   output a key, include control keys such as return and backspace
    // one property is available:
    // glue.path
    //   path to ime dir for getting data using xhr

    // NOTE: Do not attempted to load database in this function,
    // you will slow down start up.
    // Instead, add checks in click() and empty() and start loading
    // database after the keyboard is being requested.

    this.glue = glue;
  },

  // click is called when use presses a key on keyboard.
  // keyCode is a IME defined value in the layout object,
  // default to (key label).charCodeAt(0)

  click: function jspinying_click(keyCode) {

    // a transparent IM Engine simply outputs the key
    this.glue.sendKey(keyCode);
  },

  // click is called when use presses a selection on keyboard.
  // selection and selectionData is defined at glue.sendChoices()

  select: function jspinying_select(selection, selectionData) {
    // transparent IM Engine never invoke the panel,
    // thus never need to process candidate selection
  },

  // empty is called when the keyboard is being switched to
  // and IMEManager requires it to be at an empty state
  // (calibrate with the UI)

  empty: function jspinying_empty() {
    // nothing to do for the transparent IM
  }
};
