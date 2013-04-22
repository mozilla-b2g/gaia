'use strict';

var MockUIManager = {
  mSetup: function muim_mSetup() {
    this.activationScreen = document.getElementById('activation-screen');
    this.progressBar = document.getElementById('progress-bar');
    this.navBar = document.getElementById('nav-bar');
  },

  mTeardown: function muim_mTeardown() {
    this.activationScreen = this.progressBar = this.navBar = null;
  }
};
