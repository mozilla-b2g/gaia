suite('views/viewfinder', function() {
  'use strict';
  var require = window.req;

  suiteSetup(function(done) {
    var self = this;
    require(['views/viewfinder'], function(ViewfinderView) {
      self.ViewfinderView = ViewfinderView;
      done();
    });
  });

  setup(function() {
    var width = 300;
    var height = 500;

    this.viewfinder = new this.ViewfinderView();

    this.container = this.viewfinder.container = {
      landscape: {
        width: height,
        height: width,
        aspect: height / width
      }
    };
  });

  suite('ViewfinderView#updatePreview()', function() {
    setup(function() {
      sinon.stub(this.viewfinder, 'updatePreviewMetrics');
    });

    test('Should prefer this.scaleType if defined', function() {
      var preview = { width: 1600, height: 900 };
      var scaleType;

      this.viewfinder.scaleType = 'fit';
      this.viewfinder.updatePreview(preview);
      scaleType = this.viewfinder.updatePreviewMetrics.args[0][1];
      assert.equal(scaleType, 'fit');

      this.viewfinder.scaleType = 'foobar';
      this.viewfinder.updatePreview(preview);
      scaleType = this.viewfinder.updatePreviewMetrics.args[1][1];
      assert.equal(scaleType, 'foobar');
    });

    test('Should choose \'fill\' scaleType if preview aspect > container aspect', function() {
      var scaleType;

      this.viewfinder.scaleType = undefined;

      this.viewfinder.updatePreview({ width: 1600, height: 900 });
      scaleType = this.viewfinder.updatePreviewMetrics.args[0][1];
      assert.equal(scaleType, 'fill');

      this.viewfinder.updatePreview({ width: 400, height: 300 });
      scaleType = this.viewfinder.updatePreviewMetrics.args[1][1];
      assert.equal(scaleType, 'fit');
    });

    test('Should add the `reversed` class if `mirror` argument is true', function() {
      var preview = { width: 1600, height: 900 };

      this.viewfinder.updatePreview(preview, true);
      assert.isTrue(this.viewfinder.el.classList.contains('reversed'));

      this.viewfinder.updatePreview(preview, false);
      assert.isFalse(this.viewfinder.el.classList.contains('reversed'));
    });
  });

  suite('ViewfinderView#updatePreviewMetrics()', function() {
    setup(function() {});

    test('Should set a \'scale-type\' attribute', function() {
      var previewSize = { width: 400, height: 300 };

      this.viewfinder.updatePreviewMetrics(previewSize, 'fill');
      assert.equal(this.viewfinder.el.getAttribute('scale-type'), 'fill');
      this.viewfinder.updatePreviewMetrics(previewSize, 'fit');
      assert.equal(this.viewfinder.el.getAttribute('scale-type'), 'fit');
    });

    suite('\'fill\'', function() {
      test('Should match frame width to container width when preview aspect > container aspect', function() {
        var previewSize = { width: 1600, height: 900 };

        // Run test-case
        this.viewfinder.updatePreviewMetrics(previewSize, 'fill');

        // Frame
        var frame = {
          width: parseInt(this.viewfinder.els.frame.style.width, 10),
          height: parseInt(this.viewfinder.els.frame.style.height, 10)
        };

        // Video container
        var video = {
          width: parseInt(this.viewfinder.els.videoContainer.style.width, 10),
          height: parseInt(this.viewfinder.els.videoContainer.style.height, 10)
        };

        assert.equal(frame.width, this.container.landscape.height);
        assert.ok(frame.height > this.container.landscape.width);

        assert.equal(video.height, this.container.landscape.height);
        assert.ok(video.width > this.container.landscape.width);
      });

      test('Should match frame height to container height when preview aspect < container aspect', function() {
        var previewSize = { width: 400, height: 300 };

        // Run test-case
        this.viewfinder.updatePreviewMetrics(previewSize, 'fill');

        var frame = {
          width: parseInt(this.viewfinder.els.frame.style.width, 10),
          height: parseInt(this.viewfinder.els.frame.style.height, 10)
        };

        var video = {
          width: parseInt(this.viewfinder.els.videoContainer.style.width, 10),
          height: parseInt(this.viewfinder.els.videoContainer.style.height, 10)
        };

        assert.ok(frame.width > this.container.landscape.height);
        assert.equal(frame.height, this.container.landscape.width);

        assert.ok(video.height > this.container.landscape.height);
        assert.equal(video.width, this.container.landscape.width);
      });
    });

    suite('\'fit\'', function() {
      test('Should match frame height to container height when preview aspect > container aspect', function() {
        var previewSize = { width: 1600, height: 900 };

        // Run test-case
        this.viewfinder.updatePreviewMetrics(previewSize, 'fit');

        var frame = {
          width: parseInt(this.viewfinder.els.frame.style.width, 10),
          height: parseInt(this.viewfinder.els.frame.style.height, 10)
        };

        var video = {
          width: parseInt(this.viewfinder.els.videoContainer.style.width, 10),
          height: parseInt(this.viewfinder.els.videoContainer.style.height, 10)
        };

        assert.equal(frame.height, this.container.landscape.width);
        assert.ok(frame.width < this.container.landscape.height);

        assert.equal(video.width, this.container.landscape.width);
        assert.ok(video.height < this.container.landscape.height);
      });

      test('Should match frame width to container width when preview aspect < container aspect', function() {
        var previewSize = { width: 400, height: 300 };

        // Run test-case
        this.viewfinder.updatePreviewMetrics(previewSize, 'fit');

        var frame = {
          width: parseInt(this.viewfinder.els.frame.style.width, 10),
          height: parseInt(this.viewfinder.els.frame.style.height, 10)
        };

        var video = {
          width: parseInt(this.viewfinder.els.videoContainer.style.width, 10),
          height: parseInt(this.viewfinder.els.videoContainer.style.height, 10)
        };

        // Check width is equal and height is shorter
        assert.equal(frame.width, this.container.landscape.height);
        assert.ok(frame.height < this.container.landscape.width);

        // Check landscape width is shorter and landscape height is equal
        assert.ok(video.width < this.container.landscape.width);
        assert.equal(video.height, this.container.landscape.height);
      });
    });
  });
});