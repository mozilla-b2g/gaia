// set location of dynamically loaded layers.
require.config({
  paths: {
    mailapi: 'js/ext/mailapi',
    mimelib: 'js/ext/mimelib',

    // mailcomposer is in the mailapi/composer layer.
    mailcomposer: 'js/ext/mailapi/composer',

    'mailparser/mailparser': 'js/ext/mailparser/mailparser',

    // Point activesync protocol modules to their layer
    'wbxml': 'js/ext/mailapi/activesync/protocollayer',
    'activesync/codepages': 'js/ext/mailapi/activesync/protocollayer',
    'activesync/protocol': 'js/ext/mailapi/activesync/protocollayer',

    // activesync/codepages is split across two layers. If
    // activesync/protocol loads first (for autoconfig work on account setup),
    // then indicate the parts of codepages that are in activesync/configurator
    'activesync/codepages/FolderHierarchy':
                                      'js/ext/mailapi/activesync/configurator',
    'activesync/codepages/ComposeMail':
                                      'js/ext/mailapi/activesync/configurator',
    'activesync/codepages/AirSync':
                                      'js/ext/mailapi/activesync/configurator',
    'activesync/codepages/AirSyncBase':
                                      'js/ext/mailapi/activesync/configurator',
    'activesync/codepages/ItemEstimate':
                                      'js/ext/mailapi/activesync/configurator',
    'activesync/codepages/Email':
                                      'js/ext/mailapi/activesync/configurator',
    'activesync/codepages/ItemOperations':
                                      'js/ext/mailapi/activesync/configurator',
    'activesync/codepages/Move':
                                      'js/ext/mailapi/activesync/configurator',

    // Point chew methods to the chew layer
    'mailapi/htmlchew': 'js/ext/mailapi/chewlayer',
    'mailapi/quotechew': 'js/ext/mailapi/chewlayer',
    'mailapi/imap/imapchew': 'js/ext/mailapi/chewlayer',

    // Imap body fetching / parsing / sync
    'mailapi/imap/protocol/sync': 'js/ext/mailapi/imap/protocollayer',
    'mailapi/imap/protocol/textparser': 'js/ext/mailapi/imap/protocollayer',
    'mailapi/imap/protocol/snippetparser': 'js/ext/mailapi/imap/protocollayer',
    'mailapi/imap/protocol/bodyfetcher': 'js/ext/mailapi/imap/protocollayer',

    // The imap probe layer also contains the imap module
    'imap': 'js/ext/mailapi/imap/probe',

    // The smtp probe layer also contains the simpleclient
    'simplesmtp/lib/client': 'js/ext/mailapi/smtp/probe'
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

