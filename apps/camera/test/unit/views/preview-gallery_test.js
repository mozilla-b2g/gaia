suite('views/preview-gallery', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    req(['views/preview-gallery'], function(previewGalleryView) {
      self.previewGalleryView = previewGalleryView;
      done();
    });
  });

  setup(function() {
    this.view = new this.previewGalleryView();
    console.log('test' + this.view);
    console.log('view name' + this.view.name);
    this.clock = sinon.useFakeTimers();
  });

  suite('previewGalleryView', function() {
    var realL10n = navigator.mozL10n;
    setup(function() {
      var mozL10n = { get: function() {} };
      if (!navigator.mozL10n) {
        navigator.mozL10n = mozL10n;
      }
    });

    teardown(function() {
      navigator.mozL10n = realL10n;
    });

    test('previewGalleryView#previewOption', function() {
      this.view.previewOption();
      assert.equal(this.view.container.dataset.type, 'action');
    });

    test('previewGalleryView#removeOption', function() {
      this.view.previewMenuFadeIn = sinon.spy();
      this.view.removeOption();
      assert.isTrue(this.view.previewMenuFadeIn.called);
    });
  });
});
