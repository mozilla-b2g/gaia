/* global openLink, openDialog */
/**
 * PanelUtils is a singleton that defines panel related utility functions.
 *
 * @module PanelUtils
 */
define(function(require) {
  'use strict';

  var Settings = require('settings');
  var SettingsCache = require('modules/settings_cache');
  var LazyLoader = require('shared/lazy_loader');

  var _settings = navigator.mozSettings;

  /**
   * Opens the dialog of a specified id.
   *
   * @param {String} dialogID
   *                 The id of the dialog element.
   */
  var _openDialog = function pu_openDialog(dialogID) {
    var dialog = document.getElementById(dialogID);
    var fields = Array.prototype.slice.call(
      dialog.querySelectorAll('[data-setting]:not([data-ignore])'));

    var updateInput = function(lock, input) {
      var key = input.dataset.setting;
      var request = lock.get(key);

      request.onsuccess = function() {
        switch (input.type) {
          case 'radio':
            input.checked = (input.value == request.result[key]);
            break;
          case 'checkbox':
            input.checked = request.result[key] || false;
            break;
          case 'select-one':
            input.value = request.result[key] || '';
            break;
          default:
            input.value = request.result[key] || '';
            break;
        }
      };
    };

    /**
     * In Settings dialog boxes, we don't want the input fields to be preset
     * by Settings.init() and we don't want them to set the related settings
     * without any user validation.
     *
     * So instead of assigning a `name' attribute to these inputs, a
     * `data-setting' attribute is used and the input values are set
     * explicitely when the dialog is shown.  If the dialog is validated
     * (submit), their values are stored into B2G settings.
     *
     * XXX warning:
     * this only supports text/password/radio/select/radio input types.
     */

    // initialize all setting fields in the dialog box
    // XXX for fields being added by lazily loaded script,
    // it would have to initialize the fields again themselves.
    function reset() {
      if (_settings) {
        var lock = _settings.createLock();
        fields.forEach(updateInput.bind(null, lock));
      }
    }

    // validate all settings in the dialog box
    function submit() {
      if (_settings) {
        // Update the fields node list to include dynamically added fields
        fields = Array.prototype.slice.call(
          dialog.querySelectorAll('[data-setting]:not([data-ignore])'));
        var cset = {}, key;
        var lock = _settings.createLock();

        fields.forEach(function(input) {
          key = input.dataset.setting;
          switch (input.type) {
            case 'radio':
              if (input.checked) {
                cset[key] = input.value;
              }
              break;
            case 'checkbox':
              cset[key] = input.checked;
              break;
            default:
              cset[key] = input.value;
              break;
          }
        });
        lock.set(cset);
      }
    }

    reset(); // preset all fields before opening the dialog
    openDialog(dialogID, submit);
  };

  return {
    /**
     * The function parses all links in the panel and adds corresponding
     * handlers.
     * There are three types of links:
     * - a[href^="http"]: External link
     * - a[href^="tel"]: External link
     * - [data-href]: Generic dialog link and settings-specific dialog link
     *
     * @alias module:PanelUtils#activate
     * @param {HTMLElement} panel
     *                      The root element of the panel.
     */
    activate: function pu_activate(panel) {
      navigator.mozL10n.translate(panel);

      // activate all scripts
      var scripts = panel.getElementsByTagName('script');
      var scripts_src = Array.prototype.map.call(scripts, function(script) {
        return script.getAttribute('src');
      });
      LazyLoader.load(scripts_src);

      var _onclick = function(callback, value) {
        callback(value);
        return false;
      };

      // activate all links
      var rule = 'a[href^="http"], a[href^="tel"], [data-href]';
      var links = panel.querySelectorAll(rule);
      var i, count;

      for (i = 0, count = links.length; i < count; i++) {
        var link = links[i];
        if (!link.dataset.href) {
          link.dataset.href = link.href;
          link.href = '#';
        }
        if (!link.dataset.href.startsWith('#')) { // external link
          link.onclick = _onclick.bind(this, openLink,
                                       link.dataset.href);
        } else if (!link.dataset.href.endsWith('Settings')) { // generic dialog
          link.onclick = _onclick.bind(this, openDialog,
                                       link.dataset.href.substr(1));
        } else { // Settings-specific dialog box
          link.onclick = _onclick.bind(this, _openDialog,
                                       link.dataset.href.substr(1));
        }
      }
    },

    /**
     * The function presets elements with the settings values.
     * The supported formats are:
     * - An input element with a "name" attribute and its value is a settings
     *   key.
     * - A select element with a "name" attribute and its value is a settings
     *   key.
     * - A span element with a "data-name" attribute and its value is a settings
     *   key.
     *
     * @alias module:PanelUtils#preset
     * @param {HTMLElement} panel
     *                      The root element of the panel.
     */
    preset: function pu_preset(panel) {
      SettingsCache.getSettings(function(result) {
        panel = panel || document;

        // preset all checkboxes
        var rule = 'input[type="checkbox"]:not([data-ignore])';
        var checkboxes = panel.querySelectorAll(rule);
        var i, count, key;
        for (i = 0, count = checkboxes.length; i < count; i++) {
          key = checkboxes[i].name;
          if (key && result[key] !== undefined) {
            checkboxes[i].checked = !!result[key];
          }
        }

        // remove initial class so the swich animation will apply
        // on these toggles if user interact with it.
        setTimeout(function() {
          for (i = 0, count = checkboxes.length; i < count; i++) {
            if (checkboxes[i].classList.contains('initial')) {
              checkboxes[i].classList.remove('initial');
            }
          }
        }, 0);

        // preset all radio buttons
        rule = 'input[type="radio"]:not([data-ignore])';
        var radios = panel.querySelectorAll(rule);
        for (i = 0, count = radios.length; i < count; i++) {
          key = radios[i].name;
          if (key && result[key] !== undefined) {
            radios[i].checked = (result[key] === radios[i].value);
          }
        }

        // preset all text inputs
        rule = 'input[type="text"]:not([data-ignore])';
        var texts = panel.querySelectorAll(rule);
        for (i = 0, count = texts.length; i < count; i++) {
          key = texts[i].name;
          if (key && result[key] !== undefined) {
            texts[i].value = result[key];
          }
        }

        // preset all range inputs
        rule = 'input[type="range"]:not([data-ignore])';
        var ranges = panel.querySelectorAll(rule);
        for (i = 0, count = ranges.length; i < count; i++) {
          key = ranges[i].name;
          if (key && result[key] !== undefined) {
            ranges[i].value = parseFloat(result[key]);
          }
        }

        // preset all select
        var selects = panel.querySelectorAll('select');
        for (i = 0, count = selects.length; i < count; i++) {
          var select = selects[i];
          key = select.name;
          if (key && result[key] !== undefined) {
            var value = result[key];
            var option = 'option[value="' + value + '"]';
            var selectOption = select.querySelector(option);
            if (selectOption) {
              selectOption.selected = true;
            }
          }
        }

        // preset all span with data-name fields
        rule = '[data-name]:not([data-ignore])';
        var spanFields = panel.querySelectorAll(rule);
        for (i = 0, count = spanFields.length; i < count; i++) {
          key = spanFields[i].dataset.name;

          // XXX intentionally checking for the string 'undefined',
          // see bug 880617
          if (key && result[key] && result[key] != 'undefined') {
            // check whether this setting comes from a select option
            // (it may be in a different panel, so query the whole document)
            rule = '[data-setting="' + key + '"] ' +
              '[value="' + result[key] + '"]';
            var option_span = document.querySelector(rule);
            if (option_span) {
              spanFields[i].dataset.l10nId = option_span.dataset.l10nId;
              spanFields[i].textContent = option_span.textContent;
            } else {
              spanFields[i].textContent = result[key];
            }
          } else { // result[key] is undefined
            var _ = navigator.mozL10n.get;
            switch (key) {
              //XXX bug 816899 will also provide 'deviceinfo.software' from
              // Gecko which is {os name + os version}
              case 'deviceinfo.software':
                var text = _('brandShortName') + ' ' +
                  result['deviceinfo.os'];
                spanFields[i].textContent = text;
                break;

              //XXX workaround request from bug 808892 comment 22
              //  hide this field if it's undefined/empty.
              case 'deviceinfo.firmware_revision':
                spanFields[i].parentNode.hidden = true;
                break;

              case 'deviceinfo.mac':
                spanFields[i].textContent = _('macUnavailable');
                break;
            }
          }
        }

        // unhide items according to preferences.
        rule = '[data-show-name]:not([data-ignore])';
        var hiddenItems = panel.querySelectorAll(rule);
        for (i = 0; i < hiddenItems.length; i++) {
          key = hiddenItems[i].dataset.showName;
          hiddenItems[i].hidden = !result[key];
        }
      });
    },

    /**
     * When a link element is clicked, the function navigates the app to the
     * panel of the id specified by the "href" attribute of the element.
     *
     * @alias module:PanelUtils#onLinkClick
     * @param {Event} event
     */
    onLinkClick: function pu_onLinkClick(event) {
      var target = event.target;
      var href;

      if (target.classList.contains('icon-back')) {
        href = target.parentNode.getAttribute('href');
      } else {
        var nodeName = target.nodeName.toLowerCase();
        if (nodeName != 'a') {
          return;
        }
        href = target.getAttribute('href');
      }
      // skips the following case:
      // 1. no href, which is not panel
      // 2. href is not a hash which is not a panel
      // 3. href equals # which is translated with loadPanel function, they are
      //    external links.
      if (!href || !href.startsWith('#') || href === '#') {
        return;
      }

      Settings.currentPanel = href;
      event.preventDefault();
    },

    /**
     * Respond to settings changes.
     * The supported formats are:
     * - An input element with a "name" attribute and its value is a settings
     *   key.
     * - A select element with a "name" attribute and its value is a settings
     *   key.
     * - A span element with a "data-name" attribute and its value is a settings
     *   key.
     * - Elements with a "data-show-name" attribute. It hides the element when
     *   the value is false and vice versa.
     *
     * @alias module:PanelUtils#onSettingsChange
     * @param {HTMLElement} panel
     * @param {Event} event
     */
    onSettingsChange: function pu_onSettingsChange(panel, event) {
      var key = event.settingName;
      var value = event.settingValue;
      var i, count;

      // update <span> values when the corresponding setting is changed
      var rule = '[data-name="' + key + '"]:not([data-ignore])';
      var spanField = panel.querySelector(rule);
      if (spanField) {
        // check whether this setting comes from a select option
        var options = panel.querySelector('select[data-setting="' + key + '"]');
        if (options) {
          // iterate option matching
          for (i = 0, count = options.length; i < count; i++) {
            if (options[i] && options[i].value === value) {
              spanField.dataset.l10nId = options[i].dataset.l10nId;
              spanField.textContent = options[i].textContent;
            }
          }
        } else {
          spanField.textContent = value;
        }
      }

      // hide or unhide items
      rule = '[data-show-name="' + key + '"]:not([data-ignore])';
      var item = document.querySelector(rule);
      if (item) {
        item.hidden = !value;
      }

      // update <input> values when the corresponding setting is changed
      var input = panel.querySelector('input[name="' + key + '"]');
      if (!input) {
        return;
      }

      switch (input.type) {
        case 'checkbox':
        case 'switch':
          if (input.checked == value) {
            return;
          }
          input.checked = value;
          break;
        case 'range':
          if (input.value == value) {
            return;
          }
          input.value = value;
          break;
        case 'select':
          for (i = 0, count = input.options.length; i < count; i++) {
            if (input.options[i].value == value) {
              input.options[i].selected = true;
              break;
            }
          }
          break;
      }
    },

    /**
     * Respond to settings changes.
     * The supported formats are:
     * - An input element with a "name" attribute and its value is a settings
     *   key.
     * - A select element with a "name" attribute and its value is a settings
     *   key.
     * - A span element with a "data-name" attribute and its value is a settings
     *   key.
     * - Elements with a "data-show-name" attribute. It hides the element when
     *   the value is false and vice versa.
     *
     * @alias module:PanelUtils#onInputChange
     * @param {HTMLElement} panel
     * @param {Event} event
     */
    onInputChange: function pu_onInputChange(event) {
      var input = event.target;
      var type = input.type;
      var key = input.name;

      //XXX should we check data-ignore here?
      if (!key || !_settings || event.type != 'change') {
        return;
      }

      // Not touching <input> with data-setting attribute here
      // because they would have to be committed with a explicit "submit"
      // of their own dialog.
      if (input.dataset.setting) {
        return;
      }

      var value;
      switch (type) {
        case 'checkbox':
        case 'switch':
          value = input.checked; // boolean
          break;
        case 'range':
          // Bug 906296:
          //   We parseFloat() once to be able to round to 1 digit, then
          //   we parseFloat() again to make sure to store a Number and
          //   not a String, otherwise this will make Gecko unable to
          //   apply new settings.
          value = parseFloat(parseFloat(input.value).toFixed(1)); // float
          break;
        case 'select-one':
        case 'radio':
        case 'text':
        case 'password':
          value = input.value; // default as text
          if (input.dataset.valueType === 'integer') { // integer
            value = parseInt(value);
          }
          break;
      }

      var cset = {}; cset[key] = value;
      _settings.createLock().set(cset);
    }
  };
});
