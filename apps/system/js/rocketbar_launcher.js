'use strict';
/* global SettingsListener, Rocketbar */

window.RocketbarLauncher = {
  instance: null,

  enabled: false,

  /**
   * How much room on the statusbar will trigger the rocketbar
   * when tapped on.
   */
  triggerWidth: 0.65,

  get origin() {
    // We don't really care the origin of rocketbar,
    // and it may change when we swap the homescreen app.
    // So we use a fixed string here.
    // See HomescreenLauncher and http://bugzil.la/913323
    return 'rocketbar';
  },

  show: function() {
    this.instance.render({
      home: 'tasks'
    });
  },

  init: function() {
    SettingsListener.observe('rocketbar.enabled', false,
    function(value) {
      if (value) {
        document.body.classList.add('rb-enabled');
      } else {
        document.body.classList.remove('rb-enabled');
      }
      this.enabled = value;
    }.bind(this));

    SettingsListener.observe('rocketbar.searchAppURL', false,
    function(url) {
      var searchAppURL = url;
      var searchManifestURL = url.match(/(^.*?:\/\/.*?\/)/)[1] +
        'manifest.webapp';

      this.instance = new Rocketbar(searchAppURL, searchManifestURL);
      this.instance.init();
    }.bind(this));
  }
};
