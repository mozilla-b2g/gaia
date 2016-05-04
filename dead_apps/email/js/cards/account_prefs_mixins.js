'use strict';

/*jshint browser: true */
/*global define, console, _secretDebug */

define(function(require) {
  var mozL10n = require('l10n!'),
      cards = require('cards');

  /**
   * mixin properties for cards that share similar actions around the account
   * preferences.
   * ASSUMES the following properties have been initialized on the object
   * - this.account
   * - this.identity
   */

  return {
    // Call this in target object's constructor to wire up the common prefs.
    _bindPrefs: function(checkIntervalClassName, //sync interval select box
                         notifyEmailClassName,   //notify email checkbox
                         soundOnSendClassName,   //send sound on send checkbox
                         signatureEnabledClassName,
                         signatureButtonClassName) {

      if (checkIntervalClassName) {
        // Wire up the sync interval select box.
        var checkIntervalNode = this.nodeFromClass(checkIntervalClassName),
            currentInterval = this.account.syncInterval,
            syncIntervalString = String(currentInterval),
            extraOptions = [];

        // Allow for fast sync options set via the settings_debug
        // secret debugging screen.
        if (typeof _secretDebug !== 'undefined' && _secretDebug.fastSync) {
          extraOptions = extraOptions.concat(_secretDebug.fastSync);
        }

        // If existing sync option is not in the set shown in the UI,
        // allow for dynamically inserting it.
        var hasOption = Array.slice(checkIntervalNode.options, 0)
                        .some(function(option) {
                          return syncIntervalString === option.value;
                        });
        if (!hasOption && extraOptions.indexOf(currentInterval) === -1) {
          extraOptions.push(currentInterval);
        }

        // Add any extra sync interval options.
        extraOptions.forEach(function(interval) {
          var node = document.createElement('option'),
              seconds = interval / 1000;

          node.value = String(interval);
          mozL10n.setAttributes(node, 'settings-check-dynamic',
                                { n: seconds });
          checkIntervalNode.appendChild(node);
        });

        checkIntervalNode.value = syncIntervalString;
        checkIntervalNode.addEventListener('change',
                                           this.onChangeSyncInterval.bind(this),
                                           false);
      }

      if (notifyEmailClassName) {
        var notifyMailNode = this.nodeFromClass(notifyEmailClassName);
        notifyMailNode.addEventListener('click',
                                        this.onNotifyEmailClick.bind(this),
                                        false);
        notifyMailNode.checked = this.account.notifyOnNew;
      }

      if (soundOnSendClassName) {
        var soundOnSendNode = this.nodeFromClass(soundOnSendClassName);
        soundOnSendNode.addEventListener('click',
                                        this.onSoundOnSendClick.bind(this),
                                        false);
        soundOnSendNode.checked = this.account.playSoundOnSend;
      }

      if (signatureEnabledClassName) {
        var signatureEnabledNode =
          this.nodeFromClass(signatureEnabledClassName);
        signatureEnabledNode.addEventListener('click',
                                    this.onSignatureEnabledClick.bind(this),
                                    false);
        signatureEnabledNode.checked = !!this.identity.signatureEnabled;
      }

      if (signatureButtonClassName) {
        this.signatureButton = this.nodeFromClass(signatureButtonClassName);
        this.updateSignatureButton();
        this.signatureButton.addEventListener('click',
          this.onClickSignature.bind(this), false);
      }

    },

    nodeFromClass: function(className) {
      return this.getElementsByClassName(className)[0];
    },

    onChangeSyncInterval: function(event) {
      var value = parseInt(event.target.value, 10);
      console.log('sync interval changed to', value);
      this.account.modifyAccount({ syncInterval: value });
    },

    onNotifyEmailClick: function(event) {
      var checked = event.target.checked;
      console.log('notifyOnNew changed to: ' + checked);
      this.account.modifyAccount({ notifyOnNew: checked });
    },

    onSoundOnSendClick: function(event) {
      var checked = event.target.checked;
      console.log('playSoundOnSend changed to: ' + checked);
      this.account.modifyAccount({ playSoundOnSend: checked });
    },

    onSignatureEnabledClick: function(event) {
      var checked = event.target.checked;
      console.log('signatureEnabled changed to: ' + checked);
      this.identity.modifyIdentity({ signatureEnabled: checked });
    },

    updateSignatureButton: function() {
      // Allow the text to be just whitespace, but treat it as
      // empty as far as labeling is concerned.
      var text = this.identity.signature || '',
          isEmpty = text.trim().length === 0,
          node = this.signatureButton.firstElementChild;

      node.textContent = text;
      node.classList.toggle('empty-placeholder', isEmpty);

      if (isEmpty) {
        mozL10n.setAttributes(node, 'settings-empty-signature-label');
      } else {
        node.removeAttribute('data-l10n-id');
      }
    },

    onClickSignature: function(index) {
     cards.pushCard(
        'settings_signature', 'animate',
        {
          account: this.account,
          index: index
        },
        'right');
    }
  };
});
