// set location of dynamically loaded layers.
require.config({
  baseUrl: '..',
  paths: {
    // mailcomposer is in the mailapi/composer layer.
    mailcomposer: 'mailapi/composer',

    // Point activesync protocol modules to their layer
    'wbxml': 'mailapi/activesync/protocollayer',
    'activesync/codepages': 'mailapi/activesync/protocollayer',
    'activesync/protocol': 'mailapi/activesync/protocollayer',

    // activesync/codepages is split across two layers. If
    // activesync/protocol loads first (for autoconfig work on account setup),
    // then indicate the parts of codepages that are in activesync/configurator
    'activesync/codepages/FolderHierarchy':
                                      'mailapi/activesync/configurator',
    'activesync/codepages/ComposeMail':
                                      'mailapi/activesync/configurator',
    'activesync/codepages/AirSync':
                                      'mailapi/activesync/configurator',
    'activesync/codepages/AirSyncBase':
                                      'mailapi/activesync/configurator',
    'activesync/codepages/ItemEstimate':
                                      'mailapi/activesync/configurator',
    'activesync/codepages/Email':
                                      'mailapi/activesync/configurator',
    'activesync/codepages/ItemOperations':
                                      'mailapi/activesync/configurator',
    'activesync/codepages/Move':
                                      'mailapi/activesync/configurator',

    // Point chew methods to the chew layer
    'mailapi/htmlchew': 'mailapi/chewlayer',
    'mailapi/quotechew': 'mailapi/chewlayer',
    'mailapi/imap/imapchew': 'mailapi/chewlayer',

    // Imap body fetching / parsing / sync
    'mailapi/imap/protocol/sync': 'mailapi/imap/protocollayer',
    'mailapi/imap/protocol/textparser': 'mailapi/imap/protocollayer',
    'mailapi/imap/protocol/snippetparser': 'mailapi/imap/protocollayer',
    'mailapi/imap/protocol/bodyfetcher': 'mailapi/imap/protocollayer',

    // The imap probe layer also contains the imap module
    'imap': 'mailapi/imap/probe',

    // The smtp probe layer also contains the simpleclient
    'simplesmtp/lib/client': 'mailapi/smtp/probe'
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

// config.js will be injected above this comment

// baseUrl is different for front end
require.config({
  baseUrl: 'js/ext'
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
          require(['mailapi/main-frame-setup']);
      }, 0);
      return acctSlice;
    }
  };
  window.dispatchEvent(evtObject);
}());

