console.time("dialogs_end_init.js");
'use strict';

var COMMS_APP_ORIGIN = document.location.protocol + '//' +
  document.location.host;

window.opener.postMessage('closed', COMMS_APP_ORIGIN);
window.close();
console.timeEnd("dialogs_end_init.js");
