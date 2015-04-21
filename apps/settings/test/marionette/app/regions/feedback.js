'use strict';

var Base = require('../base');

/**
 * Abstraction around settings improve panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function FeedbackPanel(client) {

  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, FeedbackPanel.Selectors);

}

module.exports = FeedbackPanel;

FeedbackPanel.Selectors = {
  'feedbackPanel': '#improveBrowserOS-chooseFeedback',
  'feedbackHappy': '#feedback-happy',
  'feedbackSad': '#feedback-sad',
  'sendFeedbackPanel': '#improveBrowserOS-sendFeedback',
  'chooseFeedbackPanel': '#improveBrowserOS-chooseFeedback',
  'feedbackDiscription': '#feedback-description',
  'feedbackEmailEnable': '#feedback-contactyou',
  'emailEnable': 'span[data-l10n-id="feedback-contactyou"]',
  'feedbackEmail': '#feedback-email',
  'feedbackEmailBar': '#feedback-emailbar',
  'sendFeedbackButton': '#feedback-send-btn',
  'alertDialogMsg': '#feedback-alert-msg',
  'alertDialogDoneBtn': '#feedback-done',
  'feedbackBackButton': '#feedback-back-button'
};

FeedbackPanel.prototype = {

  __proto__: Base.prototype,

  get alertMsg() {
    return this.waitForElement('alertDialogMsg').text();
  },

  get discription() {
    return this.waitForElement('feedbackDiscription')
            .getAttribute('value');
  },

  isRendered: function() {
    this.client.waitFor(function() {
      return this.waitForElement('feedbackPanel')
              .getAttribute('data-rendered') === 'true';
    }.bind(this));
  },

  tapFeedbackBack: function() {
    this.waitForElement('feedbackBackButton').tap();
    this.client.waitFor(function() {
      return this.waitForElement('feedbackHappy').displayed();
    }.bind(this));
  },

  enterWithHappy: function() {
    this.waitForElement('feedbackHappy').tap();
    this.sendFeedbackPanelDisplay();
  },

  enterWithSad: function() {
    this.waitForElement('feedbackSad').tap();
    this.sendFeedbackPanelDisplay();
  },

  sendFeedbackPanelDisplay: function() {
    var chooseFeedbackPanel =
      this.waitForElement('chooseFeedbackPanel');
    this.client.waitFor(function() {
      return chooseFeedbackPanel.location().x +
        chooseFeedbackPanel.size().width === 0;
    });
  },

  sendFeedback: function() {
    this.waitForElement('sendFeedbackButton').tap();
  },

  openEmailCol: function() {
    this.findElement('feedbackEmailEnable').click();
    this.client.waitFor(function() {
      var value = this.findElement('feedbackEmailBar').
        getAttribute('hidden');
      return value === 'false';
    }.bind(this));
  },

  inputMsgToDialog: function(text) {
    var ele = this.waitForElement('feedbackDiscription');
    ele.sendKeys(text);
  }
};
