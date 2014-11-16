/**
 * Handles panels.
 * 
 * @module PanelController
 * @return {Object}
 */
define([
  'shared/lazy_loader',
  'shared/settings_listener',
  'shared/settings_helper'
],

function(lazyLoader, SettingsListener, SettingsHelper) {
  'use strict';

  function PanelController() {}

  PanelController.prototype = {

    /**
     * Load needed templates
     *
     * @method load
     * @param  {Array}    sections
     * @param  {Function} callback
     */
    load: function(group, callback) {
      var result = [];
      var sections = document.querySelectorAll(
        'section[data-section="' + group + '"]'
      );

      callback = callback || function() {};

      // Convert sections to normal array
      [].forEach.call(sections, function(section) {
        result.push(section);
      });

      lazyLoader.load(result, function() {
        this.registerEvents(result);
        callback(result);
      }.bind(this));
    },

    /**
     * Show specific section, closes previously opened ones.
     *
     * @method show
     * @param {Object}  p
     * @param {String}  p.id      [optional] Element ID
     * @param {Object}  p.el      [optional] DOM element
     * @param {Boolean} p.back    [optional] Trigger back transition
     * @param {Mixed}   p.options [optional] Passed parameters
     */
    show: function(p) {
      if (p.id && !p.el) {
        p.el = document.getElementById(p.id);
      }
      _showSection(p.el, p.back, p.options);
    },

    /**
     * Change page
     *
     * @method changePage
     * @param {Object} event
     */
    changePage: function(event) {
      var target, id = this.hash.replace('#', '');

      event.preventDefault();

      if (!id) {
        return;
      }

      target = document.getElementById(id);
      _showSection(target, this.classList.contains('back'));
    },

    /**
     * Register events for given element
     *
     * @method registerEvents
     * @param sections
     */
    registerEvents: function(sections) {
      sections.forEach(function(section) {
        var links = section.querySelectorAll('.pp-link');
        var settings = section.querySelectorAll('input[name], select[name]');

        // Redirect each click on pp-links with href attributes
        [].forEach.call(links, function(link) {
          link.addEventListener('click', this.changePage);
        }.bind(this));

        // Update and save settings on change
        [].forEach.call(settings, function(setting) {
          SettingsListener.observe(
            setting.name,
            setting.dataset.default || false,
            this.updateSetting.bind(setting)
          );
          setting.addEventListener('change', this.saveSetting);
        }.bind(this));
      }.bind(this));
    },

    /**
     * JSON loader
     *
     * @method loadJSON
     * @param {String}   href
     * @param {Function} callback
     */
    loadJSON: function(href, callback) {
      if (!callback) {
        return;
      }

      var xhr = new XMLHttpRequest();
      xhr.onerror = function() {
        console.error('Failed to fetch file: ' + href, xhr.statusText);
      };
      xhr.onload = function() {
        callback(xhr.response);
      };
      xhr.open('GET', href, true); // async
      xhr.responseType = 'json';
      xhr.send();
    },

    /**
     * Update input value
     *
     * @method updateSetting
     * @param  {String} value
     */
    updateSetting: function(value) {
      if (this.type === 'checkbox') {
        this.checked = value;
      } else {
        this.value = value;
      }
    },

    /**
     * Save input value to mozSettings based on inputs name
     *
     * @method saveSetting
     */
    saveSetting: function() {
      var value = this.type === 'checkbox' ? this.checked : this.value;
      SettingsHelper(this.name).set(value);
    }
  };

  /**
   * Show section
   *
   * @private
   * @mrthod showSection
   * @param element
   * @param {Boolean} back
   */
  var _showSection = function(element, back, options) {
    var sections = document.querySelectorAll('section');
    var prevClass = back ? '' : 'previous';
    var event = new CustomEvent('pagerendered', {
      detail: options,
      bubbles: true
    });

    for (var section of sections) {
      if (element.id === 'root' && section.className !== '') {
        section.className = section.className === 'current' ? prevClass : '';
      }

      if (section.className === 'current') {
        section.className = prevClass;
      }
    }

    element.className = 'current';
    element.dispatchEvent(event);
  };

  return new PanelController();
});
