'use strict';
/* global Applications, AppList */

(function(exports) {
  function $(id) {
    return document.getElementById(id);
  }

  function Homescreen() {
  }

  Homescreen.prototype = {
    init: function HS_Init() {
      // Global
      document.addEventListener('contextmenu', this);
      document.addEventListener('visibilitychange', this);

      // Applications
      Applications.init();

      // App List
      this.appList = new AppList({
        appList: $('app-list'),
        container: $('app-list-container'),
        pageIndicator: $('app-list-page-indicator')
      });
      this.appList.init();
      $('app-list-open-button').addEventListener('click', this);
      $('app-list-close-button').addEventListener('click', this);
    },

    uninit: function HS_Uninit() {
      // App List
      $('app-list-close-button').removeEventListener('click', this);
      $('app-list-open-button').removeEventListener('click', this);
      this.appList.uninit();
      this.appList = null;

      // Applications
      Applications.uninit();

      // Global
      document.removeEventListener('contextmenu', this);
      document.removeEventListener('visibilitychange', this);
    },

    handleEvent: function HS_HandleEvent(evt) {
      switch(evt.type) {
        case 'click':
          switch (evt.target.id) {
            case 'app-list-open-button':
              this.appList.show();
              break;
            case 'app-list-close-button':
              this.appList.hide();
              break;
          }
          break;
        case 'contextmenu':
          evt.preventDefault();
          break;
        case 'visibilitychange':
          if (document.visibilityState === 'visible') {
            this.appList.hide();
          }
          break;
      }
    }
  };

  exports.Homescreen = Homescreen;
})(window);
