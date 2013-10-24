/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*global Utils, ActivityHandler, ThreadUI, ThreadListUI, MessageManager,
         Settings, LazyLoader */

var lazyLoadFiles = [
  'shared/js/async_storage.js',
  'shared/js/l10n_date.js',
  'shared/js/notification_helper.js',
  'shared/js/gesture_detector.js',
  'shared/js/settings_url.js',
  'shared/js/template.js',
  'shared/js/mime_mapper.js',
  'js/dialog.js',
  'js/blacklist.js',
  'js/contacts.js',
  'js/recipients.js',
  'js/threads.js',
  'js/message_manager.js',
  'js/attachment.js',
  'js/attachment_menu.js',
  'js/thread_list_ui.js',
  'js/thread_ui.js',
  'js/compose.js',
  'js/waiting_screen.js',
  'js/utils.js',
  'js/fixed_header.js',
  'js/activity_picker.js',
  'js/wbmp.js',
  'js/smil.js',
  'js/link_helper.js',
  'js/action_menu.js',
  'js/link_action_handler.js',
  'js/settings.js',
  'js/notify.js',
  'js/activity_handler.js',
  'shared/style/input_areas.css',
  'shared/style/switches.css',
  'shared/style/confirm.css',
  'shared/style_unstable/progress_activity.css',
  'shared/style/action_menu.css',
  'style/notification.css'
];

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
      var date = new Date(element.dataset.l10nDate);
      args.date = Utils.date.format.localeFormat(date, format);

      navigator.mozL10n.localize(element, element.dataset.l10nId, args);
    }
  );

});

window.addEventListener('load', function() {
  function initUIApp() {
    ActivityHandler.init();
    // Init UI Managers
    ThreadUI.init();
    ThreadListUI.init();
    // We render the threads
    MessageManager.getThreads(ThreadListUI.renderThreads);
    // Fetch mmsSizeLimitation
    Settings.init();
  }

  navigator.mozL10n.ready(function waitLocalizedForLoading() {
    LazyLoader.load(lazyLoadFiles, function() {
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
  });
});
