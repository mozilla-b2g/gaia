/* global getSupportedNetworkInfo, loadJSON, URL, MozActivity */
/**
 * Handle tone functionality in sound panel
 * @module ToneManager
 */
define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');
  var SettingsCache = require('modules/settings_cache');
  var ForwardLock = require('shared/omadrm/fl');

  var ToneManager = function() {
    this._elements = null;
    this._tones = null;
  };

  ToneManager.prototype = {
    /**
     * initialization
     *
     * @access public
     * @memberOf ToneManager.prototype
     */
    init: function tm_init(elements) {
      this._elements = elements;
      this._customize();
      this._configureTones();
      this._handleTones();

      this._elements.manageTones.addEventListener('click',
        this._manageTonesClickHandler);
    },

    /**
     * Change UI based on conditions
     *
     * @access private
     * @memberOf ToneManager.prototype
     */
    _customize: function tm_customize() {
      // Show/hide 'Virate' checkbox according to device-features.json
      loadJSON(['/resources/device-features.json'], function(data) {
        this._elements.vibrationSetting.hidden = !data.vibration;
      }.bind(this));

      // Show/hide tone selector based on mozMobileConnections
      if (window.navigator.mozMobileConnections) {
        var mobileConnections = window.navigator.mozMobileConnections;
        // Show the touch tone selector if and only if we're on a CDMA network
        var toneSelector = this._elements.toneSelector;
        Array.prototype.forEach.call(mobileConnections,
          function(mobileConnection) {
            getSupportedNetworkInfo(mobileConnection, function(result) {
              toneSelector.hidden = toneSelector.hidden && !result.cdma;
            });
        });
      }
    },

    /**
     * Initialize the ring tone and alert tone menus.
     *
     * @access private
     * @memberOf ToneManager.prototype
     */
    _configureTones: function tm_configureTones() {
      // This array has one element for each selectable tone that
      // appears in the "Tones" section of ../elements/sound.html.
      this._tones = [{
        pickType: 'alerttone',
        settingsKey: 'notification.ringtone',
        allowNone: true, // Allow "None" as a choice for alert tones.
        button: this._elements.alertToneSelection
      }];

      // If we're a telephone, then show the section for ringtones, too.
      if (navigator.mozTelephony) {
        this._tones.push({
          pickType: 'ringtone',
          settingsKey: 'dialer.ringtone',
          allowNone: false, // The ringer must always have an actual sound.
          button: this._elements.ringToneSelection
        });
        this._elements.ringer.hidden = false;
      }
    },

    /**
     * The button looks like a select element and holds the name of the
     * currently-selected tone. Sometimes the name is an l10n ID
     * and sometimes it is just text.
     *
     * @access private
     * @memberOf ToneManager.prototype
     */
    _renderToneName: function tm_renderToneName(tone, tonename) {
      var l10nID = tonename && tonename.l10nID;

      if (l10nID) {
        tone.button.setAttribute('data-l10n-id', l10nID);
      } else {
        tone.button.removeAttribute('data-l10n-id');
        tone.button.textContent = tonename;
      }
    },

    /**
     * Call web activity to pick a tone
     *
     * @access private
     * @memberOf ToneManager.prototype
     * @param  {Object} tone          tone element
     * @param  {Number} currentToneID tone id
     * @param  {String} secret        forwardlock secret key
     */
    _pickTone: function tm_pickRingTone(tone, currentToneID, secret) {
      var self = this;
      var activity = new MozActivity({
        name: 'pick',
        data: {
          type: tone.pickType,
          allowNone: tone.allowNone,
          currentToneID: currentToneID,
          // If we have a secret then there is locked content on the
          // phone so include it as a choice for the user
          includeLocked: (secret !== null)
        }
      });

      activity.onsuccess = function() {
        var result = activity.result;
        if (!result.blob) {
          if (tone.allowNone) {
            // If we allow a null blob, then everything is okay
            self._setRingtone(result, tone);
          }
          else {
            var _ = navigator.mozL10n.get;
            // Otherwise this is an error and we should not change the
            // current setting. (The ringtones app should never return
            // a null blob if allowNone is false, but other apps might.)
            alert(_('unplayable-ringtone'));
          }
          return;
        }

        // If we got a locked ringtone, we have to unlock it first
        if (result.blob.type.split('/')[1] ===
          ForwardLock.mimeSubtype) {
            ForwardLock.unlockBlob(secret, result.blob,
              function(unlocked) {
                result.blob = unlocked;
                self._checkRingtone(result, tone);
            });
        } else {  // Otherwise we can just use the blob directly.
          self._checkRingtone(result, tone);
        }
      };
    },

    /**
     * Update Ringtones list.
     *
     * @access private
     * @memberOf ToneManager.prototype
     */
    _handleTones: function tm_handleTones() {
      // For each kind of tone, hook up the button that will allow the user
      // to select a sound for that kind of tone.
      this._tones.forEach(function(tone) {
        var nameKey = tone.settingsKey + '.name';
        var idKey = tone.settingsKey + '.id';

        var _bindRenderToneName = function(tonename) {
          this._renderToneName(tone, tonename);
        };

        SettingsListener.observe(nameKey, '', _bindRenderToneName.bind(this));

        var self = this;
        // When the user clicks the button, we launch an activity that lets
        // the user select new ringtone.
        tone.button.addEventListener('click', function() {
          // First, get the ID of the currently-selected tone.
          SettingsCache.getSettings(function(results) {
            var currentToneID = results[idKey];

            // Before we can start the Pick activity, we need to know if there
            // is locked content on the phone because we don't want the user to
            // see "Purchased Media" as a choice if there isn't any purchased
            // media on the phone. The ForwardLock secret key is not generated
            // until it is needed, so we can use its existance to
            // determine whether to show the Purchased Media app.
            ForwardLock.getKey(function(secret) {
              self._pickTone.call(self, tone, currentToneID, secret);
            });
          });
        });
      }.bind(this));
    },

    /**
     * Save the sound blob in the settings so that other apps can use it.
     * Also save the sound name in the db so we can display it in the
     * future.  And update the button text to the new name now.
     *
     * @access private
     * @memberOf ToneManager.prototype
     */
    _setRingtone: function tm_setRingtone(result, tone) {
      var blobKey = tone.settingsKey;
      var nameKey = tone.settingsKey + '.name';
      var idKey = tone.settingsKey + '.id';

      // Update the settings database. This will cause the button
      // text to change as well because of the SettingsListener above.
      var values = {};
      var name = result.l10nID ? {l10nID : result.l10nID} : result.name;

      values[blobKey] = result.blob;
      values[nameKey] = name || '';
      values[idKey] = result.id;
      navigator.mozSettings.createLock().set(values);
    },

    /**
     * Make sure that the blob we got from the activity is actually
     * a playable audio file. It would be very bad to set an corrupt
     * blob as a ringtone because then the phone wouldn't ring!
     *
     * @access private
     * @memberOf ToneManager.prototype
     */
    _checkRingtone: function tm_checkRingtone(result, tone) {
      var oldRingtoneName = null;

      var l10nId = tone.button.getAttribute('data-l10n-id');

      if (!l10nId) {
        oldRingtoneName = tone.button.textContent;
      }
      tone.button.setAttribute('data-l10n-id', 'saving-tone');

      var player = new Audio();
      player.preload = 'metadata';
      player.src = URL.createObjectURL(result.blob);
      player.oncanplay = function() {
        release();
        // this will update the button text
        this._setRingtone(result, tone);
      }.bind(this);
      player.onerror = function() {
        var _ = navigator.mozL10n.get;
        release();
        if (l10nId) {
          tone.button.setAttribute('data-l10n-id', l10nId);
        } else {
          tone.button.textContent = oldRingtoneName;
        }
        alert(_('unplayable-ringtone'));
      };

      function release() {
        URL.revokeObjectURL(player.src);
        player.removeAttribute('src');
        player.load();
      }
    },

    /**
     * Call ringtone activity to manage tones
     *
     * @access private
     * @memberOf ToneManager.prototype
     */
    _manageTonesClickHandler: function tm_manageTonesClickHandler() {
      var activity = new MozActivity({
        name: 'configure',
        data: {
          target: 'ringtone'
        }
      });

      // We should hopefully never encounter this error, but if we do, it means
      // we couldn't find the ringtone app. It also has the happy side effect of
      // quieting jshint about not using the `activity` variable.
      activity.onerror = function() {
        console.log(this.error);
        var _ = navigator.mozL10n.get;
        if (this.error.name === 'NO_PROVIDER') {
          alert(_('no-ringtone-app'));
        }
      };
    }
  };

  return function ctor_toneManager() {
    return new ToneManager();
  };
});
