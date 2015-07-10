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

  'submitPerfData':
    '#menuItem-sharePerformanceData gaia-checkbox',

  'alwaysSendReport':
    '#menuItem-alwaysSendReport span',

  'neverSendReport':
    '#menuItem-neverSendReport span',

  'askEachTime':
    '#menuItem-askToSendReport2 span',

  'reportCrashes':
    'input[name="app.reportCrashes"]'
};

ImprovePanel.prototype = {

  __proto__: Base.prototype,

  get isSubmitPerfData() {
    return this.findElement('submitPerfData').scriptWith(function(el) {
      return el.wrappedJSObject.checked;
    });
  },

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

  enableSubmitPerfData: function() {
    var initialState = this.isSubmitPerfData;
    this.waitForElement('submitPerfData').click();
    this.client.waitFor(function() {
      // Ensure tapping the element changed its state
      return this.isSubmitPerfData !== initialState;
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
