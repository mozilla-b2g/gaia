var Gallery = require('./lib/gallery.js'),
    Marionette = require('marionette-client'),
    assert = require('assert'),
    TestCommon = require('./lib/test_common');

marionette('editing an image', function() {

  var app, actions, client, chrome;

  client = marionette.client({
    prefs: {
      'device.storage.enabled': true,
      'device.storage.testing': true,
      'device.storage.prompt.testing': true,
      'webgl.force-enabled': true
    }
  });

  setup(function() {
    TestCommon.prepareTestSuite('pictures', client);
    app = new Gallery(client);
    actions = new Marionette.Actions(client);
    app.launch();
  });

  test.skip('should have different options', function() {
    // You should be able to switch between the different 'operations'
    // in the image editor.
    app.thumbnail.click();
    app.editButton.click();
    app.waitForImageEditor();
    assert.ok(app.exposureOptions.displayed());

    app.editCropButton.click();
    assert.ok(app.cropOptions.displayed());

    app.editEffectButton.click();
    assert.ok(app.effectOptions.displayed());

    app.editEnhanceButton.click();
    assert.ok(app.enhanceOptions.displayed());
  });

  test('should change exposure', function() {
    // Changing the exposure of an image creates a new modified
    // version of original.
    app.thumbnail.click();
    app.editButton.click();
    app.waitForImageEditor();
    app.editExposureButton.click();
    actions.flick(app.exposureSlider, 0, 0, 50, 0).perform();
    app.editSaveButton.click();
    client.waitFor(function() {
      return app.thumbnails.length == 2;
    });
    assert.strictEqual(app.thumbnails.length, 2);
  });

  test('should crop it', function() {
    // Croping an image creates a new modified version of original.
    app.thumbnail.click();
    app.editButton.click();
    app.editCropButton.click();
    app.waitForImageEditor();
    app.editCropAspectPortraitButton.click();
    app.editSaveButton.click();
    client.waitFor(function() {
      return app.thumbnails.length == 2;
    });
    assert.strictEqual(app.thumbnails.length, 2);
  });

  test.skip('should apply an effect', function() {
    // Applying a sepia effect creates a new modified version of original.
    app.thumbnail.click();
    app.editButton.click();
    app.editEffectButton.click();
    app.waitForImageEditor();
    app.editEffectSepiaButton.click();
    app.editSaveButton.click();
    client.waitFor(function() {
      return app.thumbnails.length == 2;
    });
    assert.strictEqual(app.thumbnails.length, 2);
  });

});
