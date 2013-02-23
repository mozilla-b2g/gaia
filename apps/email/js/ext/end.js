// set location of dynamically loaded layers.
require.config({
  paths: {
    mailapi: 'js/ext/mailapi'
  },
  scriptType: 'application/javascript;version=1.8',
  definePrim: 'prim'
});

// q shim for rdcommon/log, just enough for it to
// work. Just uses defer, promise, resolve and reject.
define('q', ['prim'], function (prim) {
  return {
    defer: prim
  };
});

// Trigger module resolution for backend to start.
// If no accounts, load a fake shim that allows
// bootstrapping to "Enter account" screen faster.
if ((document.cookie || '').indexOf('mailHasAccounts') !== -1) {
  require(['mailapi/same-frame-setup']);
} else {
  (function () {
    var evtObject = document.createEvent('Event');
    evtObject.initEvent('mailapi', false, false);
    // Create global property too, in case app comes
    // up after the event has fired.
    window.tempMailAPI = evtObject.mailAPI = {
      _fake: true,
      useLocalizedStrings: function () {},
      viewAccounts: function () {
        var acctSlice = {
            items: [],
            die: function () {}
        };

        setTimeout(function () {
            if (acctSlice.oncomplete) {
                acctSlice.oncomplete();
            }
            require(['mailapi/same-frame-setup']);
        }, 0);
        return acctSlice;
      }
    };
    window.dispatchEvent(evtObject);
  }());
}
