define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var SendFeedback = require('panels/feedback_send/feedback_send');

  return function ctor_sendFeedbackPanel() {
    var elements = {};
    var sendFeedback = SendFeedback();
    var eventMapping = [
      { elementName: 'alertBtn', eventType: 'click',
        methodName: 'alertConfirm' },
      { elementName: 'doneBtn', eventType: 'click', methodName: 'done' },
      { elementName: 'sendBtn', eventType: 'click', methodName: 'send' },
      { elementName: 'emailEnable', eventType: 'change',
        methodName: 'enableEmail' },
      { elementName: 'header', eventType: 'action', methodName: 'back' }
    ];

    function bindEvents(elements) {
      eventMapping.forEach(function(map) {
        map.method = sendFeedback[map.methodName].bind(sendFeedback);
        elements[map.elementName].addEventListener(map.eventType,
          map.method);
      });
    }

    function unbindEvents(elements) {
      eventMapping.forEach(function(map) {
        if (!map.method) {
          return;
        }
        elements[map.elementName].removeEventListener(map.eventType,
          map.method);
      });
    }

    return SettingsPanel({
      onInit: function(panel) {
        elements = {
          alertDialog: panel.querySelector('#feedback-alert'),
          alertMsg: panel.querySelector('#feedback-alert-msg'),
          alertBtn: panel.querySelector('#feedback-alert-btn'),
          doneDialog: panel.querySelector('#feedback-done'),
          doneBtn: panel.querySelector('#feedback-done-btn'),
          title: panel.querySelector('#feedback-title'),
          description: panel.querySelector('#feedback-description'),
          emailInput: panel.querySelector('#feedback-email'),
          emailColumn: panel.querySelector('#feedback-emailbar'),
          emailEnable: panel.querySelector('#email-enable'),
          sendBtn: panel.querySelector('#feedback-send-btn'),
          header: panel.querySelector('#feedback-header')
        };
        sendFeedback.init(elements);
      },
      onBeforeShow: function(panel, options) {
        bindEvents(elements);
        sendFeedback.options = options;
        sendFeedback.updateTitle();
        sendFeedback.getPreviousInputs();
      },
      onBeforeHide: function() {
        unbindEvents(elements);
        if (document.hidden) {
          sendFeedback.keepAllInputs();
        }
      }
    });
  };
});
