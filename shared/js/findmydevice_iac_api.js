/* exported IAC_API_WAKEUP_REASON_ENABLED_CHANGED */
/* exported IAC_API_WAKEUP_REASON_TRY_DISABLE */
/* exported IAC_API_WAKEUP_REASON_LOGIN */
/* exported IAC_API_WAKEUP_REASON_LOGOUT */
/* exported IAC_API_WAKEUP_REASON_STALE_REGISTRATION */
/* exported IAC_API_KEYWORD_WAKEUP */
/* exported IAC_API_KEYWORD_TEST */
/* exported wakeUpFindMyDevice */

'use strict';

const IAC_API_WAKEUP_REASON_ENABLED_CHANGED = 0;
const IAC_API_WAKEUP_REASON_STALE_REGISTRATION = 1;
const IAC_API_WAKEUP_REASON_LOGIN = 2;
const IAC_API_WAKEUP_REASON_LOGOUT = 3;
const IAC_API_WAKEUP_REASON_TRY_DISABLE = 4;

const IAC_API_KEYWORD_WAKEUP = 'findmydevice-wakeup';
const IAC_API_KEYWORD_TEST = 'findmydevice-test';

function wakeUpFindMyDevice(reason, keyword) {
  if (!keyword) {
    keyword = IAC_API_KEYWORD_WAKEUP;
  }
  navigator.mozApps.getSelf().onsuccess = function() {
    var app = this.result;
    app.connect(keyword).then(function(ports) {
      ports[0].postMessage(reason);
    });
  };
}
