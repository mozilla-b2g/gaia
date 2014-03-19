suite('views/viewfinder', function() {
  'use strict';
  var require = window.req;

  var SENSOR_ANGLE = 90;

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
      width: height,
      height: width,
      aspect: height / width
    };
  });

  suite('ViewfinderView#updatePreview()', function() {
    setup(function() {
      this.viewfinder.el = {
        clientWidth: this.container.height,
        clientHeight: this.container.width
      };
      
      sinon.stub(this.viewfinder, 'updatePreviewMetrics');
    });

    test('Should prefer this.scaleType if defined', function() {
      var preview = { width: 1600, height: 900 };
      var scaleType;

      this.viewfinder.scaleType = 'fit';
      this.viewfinder.updatePreview(preview, SENSOR_ANGLE);
      scaleType = this.viewfinder.updatePreviewMetrics.args[0][3];
      assert.equal(scaleType, 'fit');

      this.viewfinder.scaleType = 'foobar';
      this.viewfinder.updatePreview(preview, SENSOR_ANGLE);
      scaleType = this.viewfinder.updatePreviewMetrics.args[1][3];
      assert.equal(scaleType, 'foobar');
    });

    test('Should choose \'fill\' scaleType if preview aspect > container aspect', function() {
      var scaleType;

      this.viewfinder.scaleType = undefined;

      this.viewfinder.updatePreview({ width: 1600, height: 900 }, SENSOR_ANGLE);
      scaleType = this.viewfinder.updatePreviewMetrics.args[0][3];
      assert.equal(scaleType, 'fill');

      this.viewfinder.updatePreview({ width: 400, height: 300 }, SENSOR_ANGLE);
      scaleType = this.viewfinder.updatePreviewMetrics.args[1][3];
      assert.equal(scaleType, 'fit');
    });

    test('Should add negative scale style if `mirror` argument is true', function() {
      var preview = { width: 1600, height: 900 };

      this.viewfinder.updatePreview(preview, SENSOR_ANGLE, true);
      assert.isTrue(this.viewfinder.els.videoContainer.style.transform.indexOf('scale(-1') === -1);

      this.viewfinder.updatePreview(preview, SENSOR_ANGLE, false);
      assert.isFalse(this.viewfinder.els.videoContainer.style.transform.indexOf('scale(-1') !== -1);
    });
  });

  suite('ViewfinderView#updatePreviewMetrics()', function() {
    setup(function() {});

    test('Should set a \'scale-type\' attribute', function() {
      var previewSize = { width: 400, height: 300 };

      this.viewfinder.updatePreviewMetrics(previewSize, SENSOR_ANGLE, false, 'fill');
      assert.equal(this.viewfinder.el.getAttribute('scale-type'), 'fill');
      this.viewfinder.updatePreviewMetrics(previewSize, SENSOR_ANGLE, false, 'fit');
      assert.equal(this.viewfinder.el.getAttribute('scale-type'), 'fit');
    });

    suite('\'fill\'', function() {
      test('Should match frame width to container width when preview aspect > container aspect', function() {
        var previewSize = { width: 1600, height: 900 };

        // Run test-case
        this.viewfinder.updatePreviewMetrics(previewSize, SENSOR_ANGLE, false, 'fill');

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

        assert.equal(frame.width, this.container.height);
        assert.ok(frame.height > this.container.width);

        assert.equal(video.height, this.container.height);
        assert.ok(video.width > this.container.width);
      });

      test('Should match frame height to container height when preview aspect < container aspect', function() {
        var previewSize = { width: 400, height: 300 };

        // Run test-case
        this.viewfinder.updatePreviewMetrics(previewSize, SENSOR_ANGLE, false, 'fill');

        var frame = {
          width: parseInt(this.viewfinder.els.frame.style.width, 10),
          height: parseInt(this.viewfinder.els.frame.style.height, 10)
        };

        var video = {
          width: parseInt(this.viewfinder.els.videoContainer.style.width, 10),
          height: parseInt(this.viewfinder.els.videoContainer.style.height, 10)
        };

        assert.ok(frame.width > this.container.height);
        assert.equal(frame.height, this.container.width);

        assert.ok(video.height > this.container.height);
        assert.equal(video.width, this.container.width);
      });
    });

    suite('\'fit\'', function() {
      test('Should match frame height to container height when preview aspect > container aspect', function() {
        var previewSize = { width: 1600, height: 900 };

        // Run test-case
        this.viewfinder.updatePreviewMetrics(previewSize, SENSOR_ANGLE, false, 'fit');

        var frame = {
          width: parseInt(this.viewfinder.els.frame.style.width, 10),
          height: parseInt(this.viewfinder.els.frame.style.height, 10)
        };

        var video = {
          width: parseInt(this.viewfinder.els.videoContainer.style.width, 10),
          height: parseInt(this.viewfinder.els.videoContainer.style.height, 10)
        };

        assert.equal(frame.height, this.container.width);
        assert.ok(frame.width < this.container.height);

        assert.equal(video.width, this.container.width);
        assert.ok(video.height < this.container.height);
      });

      test('Should match frame width to container width when preview aspect < container aspect', function() {
        var previewSize = { width: 400, height: 300 };

        // Run test-case
        this.viewfinder.updatePreviewMetrics(previewSize, SENSOR_ANGLE, false, 'fit');

        var frame = {
          width: parseInt(this.viewfinder.els.frame.style.width, 10),
          height: parseInt(this.viewfinder.els.frame.style.height, 10)
        };

        var video = {
          width: parseInt(this.viewfinder.els.videoContainer.style.width, 10),
          height: parseInt(this.viewfinder.els.videoContainer.style.height, 10)
        };

        // Check width is equal and height is shorter
        assert.equal(frame.width, this.container.height);
        assert.ok(frame.height < this.container.width);

        // Check container width is shorter and container height is equal
        assert.ok(video.width < this.container.width);
        assert.equal(video.height, this.container.height);
      });
    });
  });
});
