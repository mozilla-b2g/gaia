/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*global Utils, ActivityHandler, ThreadUI, ThreadListUI, MessageManager,
         Settings, LazyLoader, TimeHeaders, Information, SilentSms,
         PerformanceTestingHelper, App, Navigation */

navigator.mozL10n.ready(function localized() {
  // This will be called during startup, and any time the languange is changed

  // Look for any iframes and localize them - mozL10n doesn't do this
  Array.prototype.forEach.call(document.querySelectorAll('iframe'),
    function forEachIframe(iframe) {
      var doc = iframe.contentDocument;
      doc.documentElement.lang = navigator.mozL10n.language.code;
      doc.documentElement.dir = navigator.mozL10n.language.direction;
      navigator.mozL10n.translate(doc.body);
    }
  );

  // Also look for l10n-contains-date and re-translate the date message.
  // More complex because the argument to the l10n string is itself a formatted
  // date using l10n.
  Array.prototype.forEach.call(
    document.getElementsByClassName('l10n-contains-date'),
    function(element) {
      if (!(element.dataset.l10nDate && element.dataset.l10nDateFormat)) {
        return;
      }

      var format = navigator.mozL10n.get(element.dataset.l10nDateFormat);
      var date = new Date(+element.dataset.l10nDate);
      var localeData = Utils.date.format.localeFormat(date, format);

      if (element.dataset.l10nId && element.dataset.l10nArgs) {
        var args = JSON.parse(element.dataset.l10nArgs);
        args.date = localeData;
        navigator.mozL10n.localize(element, element.dataset.l10nId, args);
      } else {
        element.textContent = localeData;
      }
    }
  );

  // Re-translate the placeholder messages
  Array.prototype.forEach.call(
    document.getElementsByClassName('js-l10n-placeholder'),
    function(element) {
      var id = element.getAttribute('id');

      var l10nId = Utils.camelCase(id);
      element.dataset.placeholder =
        navigator.mozL10n.get(l10nId + '_placeholder');
    }
  );

});

window.addEventListener('load', function() {
  window.dispatchEvent(new CustomEvent('moz-chrome-dom-loaded'));
  function initUIApp() {
    Navigation.init();
    TimeHeaders.init();
    SilentSms.init();
    ActivityHandler.init();

    // Init UI Managers
    ThreadUI.init();
    ThreadListUI.init();
    Information.initDefaultViews();
    ThreadListUI.renderThreads(function() {
      window.dispatchEvent(new CustomEvent('moz-app-loaded'));
      App.setReady();
    });
    // dispatch chrome-interactive when all the modules initialized
    window.dispatchEvent(new CustomEvent('moz-chrome-interactive'));

    // Fetch mmsSizeLimitation
    Settings.init();
    PerformanceTestingHelper.dispatch('objects-init-finished');
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
