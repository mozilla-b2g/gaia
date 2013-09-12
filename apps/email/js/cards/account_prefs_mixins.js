/*jshint browser: true */
/*global define, console, _secretDebug */

define(function(require) {
  var evt = require('evt'),
      mozL10n = require('l10n!');

  /**
   * mixin properties for cards that share similar actions around the account
   * preferences.
   * ASSUMES the following properties have been initialized on the object
   * - this.domNode
   * - this.account
   */

  return {
    // Call this in target object's constructor to wire up the common prefs.
    _bindPrefs: function(checkIntervalClassName, //sync interval select box
                         notifyEmailClassName) { //notify email checkbox

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
        if (!hasOption && extraOptions.indexOf(currentInterval) === -1)
          extraOptions.push(currentInterval);

        // Add any extra sync interval options.
        extraOptions.forEach(function(interval) {
          var node = document.createElement('option'),
              seconds = interval / 1000;

          node.value = String(interval);
          mozL10n.localize(node, 'settings-check-dynamic', { n: seconds });
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
    },

    nodeFromClass: function(className) {
      return this.domNode.getElementsByClassName(className)[0];
    },

    onChangeSyncInterval: function(event) {
      var value = parseInt(event.target.value, 10);
      console.log('sync interval changed to', value);
      var data = {syncInterval: value};

      // On account creation, may not have a full account object yet.
      if (this.account.modifyAccount)
        this.account.modifyAccount(data);
      else
        evt.emitWhenListener('accountModified', this.account.id, data);
    },

    onNotifyEmailClick: function(event) {
      var checked = event.target.checked;
      console.log('notifyOnNew changed to: ' + checked);
      var data = {notifyOnNew: checked};

      // On account creation, may not have a full account object yet.
      if (this.account.modifyAccount)
        this.account.modifyAccount(data);
      else
        evt.emitWhenListener('accountModified', this.account.id, data);
    }
  };
});
