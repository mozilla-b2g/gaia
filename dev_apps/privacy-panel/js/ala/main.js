(function() {
  'use strict';

  function PanelALA() {
    this.apps = [];
    this.blurSlider = new window.pp.BlurSlider();
    this.geolocationCords = null;
  }

  /**
   * Initialize ala panel.
   */
  PanelALA.prototype = {
    init: function() {
      this.settings = window.navigator.mozSettings;
      this.panel = document.getElementById('ala-main');
      this.alert = this.panel.querySelector('.custom-location-alert');

      //initialize blur slider element
      window.SettingsHelper('geolocation.blur.slider', 1).get(function(value) {
        this.blurSlider.init(
          this.panel.querySelector('.type-blur'),
          value,
          function(value) {
            window.SettingsHelper('geolocation.approx_distance').set(value);
          }.bind(this)
        );
      }.bind(this));


      this.observers();
      this.events();


      // prepare app list that uses geolocation
      window.pp.appList.get('geolocation', function(apps) {
        this.apps = apps;

        // init alaExceptions module
        window.pp.alaExceptions.init();
      }.bind(this));

      // init alaException module
      window.pp.alaException.init();

      // init alaDefineCustomLocation module
      window.pp.alaDefineCustomLocation.init();

      // init CustomLocationPanel module
      window.pp.CustomLocationPanel.init();
    },

    /**
     * Settings observers
     */
    observers: function() {
      window.SettingsListener.observe('geolocation.fixed_coords', false,
        function(value) {
          this.geolocationCords = value;
        }.bind(this)
      );

      window.SettingsListener.observe('geolocation.enabled', false,
        this.toggleGeolocation.bind(this)
      );

      window.SettingsListener.observe('ala.settings.enabled', false,
        this.toggleALA.bind(this)
      );

      window.SettingsListener.observe('geolocation.type', false,
        this.changeType.bind(this)
      );
    },

    /**
     * Register events.
     */
    events: function() {
      this.alert.querySelector('button').addEventListener('click',
        function() {
          this.alert.setAttribute('hidden', 'hidden');
          window.pp.panel.show({ id: 'ala-custom' });
        }.bind(this)
      );
    },

    /**
     * Toggle Geolocation.
     * @param {Boolean} value
     */
    toggleGeolocation: function(value) {
      this.panel.dataset.geolocation = (value);
    },

    /**
     * Toggle Location Accuracy.
     * @param {Boolean} value
     */
    toggleALA: function(value) {
      this.panel.dataset.ala = (value);
    },

    /**
     * Change ALA type.
     * @param {String} value
     */
    changeType: function(value) {

      // set attribute to section
      this.panel.dataset.type = value;

      // hide alert
      this.alert.setAttribute('hidden', 'hidden');

      switch (value) {
        case 'user-defined':
          if ( ! this.geolocationCords) {
            // show alert if geolocation is not set
            this.alert.removeAttribute('hidden');
          }

          break;
        case 'blur':
        case 'precise':
        case 'no-location':
          break;
        default:
          break;
      }
    }
  };


  window.pp = window.pp || {};
  window.pp.ala = new PanelALA();
})();
