define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var SettingsService = require('modules/settings_service');

  return function ctor_frame_panel() {
    var framePanel;
    var iframe;
    var noReflow;

    return SettingsPanel({
      onInit: function(panel) {
        framePanel = panel;
      },
      onBeforeShow: function(panel, options) {
        // noReflow is used to memorize whether users had pressed `home` button
        // before. This is used to differentiate these two scenarios which would
        // trigger onBeforeShow().
        //
        // 1. Embmed the app at the first time.
        // 2. Recovering settings app after pressing home button first.
        if (noReflow) {
          noReflow = false;
          return;
        }

        iframe = document.createElement('iframe');
        iframe.setAttribute('mozapp', options.mozapp);
        iframe.setAttribute('mozbrowser', true);
        iframe.src = options.src;
        iframe.addEventListener('mozbrowserclose', this._onBrowserClose);
        iframe.addEventListener('mozbrowsershowmodalprompt', function(e) {
          var message = e.detail.message;
          var initialValue = e.detail.initialValue;
          var type = e.detail.promptType;

          switch (type) {
            case 'alert':
              window.alert(message);
              break;
            case 'prompt':
              e.detail.returnValue = window.prompt(message, initialValue);
              break;
            case 'confirm':
              e.detail.returnValue = window.confirm(message);
              break;
          }
        });
        panel.appendChild(iframe);
      },
      onHide: function() {
        if (document.hidden) {
          noReflow = true;
          return;
        }
        framePanel.removeChild(iframe);
      },
      _onBrowserClose: function() {
        SettingsService.back();
      }
    });
  };
});
