define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var SettingsService = require('modules/settings_service');

  return function ctor_choose_feedback_panel() {
    var feedbackHappy;
    var feedbackSad;

    function navigateToSendfeedbackPanel(evt) {
      SettingsService.navigate('improveBrowserOS-sendFeedback', {
        feel: evt.currentTarget.id
      });
    }
    return SettingsPanel({
      onInit: function(panel) {
        feedbackHappy = panel.querySelector('#feedback-happy');
        feedbackSad = panel.querySelector('#feedback-sad');
      },
      onBeforeShow: function() {
        feedbackHappy.addEventListener('click', navigateToSendfeedbackPanel);
        feedbackSad.addEventListener('click', navigateToSendfeedbackPanel);
      },
      onBeforeHide: function() {
        feedbackHappy.removeEventListener('click', navigateToSendfeedbackPanel);
        feedbackSad.removeEventListener('click', navigateToSendfeedbackPanel);
      }
    });
  };
});
