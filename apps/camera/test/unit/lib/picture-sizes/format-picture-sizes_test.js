suite('lib/picture-sizes/format-picture-sizes', function() {
  /*jshint maxlen:false*/
  /*global req*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    req(['lib/picture-sizes/format-picture-sizes'], function(formatPictureSizes) {
      self.formatPictureSizes = formatPictureSizes;
      done();
    });
  });

  setup(function() {
    this.sizes = [
     {
      height: 1536,
      width: 2048
     },
     {
      height: 1200,
      width: 1600
     },
     {
      height: 240,
      width: 320
     },
     {
      height: 480,
      width: 640
     },
     {
      height: 288,
      width: 352
     }
    ];

    this.options = this.formatPictureSizes(this.sizes);
  });

  test('Should be sorted by resolution', function() {
    assert.equal(this.options[0].key, '2048x1536');
    assert.equal(this.options[4].key, '320x240');
  });

  test('Should exlude given keys', function() {
    var options = this.formatPictureSizes(this.sizes, { exclude: ['2048x1536'] });
    var found = options.some(function(size) { return size.key === '2048x1536'; });
    assert.isFalse(found);
  });

  test('Should not include sizes above the `maxPixelSize` option', function() {
    var maxPixelSize = 307200;
    var options = this.formatPictureSizes(this.sizes, { maxPixelSize: maxPixelSize });
    var someGreater = options.some(function(item) { return item.pixelSize > maxPixelSize; });

    assert.isFalse(someGreater, 'should be none greater than: ' + maxPixelSize);
  });

  suite('title', function() {
    test('Should include the apect ratio', function() {
      assert.ok(this.options[0].title.indexOf('4:3') > -1);
    });

    test('Should include MP value for > 1MP', function() {
      assert.isTrue(this.options[0].title.indexOf('3MP') > -1);
      assert.isFalse(this.options[4].title.indexOf('MP') > -1);
    });

    test('Should include the resolution', function() {
      assert.isTrue(this.options[0].title.indexOf('2048x1536') > -1);
    });

    test('Should allow \'MP\' string to be localized', function() {
      this.options = this.formatPictureSizes(this.sizes, { mp: 'REPLACED' });
      assert.isTrue(this.options[0].title.indexOf('REPLACED') > -1);
    });
  });
});
