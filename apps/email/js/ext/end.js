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

(function () {
  // Send fake API object to allow UI to finish bootstrapping, and finish
  // back-end loading when viewAccounts is called.
  var evtObject = document.createEvent('Event');
  evtObject.initEvent('mailapi', false, false);
  // Create global property too, in case app comes
  // up after the event has fired.
  window.tempMailAPI = evtObject.mailAPI = {
    _fake: true,
    hasAccounts: (document.cookie || '')
                    .indexOf('mailHasAccounts') !== -1,
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