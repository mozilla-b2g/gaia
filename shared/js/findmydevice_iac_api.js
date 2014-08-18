/* exported IAC_API_WAKEUP_REASON_ENABLED_CHANGED */
/* exported IAC_API_WAKEUP_REASON_TRY_DISABLE */
/* exported IAC_API_WAKEUP_REASON_LOGIN */
/* exported IAC_API_WAKEUP_REASON_LOGOUT */
/* exported IAC_API_WAKEUP_REASON_STALE_REGISTRATION */
/* exported IAC_API_WAKEUP_REASON_LOCKSCREEN_CLOSED */
/* exported wakeUpFindMyDevice */

'use strict';

const IAC_API_WAKEUP_REASON_ENABLED_CHANGED = 0;
const IAC_API_WAKEUP_REASON_STALE_REGISTRATION = 1;
const IAC_API_WAKEUP_REASON_LOGIN = 2;
const IAC_API_WAKEUP_REASON_LOGOUT = 3;
const IAC_API_WAKEUP_REASON_TRY_DISABLE = 4;
const IAC_API_WAKEUP_REASON_LOCKSCREEN_CLOSED = 5;

function wakeUpFindMyDevice(reason) {
  navigator.mozApps.getSelf().onsuccess = function() {
    var app = this.result;
    app.connect('findmydevice-wakeup').then(function(ports) {
      ports[0].postMessage(reason);
    });
  };
}
