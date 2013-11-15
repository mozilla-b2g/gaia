var Gallery = require('./lib/gallery.js'),
    Marionette = require('marionette-client'),
    assert = require('assert'),
    TestCommon = require('./lib/test_common');

marionette('using the gallery menu', function() {

  var app, client;

  client = marionette.client({
    prefs: {
      'device.storage.enabled': true,
      'device.storage.testing': true,
      'device.storage.prompt.testing': true
    }
  });

  setup(function() {
    TestCommon.prepareTestSuite('pictures', client);
    app = new Gallery(client);
    actions = new Marionette.Actions(client);
    app.launch();
  });

  test('should let you select images', function() {
    // Use the 'selection' button and select the test image.
    // Selected images should have an border/highlight.
    app.thumbnailsSelectButton.click();
    app.thumbnail.click();

    var outline = app.thumbnail.cssProperty('outline');
    assert.ok(outline != null);
  });

  test('should let you delete images', function() {
    // This test deletes the test image.
    app.thumbnailsSelectButton.click();
    app.thumbnail.click();
    app.thumbnailsDeleteButton.click();
    app.confirmButton.click();

    // Wait for the overlay with 'No photos or videos' message.
    var overlayView = app.overlayView;
    client.helper.waitForElement(overlayView);
    assert.ok(overlayView.displayed());
  });
});
