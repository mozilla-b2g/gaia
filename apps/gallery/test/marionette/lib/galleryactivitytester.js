/* global module */
(function(module) {
  'use strict';

  var SELECTORS = Object.freeze({
    pickImageButton: '#pick-image',
    openImageButton: '#open-image',
    pickedImage: '#pick-activity-data > img',
    pickedImageName: '#pick-activity-data > span.name',
    pickedImageType: '#pick-activity-data > span.type',
    pickedImageSize: '#pick-activity-data > span.size',
    sharedImage: '#share-activity-data > img',
    sharedImageName: '#share-activity-data > span.name',
    sharedImageType: '#share-activity-data > span.type',
    sharedImageSize: '#share-activity-data > span.size'
  });

  var ORIGIN = 'app://gallery.activitytester.gaiamobile.org';

  module.exports = {
    ORIGIN: ORIGIN,

    create: function(client) {
      return {
        get pickedImage() {
          return client.helper.waitForElement(SELECTORS.pickedImage);
        },

        get pickedImageName() {
          return client.helper.waitForElement(SELECTORS.pickedImageName);
        },

        get pickedImageType() {
          return client.helper.waitForElement(SELECTORS.pickedImageType);
        },

        get pickedImageSize() {
          return client.helper.waitForElement(SELECTORS.pickedImageSize);
        },

        get sharedImageName() {
          return client.helper.waitForElement(SELECTORS.sharedImageName);
        },

        get sharedImageType() {
          return client.helper.waitForElement(SELECTORS.sharedImageType);
        },

        get sharedImageSize() {
          return client.helper.waitForElement(SELECTORS.sharedImageSize);
        },

        launch: function() {
          client.switchToFrame();
          client.apps.launch(ORIGIN);
          client.apps.switchToApp(ORIGIN);
        },

        tapPickImageButton: function() {
          client.helper.waitForElement(SELECTORS.pickImageButton).tap();
        },

        tapOpenImageButton: function() {
          client.helper.waitForElement(SELECTORS.openImageButton).tap();
        },

        tapPickedImage: function() {
          client.helper.waitForElement(SELECTORS.pickedImage).tap();
        }
      };
    }
  };
})(module);
