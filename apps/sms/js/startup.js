/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*global Utils, ActivityHandler, ThreadUI, ThreadListUI, MessageManager,
         Settings, LazyLoader, TimeHeaders, Information, SilentSms,
         PerformanceTestingHelper, App, Navigation, EventDispatcher */

navigator.mozL10n.ready(function localized() {
  // This will be called during startup, and any time the languange is changed

  // Look for any iframes and localize them - mozL10n doesn't do this
  Array.prototype.forEach.call(document.querySelectorAll('iframe'),
    function forEachIframe(iframe) {
      var doc = iframe.contentDocument;
      doc.documentElement.lang = navigator.mozL10n.language.code;
      doc.documentElement.dir = navigator.mozL10n.language.direction;
      navigator.mozL10n.translateFragment(doc.body);
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

var Startup = {
  _lazyLoadScripts: [
    '/shared/js/settings_listener.js',
    '/shared/js/sim_picker.js',
    '/shared/js/mime_mapper.js',
    '/shared/js/notification_helper.js',
    '/shared/js/gesture_detector.js',
    '/shared/js/settings_url.js',
    '/shared/js/mobile_operator.js',
    '/shared/js/multi_sim_action_button.js',
    '/shared/js/font_size_utils.js',
    'js/waiting_screen.js',
    'js/errors.js',
    'js/dialog.js',
    'js/error_dialog.js',
    'js/link_helper.js',
    'js/action_menu.js',
    'js/link_action_handler.js',
    'js/contact_renderer.js',
    'js/activity_picker.js',
    'js/information.js',
    'js/shared_components.js',
    'js/task_runner.js',
    'js/silent_sms.js',
    'js/recipients.js',
    'js/attachment.js',
    'js/attachment_renderer.js',
    'js/attachment_menu.js',
    'js/thread_ui.js',
    'js/compose.js',
    'js/wbmp.js',
    'js/smil.js',
    'js/notify.js',
    'js/activity_handler.js'
  ],

  _lazyLoadInit: function() {
    LazyLoader.load(this._lazyLoadScripts, function() {
      // dispatch moz-content-interactive when all the modules initialized
      SilentSms.init();
      ActivityHandler.init();

      // Init UI Managers
      TimeHeaders.init();
      ThreadUI.init();
      Information.initDefaultViews();

      // Dispatch post-initialize event for continuing the pending action
      Startup.emit('post-initialize');
      window.dispatchEvent(new CustomEvent('moz-content-interactive'));

      // Fetch mmsSizeLimitation and max concat
      Settings.init();

      PerformanceTestingHelper.dispatch('objects-init-finished');
    });
  },

  _initUIApp: function() {
    Navigation.init();
    ThreadListUI.init();
    ThreadListUI.renderThreads(this._lazyLoadInit.bind(this), function() {
      window.dispatchEvent(new CustomEvent('moz-app-loaded'));
      App.setReady();
    });

    // dispatch chrome-interactive when thread list related modules
    // initialized
    window.dispatchEvent(new CustomEvent('moz-chrome-interactive'));
  },

  init: function() {
    var initUIApp = this._initUIApp.bind(this);
    window.addEventListener('load', function() {
      console.log('@@@ loaded = ' + Date.now());
      window.dispatchEvent(new CustomEvent('moz-chrome-dom-loaded'));

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
  }
};

EventDispatcher.mixin(Startup);
Startup.init();
