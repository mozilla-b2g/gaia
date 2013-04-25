'use strict';

var MockUIManager = {
  domSelectors: [
    'activation-screen',
    'progress-bar',
    'finish-screen',
    'nav-bar',
    'main-title'
  ],

  mSetup: function muim_mSetup() {
    this.domSelectors.forEach(function createElementRef(name) {
      if (name)
        this[toCamelCase(name)] = document.getElementById(name);
    }.bind(this));
  },

  mTeardown: function muim_mTeardown() {
    this.activationScreen = this.progressBar = this.navBar = null;
  },

  sendNewsletter: function() { return true;},
  updateDataConnectionStatus: function(status) {return DataMobile.getStatus()}
};

function toCamelCase(str) {
  return str.replace(/\-(.)/g, function replacer(str, p1) {
    return p1.toUpperCase();
  });
}
