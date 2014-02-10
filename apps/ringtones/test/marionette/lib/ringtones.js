/* jshint node: true*/
/* exported findElement */
'use strict';
/**
 * Abstraction around Ringtones app.
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function Ringtones(client) {
  this.client = client;
  this.client.setSearchTimeout(10000);
}

/**
 * @type String Origin of Ringtones app
 */
Ringtones.URL = 'app://ringtones.gaiamobile.org';

module.exports = Ringtones;

Ringtones.Selectors = {
  body: 'body',
  sounds: '#sounds li',
  doneButton: 'button#done',
  cancelButton: 'button#cancel',
  soundName: '#sounds li anchor.sound-name',
  soundInput: 'label.pack-radio input[type="radio"]',
  soundLabel: 'label.pack-radio'
};

/**
 * @private
 * @param {Marionette.Client} client for selector.
 * @param {String} name of selector [its a key in Ringtones.Selectors].
 */
function findElement(client, name) {
  return client.findElement(Ringtones.Selectors[name]);
}

Ringtones.prototype = {
  /**
   * Launches Ringtones app and focuses on frame.
   */
  launch: function() {
    this.client.apps.launch(Ringtones.URL, 'ringtones');
    this.client.apps.switchToApp(Ringtones.URL, 'ringtones');
    this.client.helper.waitForElement(Ringtones.Selectors.body);
  },

  get soundsList() {
    return this.client.helper.waitForElement(Ringtones.Selectors.sounds);
  },

  get isSoundSelected() {
    return this.client.findElement(Ringtones.Selectors.soundInput)
      .getAttribute('checked');
  },

  selectSound: function() {
    this.client.helper.waitForElement(Ringtones.Selectors.soundLabel).tap();
      this.client.waitFor(function() {
        return this.isSoundSelected;
    }.bind(this));
  },

  getSelectedSound: function() {
    return this.client.helper.waitForElement(Ringtones.Selectors.soundName)
      .text();
  },

  getSoundsList: function() {
   return this.client.findElements(Ringtones.Selectors.sounds);
  },

  tapDoneButton: function() {
    this.client.helper.waitForElement(Ringtones.Selectors.doneButton).tap();
  },

  tapCancelButton: function() {
    this.client.helper.waitForElement(Ringtones.Selectors.cancelButton).tap();
  }
};
