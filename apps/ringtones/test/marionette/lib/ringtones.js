/* global module */
'use strict';

function Ringtones(client, origin) {
  this.client = client;
  this.origin = origin;
}

module.exports = Ringtones;

Ringtones.Selector = Object.freeze({
  panel: '#sounds',
  radios: '.pack-radio',
  cancelButton: '#cancel'
});

Ringtones.prototype = {
  client: null,

  get panel() {
    return this.client.findElement(Ringtones.Selector.panel);
  },

  get radios() {
    return this.client.findElements(Ringtones.Selector.radios);
  },

  get cancelButton() {
    return this.client.findElement(Ringtones.Selector.cancelButton);
  },

  launchInForeground: function() {
    this.client.executeScript(function() {
      var activity = new window.MozActivity({
        name: 'pick',
        data: {
          type: 'ringtone',
          allowNone: true,
          includeLocked: false
        }
      });

      activity.onsuccess = function() {
        console.log('Activity success');
      };

      activity.onerror = function() {
        console.warn('Activity error');
      };
    });

    this.switchToMe();
  },

  switchToMe: function() {
    this.client.switchToFrame();
    this.client.apps.switchToApp(this.origin);
  },

  waitForPanel: function() {
    this.client.waitFor(function() {
      return this.panel.displayed();
    }.bind(this));
  },

  preview: function() {
    this.radios[1].click();
  },

  leavePanel: function() {
    this.cancelButton.click();
  }
};
