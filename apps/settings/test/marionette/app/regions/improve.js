'use strict';
var Base = require('../base');

/**
 * Abstraction around settings improve panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function ImprovePanel(client) {

  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, ImprovePanel.Selectors);

}

module.exports = ImprovePanel;

ImprovePanel.Selectors = {
  'feedbackEntryButton':
    '#improveBrowserOS-chooseFeedback',

  'alwaysSendReport':
    '#menuItem-alwaysSendReport gaia-radio',

  'neverSendReport':
    '#menuItem-neverSendReport gaia-radio',

  'askEachTime':
    '#menuItem-askToSendReport2 gaia-radio',

  'reportCrashes':
    'gaia-radio[name="app.reportCrashes"]'
};

ImprovePanel.prototype = {

  __proto__: Base.prototype,

  selectedReport: function(type) {
    this.client.waitFor(function() {
      var eles = this.findElements('reportCrashes');
      for (var i = 0; i < eles.length; i++) {
        var ele = eles[i];
        if (ele.getAttribute('checked') &&
            (ele.getAttribute('value') === type)) {
          return true;
        }
      }
    }.bind(this));
  },

  enableNeverSendReport: function() {
    this.waitForElement('neverSendReport').tap();
    this.selectedReport('never');
  },

  enableAskEachTime: function() {
    this.waitForElement('askEachTime').tap();
    this.selectedReport('ask');
  },

  enableAlwaysSendReport: function() {
    this.waitForElement('alwaysSendReport').tap();
    this.selectedReport('always');
  },

  enterFeedbackPanel: function() {
    this.waitForElement('feedbackEntryButton').tap();
  }
};
