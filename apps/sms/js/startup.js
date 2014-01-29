/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*global Utils, ActivityHandler, ThreadUI, ThreadListUI, MessageManager,
         Settings, LazyLoader, TimeHeaders */

window.addEventListener('localized', function localized() {
  // This will be called during startup, and any time the languange is changed

  // Set the 'lang' and 'dir' attributes to <html> when the page is translated
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;

  // Look for any iframes and localize them - mozL10n doesn't do this
  Array.prototype.forEach.call(document.querySelectorAll('iframe'),
    function forEachIframe(iframe) {
      var doc = iframe.contentDocument;
      doc.documentElement.lang = navigator.mozL10n.language.code;
      doc.documentElement.dir = navigator.mozL10n.language.direction;
      navigator.mozL10n.translate(doc.body);
    }
  );

  // Also look for not-downloaded-message and re-translate the date message.
  // More complex because the argument to the l10n string is itself a formatted
  // date using l10n.
  Array.prototype.forEach.call(
    document.getElementsByClassName('not-downloaded-message'),
    function(element) {
      if (!(element.dataset.l10nArgs && element.dataset.l10nId &&
            element.dataset.l10nDate)) {
        return;
      }
      var args = JSON.parse(element.dataset.l10nArgs);
      var format = navigator.mozL10n.get(element.dataset.l10nDateFormat);
      var date = new Date(+element.dataset.l10nDate);
      args.date = Utils.date.format.localeFormat(date, format);

      navigator.mozL10n.localize(element, element.dataset.l10nId, args);
    }
  );

});

window.addEventListener('load', function() {
  function initUIApp() {
    TimeHeaders.init();
    ActivityHandler.init();

    // Init UI Managers
    ThreadUI.init();
    ThreadListUI.init();

    ThreadListUI.renderThreads();

    // Fetch mmsSizeLimitation
    Settings.init();
  }

  if (!navigator.mozMobileMessage) {
    var mocks = [
      'js/desktop-only/mobilemessage.js',
      'js/desktop-only/contacts.js'
    ];
    LazyLoader.load(mocks, function() {
      MessageManager.init(initUIApp);
    });
    return;
  }
  MessageManager.init(initUIApp);
});
