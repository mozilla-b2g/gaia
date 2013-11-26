'use strict';

function Key(keyname, pagekeys, layoutkeys) {
  var keydata =
    (pagekeys && pagekeys[keyname]) ||
    (layoutkeys && layoutkeys[keyname]) ||
    KeyboardLayout.predefinedKeys[keyname] ||
    {};

  // Copy the key data
  for (var p in keydata) {
    this[p] = keydata[p];
  }

  // Make sure that all key objects have name, keycap and keycmd properties.
  this.name = keyname;
  if (!this.keycap)
    this.keycap = keyname;
  if (!this.keycmd)
    this.keycmd = 'sendkey';

  // If the command is sendkey and we have no keycode, use the first
  // character of the keyname.
  // XXX: should perhpas be keystr instead of keycode;
  // And a different command for sending control keys.
  if (this.keycmd === 'sendkey' && !this.keycode)
    this.keycode = keyname.charCodeAt(0);
}
