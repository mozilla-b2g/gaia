suite('views/preview-gallery', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs(['views/preview-gallery'], function(previewGalleryView) {
      self.previewGalleryView = previewGalleryView;
      done();
    });
  });

  setup(function() {
    this.view = new this.previewGalleryView();
    this.clock = sinon.useFakeTimers();
  });

  suite('previewGalleryView#showOptionsMenu()', function() {
    var realL10n = navigator.mozL10n;
    setup(function() {
      var mozL10n = {
        get: function() {},
        translate: function() {}
      };
      if (!navigator.mozL10n) {
        navigator.mozL10n = mozL10n;
      }
    });

    teardown(function() {
      navigator.mozL10n = realL10n;
    });

    test('Should show the option menu', function() {
      this.view.showOptionsMenu();
      assert.equal(this.view.optionsMenuContainer.children[0].getAttribute(
        'data-type'), 'action');
    });
  });
});
