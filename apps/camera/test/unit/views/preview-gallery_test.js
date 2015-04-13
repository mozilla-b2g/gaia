require('/shared/js/l10n.js');

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
    this.view = new this.previewGalleryView({});
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

  suite('previewGalleryView#onFrameWheel', function() {
    var mockWheelRight = {
      type: 'wheel', deltaMode: 2, DOM_DELTA_PAGE: 2, deltaX: 1
    }, mockWheelLeft = {
      type: 'wheel', deltaMode: 2, DOM_DELTA_PAGE: 2, deltaX: -1
    }, mockWheelDown = {
      type: 'wheel', deltaMode: 2, DOM_DELTA_PAGE: 2, deltaY: 1
    };

    setup(function() {
      sinon.spy(this.view, 'emit');
    });

    test('wheel right', function() {
      this.view.onFrameWheel(mockWheelRight);
      assert.isTrue(this.view.emit.calledWith('swipe', 'left'));
    });

    test('wheel left', function() {
      this.view.onFrameWheel(mockWheelLeft);
      assert.isTrue(this.view.emit.calledWith('swipe', 'right'));
    });

    test('wheel down', function() {
      this.view.onFrameWheel(mockWheelDown);
      sinon.assert.notCalled(this.view.emit);
    });
  });

  suite('previewGalleryView#updateCountText', function() {
    setup(function() {
      this.view.render();
    });

    test('Accessible labelling', function() {
      var total = 1, current = 3;
      this.view.updateCountText(current, total);
      assert.equal(this.view.els.mediaFrame.getAttribute('data-l10n-id'),
        'media-frame');
      assert.deepEqual(JSON.parse(this.view.els.mediaFrame.getAttribute(
        'data-l10n-args')), { total: total, current: current });
    });
  });

  suite('Options menu', function() {
    test('showOptionsMenu', function() {
      assert.isFalse(this.view.el.classList.contains('action-menu'));
      this.view.showOptionsMenu();
      assert.ok(this.view.el.classList.contains('action-menu'));
    });

    test('hideOptionsMenu', function() {
      this.view.optionsMenuContainer = document.createElement('div');
      this.view.el.appendChild(this.view.optionsMenuContainer);
      this.view.el.classList.add('action-menu');

      this.view.hideOptionsMenu();
      assert.isFalse(this.view.el.classList.contains('action-menu'));
    });
  });

  suite('previewGalleryView#withinRightBound', function() {

    setup(function() {
      this.view.rtl = false;
    });

    test('LRT within bounds', function() {
      this.view.currentIndex = 2;
      assert.isTrue(this.view.withinRightBound())
    });

    test('LRT out of bounds', function() {
      this.view.currentIndex = 1;
      assert.isFalse(this.view.withinRightBound())
    });

    test('RTL within bounds', function() {
      this.view.rtl = true;
      this.view.currentIndex = 0;
      this.view.lastIndex = 5;
      assert.isTrue(this.view.withinRightBound())
    });

    test('RTL out of bounds', function() {
      this.view.rtl = true;
      this.view.currentIndex = 5;
      this.view.lastIndex = 5;
      assert.isFalse(this.view.withinRightBound())
    });

  });

  suite('previewGalleryView#withinLeftBound', function() {

    setup(function() {
      this.view.rtl = false;
    });

    test('LRT within bounds', function() {
      this.view.currentIndex = 0;
      this.view.lastIndex = 5;
      assert.isTrue(this.view.withinLeftBound())
    });

    test('LRT out of bounds', function() {
      this.view.currentIndex = 5;
      this.view.lastIndex = 5;
      assert.isFalse(this.view.withinLeftBound())
    });

    test('RTL within bounds', function() {
      this.view.rtl = true;
      this.view.currentIndex = 2;
      assert.isTrue(this.view.withinLeftBound())
    });

    test('RTL out of bounds', function() {
      this.view.rtl = true;
      this.view.currentIndex = 1;
      assert.isFalse(this.view.withinLeftBound())
    });

  });

});
