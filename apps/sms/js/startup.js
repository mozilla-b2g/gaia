/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var lazyLoadFiles = [
  'shared/js/async_storage.js',
  'shared/js/l10n_date.js',
  'shared/js/notification_helper.js',
  'shared/js/gesture_detector.js',
  'shared/js/settings_url.js',
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
  'js/notification.js',
  'js/activity_handler.js',
  'shared/style/input_areas.css',
  'shared/style/switches.css',
  'shared/style/confirm.css',
  'shared/style_unstable/progress_activity.css',
  'shared/style/action_menu.css',
  'style/notification.css'
];

window.addEventListener('localized', function showBody() {
  // Set the 'lang' and 'dir' attributes to <html> when the page is translated
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;
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
        var mocks = ['js/desktop_sms_mock.js', 'js/desktop_contacts_mock.js'];
        LazyLoader.load(mocks, function() {
          MessageManager.init(initUIApp);
        });
        return;
      }
      MessageManager.init(initUIApp);
    });
  });
});
