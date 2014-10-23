(function() {
  'use strict';

  function ALADefineCustomLocation() {
    this.itemData = null;
    this.timeZone = null;
  }

  ALADefineCustomLocation.prototype = {

    /**
     * Initialize ALA Define Custom Location panel.
     * 
     * @method init
     * @constructor
     */
    init: function() {
      this.settings = window.navigator.mozSettings;
      this.panel = document.getElementById('ala-custom');

      this.observers();
      this.events();
    },

    /**
     * Settings observers
     */
    observers: function() {
      window.SettingsListener.observe('time.timezone.user-selected', '',
        function(value) {
          this.timeZone =  {
            region: value.replace(/\/.*/, ''),
            city: value.replace(/.*?\//, '')
          };
        }.bind(this));
    },

    /**
     * Register events.
     */
    events: function() {
      this.panel.addEventListener('pagerendered', this.onBeforeShow.bind(this));

      this.panel.querySelector('.back').addEventListener('click',
        function() {
          if (this.itemData) {
            window.pp.panel.show(
              { id: 'ala-exception', options: this.itemData, back: true}
            );
          } else {
            window.pp.panel.show({ id: 'ala-main', back: true} );
          }
        }.bind(this)
      );
    },

    /**
     * Actions before displaying panel.
     * @param event
     */
    onBeforeShow: function(event) {
      this.itemData = event.detail || null;

      if ( ! this.itemData) {
        Promise.all([
          this.getValue('geolocation.blur.cl.type'),
          this.getValue('geolocation.blur.cl.country'),
          this.getValue('geolocation.blur.cl.city'),
          this.getValue('geolocation.blur.longitude'),
          this.getValue('geolocation.blur.latitude')
        ]).then(function(values) {
          var customSettings = {
            timeZone: this.timeZone,
            type: values[0] || 'cc',
            country: values[1],
            city: values[2],
            longitude: values[3],
            latitude: values[4]
          };

          window.pp.CustomLocationPanel.initAndShow(
            customSettings,
            this.saveCustomLocation.bind(this)
          );
        }.bind(this));
      } else {
        this.currentAppSettings =
          window.pp.alaExceptions.exceptionsList[this.itemData.origin];

        var customSettings = {
          timeZone: this.timeZone,
          type: 'cc'
        };

        if (this.currentAppSettings.cl_type) {
          customSettings.type = this.currentAppSettings.cl_type;
        }
        if (this.currentAppSettings.cl_country) {
          customSettings.country = this.currentAppSettings.cl_country;
        }
        if (this.currentAppSettings.cl_city) {
          customSettings.city = this.currentAppSettings.cl_city;
        }
        if (this.currentAppSettings.cl_longitude) {
          customSettings.longitude = this.currentAppSettings.cl_longitude;
        }
        if (this.currentAppSettings.cl_latitude) {
          customSettings.latitude = this.currentAppSettings.cl_latitude;
        }

        window.pp.CustomLocationPanel.initAndShow(
          customSettings,
          this.saveAppCustomLocation
        );
      }
    },

    getValue: function(key) {
      var promise = new Promise(function(resolve) {
        window.SettingsHelper(key).get(function(value) {
          resolve(value);
        });
      });

      return promise;
    },

    /**
     * Save custom location settings.
     * @param {Object} settings
     */
    saveCustomLocation: function(settings) {
      var flag = settings.latitude !== '' && settings.longitude !== '';

      this.settings.createLock().set({
        'geolocation.blur.cl.type':     settings.type,
        'geolocation.blur.cl.country':  settings.country,
        'geolocation.blur.cl.city':     settings.city,
        'geolocation.blur.longitude':   settings.longitude,
        'geolocation.blur.latitude':    settings.latitude,
        'geolocation.fixed_coords':
          flag ? '@' + settings.latitude + ',' + settings.longitude : ''
      });
    },

    /**
     * Save custom location settings for app.
     * @param {Object} settings
     */
    saveAppCustomLocation: function(settings) {
      var flag = settings.latitude !== '' && settings.longitude !== '';

      window.pp.alaException.saveExceptions({
        coords:       flag ? '@'+settings.latitude+','+settings.longitude : '',
        cl_type:      settings.type,
        cl_country:   settings.country,
        cl_city:      settings.city,
        cl_longitude: settings.longitude,
        cl_latitude:  settings.latitude
      });
    }
  };


  window.pp = window.pp || {};
  window.pp.alaDefineCustomLocation = new ALADefineCustomLocation();
})();
