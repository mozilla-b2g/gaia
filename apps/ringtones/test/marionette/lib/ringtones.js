/* jshint node: true*/
/* exported findElement */

'use strict';

function RingtonesContainer(client) {
  this.client = client;
}

RingtonesContainer.Selectors = {
  body: 'body',
  defaultSounds: '#default-list li',
  defaultSoundsList: '#default-list li label.pack-radio',
  backButton: 'button#back',
  soundName: 'label.pack-radio span',
  soundInput: 'label.pack-radio input[type="radio"]',
  soundLabel: 'label.pack-radio'
};

RingtonesContainer.prototype = {
  client: null,

  get defaultSoundsList() {
    return this.client.helper.waitForElement(
      RingtonesContainer.Selectors.defaultSounds);
  },

  isSoundSelected: function(index) {
    var elements = this.client.findElements(
      RingtonesContainer.Selectors.soundInput);
    return elements[index]
      .getAttribute('checked');
  },

  selectSound: function(index) {
    var elements = this.client.findElements(
      RingtonesContainer.Selectors.soundLabel);
    this.client.helper.waitForElement(elements[index]).tap();
    this.client.waitFor(function() {
        return this.isSoundSelected(index);
    }.bind(this));
  },

  getSelectedSound: function(index) {
    var elements = this.client.findElements(
      RingtonesContainer.Selectors.soundName);
    return this.client.helper.waitForElement(elements[index])
      .text();
  },

  getDefaultSoundsList: function() {
   return this.client.findElements(
    RingtonesContainer.Selectors.defaultSounds);
  },

  tapBackButton: function() {
    this.client.helper.waitForElement(
      RingtonesContainer.Selectors.backButton).tap();
  }
};

/**
 * Abstraction around Ringtones app.
 * @constructor
 * @param {Marionette.Client} client for operations.
 */

function Ringtones(client) {
  this.client = client;
}

/**
 * @type String Origin of Ringtones app
 */
Ringtones.URL = 'app://ringtones.gaiamobile.org';

module.exports = Ringtones;

Ringtones.prototype = {
  client: null,

  inAlertTones: function(soundPanel, callback) {
    // Click Alert tone button
    soundPanel.clickAlertToneSelect();
    // Switch to ringtones app showing alerttones list
    this.client.switchToFrame();
    this.client.apps.switchToApp(Ringtones.URL);
    callback(new RingtonesContainer(this.client));
  },

  inRingTones: function(soundPanel, callback) {
    // Click Ring tone button
    soundPanel.clickRingToneSelect();
    // Switch to ringtones app showing ringtones list
    this.client.switchToFrame();
    this.client.apps.switchToApp(Ringtones.URL);
    callback(new RingtonesContainer(this.client));
  }
};
