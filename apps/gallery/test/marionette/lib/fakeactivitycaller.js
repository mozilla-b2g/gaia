/* global module */
(function(module) {
  'use strict';

  var SELECTORS = Object.freeze({
    pickMenu: 'form[data-z-index-level="action-menu"]',
    pickImageButton: '#pick-image',
    pickedImage: '#pick-activity-data > img',
    pickedImageName: '#pick-activity-data > span.name',
    pickedImageType: '#pick-activity-data > span.type',
    sharedImage: '#share-activity-data > img',
    sharedImageName: '#share-activity-data > span.name',
    sharedImageType: '#share-activity-data > span.type'
  });

  var ORIGIN = 'gallery.fakeactivity.gaiamobile.org';

  module.exports = {
    ORIGIN: ORIGIN,

    create: function(client) {
      var originURL = 'app://' + ORIGIN;

      return {
        get pickMenu() {
          // Switch to the system app first.
          client.switchToFrame();
          return client.helper.waitForElement(SELECTORS.pickMenu);
        },

        get pickedImage() {
          return client.helper.waitForElement(SELECTORS.pickedImage);
        },

        get pickedImageName() {
          return client.helper.waitForElement(SELECTORS.pickedImageName);
        },

        get pickedImageType() {
          return client.helper.waitForElement(SELECTORS.pickedImageType);
        },

        get sharedImageName() {
          return client.helper.waitForElement(SELECTORS.sharedImageName);
        },

        get sharedImageType() {
          return client.helper.waitForElement(SELECTORS.sharedImageType);
        },

        get pickWithGalleryButton() {
          var pickWithOptions = this.pickMenu.findElements('button');
          for (var i = 0; i < pickWithOptions.length; i++) {
            var pickWithOption = pickWithOptions[i];
            if (pickWithOption.text() === 'Gallery') {
              return pickWithOption;
            }
          }
        },

        launch: function() {
          client.switchToFrame();
          client.apps.launch(originURL);
          client.apps.switchToApp(originURL);
        },

        switchTo: function() {
          client.switchToFrame();
          client.apps.switchToApp(originURL);
        },

        pickImage: function() {
          client.helper.waitForElement(SELECTORS.pickImageButton).tap();
          this.pickWithGalleryButton.tap();
        }
      };
    }
  };
})(module);
