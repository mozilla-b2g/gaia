'use strict';

var Base = require('../base');

function GuidedTourPanels(client) {
  Base.call(this, client);
}

module.exports = GuidedTourPanels;

GuidedTourPanels.prototype = {

  __proto__: Base.prototype,

  selectors: {
    rootPanel:       '#root',
    gtWelcome:       '#gt-main',
    gtAlaExplain:    '#gt-ala-explain',
    gtAlaBlur:       '#gt-ala-blur',
    gtAlaCustom:     '#gt-ala-custom',
    gtAlaExceptions: '#gt-ala-exceptions',
    gtRpExplain:     '#gt-rp-explain',
    gtRpPassphrase:  '#gt-rp-passphrase',
    gtRpLocate:      '#gt-rp-locate',
    gtRpRing:        '#gt-rp-ring',
    gtRpLock:        '#gt-rp-lock'
  },

  init: function() {
    this.launch();
    this.client.findElement('#menu-item-gt').tap();
    this.waitForPanelToDissapear(this.selectors.rootPanel);
  },

  tapOnNextBtn: function(panel) {
    this.client.findElement(panel + ' .btn-blue').tap();
  },

  tapOnBackBtn: function(panel) {
    this.client.findElement(panel + ' .btn-dark-gray').tap();
  },

  tapOnCloseBtn: function(panel) {
    this.client.findElement(panel + ' .gt-header').tap(25, 25);
  },

  isRootDisplayed: function() {
    this.waitForPanel(this.selectors.rootPanel);
    return this.client.findElement(this.selectors.rootPanel).displayed();
  },

  getThruPanel: function(panel) {
    this.tapOnNextBtn(panel);
    this.waitForPanelToDissapear(panel);
  },

  getBack: function(panel) {
    this.tapOnBackBtn(panel);
    this.waitForPanelToDissapear(panel);
  }

};
