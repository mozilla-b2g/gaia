/**
 * ALA main panel.
 * 
 * @module AlaPanel
 * @return {Object}
 */
define([
  'panels',
  'ala/blur_slider',
  'ala/app_list',
  'ala/exception',
  'ala/exceptions',
  'ala/define_custom_location',
  'shared/settings_listener',
  'shared/settings_helper'
],

function(panels, BlurSlider, appList, alaException, alaExceptions, alaDCL,
  SettingsListener, SettingsHelper) {
  'use strict';

  function AlaPanel() {
    this.blurSlider = new BlurSlider();
    this.geolocationCords = null;
    this.dclData = {};
  }

  AlaPanel.prototype = {

    /**
     * Initialize ala panel.
     */
    init: function() {
      this.settings = window.navigator.mozSettings;
      this.panel = document.getElementById('ala-main');
      this.alert = this.panel.querySelector('.custom-location-alert');

      //initialize blur slider element
      SettingsHelper('geolocation.blur.slider', 1).get(function(value) {
        this.blurSlider.init(
          this.panel.querySelector('.type-blur'),
          value,
          function(value) {
            SettingsHelper('geolocation.approx_distance').set(value);
          }.bind(this)
        );
      }.bind(this));

      this.observers();
      this.events();
      this._prepareDCLData();

      // prepare app list that uses geolocation
      appList.get('geolocation', function(apps) {

        // init alaExceptions module
        alaExceptions.init(apps);
      }.bind(this));

      // init alaException module
      alaException.init();

      // init alaDefineCustomLocation module
      alaDCL.init();
    },

    /**
     * Settings observers
     */
    observers: function() {
      SettingsListener.observe('geolocation.fixed_coords', false,
        function(value) {
          this.geolocationCords = value;
        }.bind(this)
      );

      SettingsListener.observe('geolocation.enabled', false,
        this.toggleGeolocation.bind(this)
      );

      SettingsListener.observe('ala.settings.enabled', false,
        this.toggleALA.bind(this)
      );

      SettingsListener.observe('geolocation.type', false,
        this.changeType.bind(this)
      );
    },

    /**
     * Register events.
     */
    events: function() {
      this.panel.querySelector('.set-custom-location').addEventListener('click',
        function() {
          panels.show({ id: 'ala-custom', options: this });
        }.bind(this)
      );

      this.alert.querySelector('button').addEventListener('click',
        function() {
          this.alert.setAttribute('hidden', 'hidden');
          panels.show({ id: 'ala-custom', options: this });
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
          if (!this.geolocationCords) {
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
    },

    /**
     * Prepare data for Define Custom Location.
     */
    _prepareDCLData: function() {
      SettingsHelper('geolocation.blur.cl.type').get(function(value){
        this.dclData.type = value;
      }.bind(this));
      SettingsHelper('geolocation.blur.cl.region').get(function(value){
        this.dclData.region = value;
      }.bind(this));
      SettingsHelper('geolocation.blur.cl.city').get(function(value){
        this.dclData.city = value;
      }.bind(this));
      SettingsHelper('geolocation.blur.longitude').get(function(value){
        this.dclData.longitude = value;
      }.bind(this));
      SettingsHelper('geolocation.blur.latitude').get(function(value){
        this.dclData.latitude = value;
      }.bind(this));
    },

    /**
     * Get data for Define Custom Location.
     * @return {Array}
     */
    getDCLData: function() {
      return Object.create(this.dclData);
    },

    /**
     * Save custom location settings.
     * @param {Object} settings
     */
    saveDCLData: function(settings) {
      var flag = settings.latitude !== '' && settings.longitude !== '';

      this.settings.createLock().set({
        'geolocation.blur.cl.type':     settings.type,
        'geolocation.blur.cl.region':   settings.region,
        'geolocation.blur.cl.city':     settings.city,
        'geolocation.blur.longitude':   settings.longitude,
        'geolocation.blur.latitude':    settings.latitude,
        'geolocation.fixed_coords':
          flag ? '@' + settings.latitude + ',' + settings.longitude : ''
      });

      this._prepareDCLData();
    },

    /**
     * Go back from DCL
     */
    goBackFromDCL: function() {
      panels.show({ id: 'ala-main', back: true });
    }
  };

  return new AlaPanel();

});
