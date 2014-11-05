'use strict';

/* global Downsample */

require('/shared/js/media/downsample.js');

suite('Downsample tests', function() {
  test('Check API', function() {
    assert.typeOf(Downsample, 'object');
    assert.typeOf(Downsample.sizeAtLeast, 'function');
    assert.typeOf(Downsample.sizeNoMoreThan, 'function');
    assert.typeOf(Downsample.areaAtLeast, 'function');
    assert.typeOf(Downsample.areaNoMoreThan, 'function');
    assert.typeOf(Downsample.MAX_SIZE_REDUCTION, 'number');
    assert.typeOf(Downsample.MAX_AREA_REDUCTION, 'number');
    assert.typeOf(Downsample.NONE, 'object');
    assert.equal(Downsample.NONE.dimensionScale, 1);
    assert.equal(Downsample.NONE.areaScale, 1);
    assert.equal(Downsample.NONE.toString(), '');
  });

  var scales = [
    10, 2, 1,
    1 / 8, 2 / 8, 3 / 8, 4 / 8, 5 / 8, 6 / 8, 7 / 8,
    0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1,
    0.09, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03, 0.02, 0.01
  ];

  // This is the same function we use in downsample.js
  function round(x) {
    return Math.round(x * 100) / 100;
  }

  test('sizeAtLeast', function() {
    var min = 1 / Downsample.MAX_SIZE_REDUCTION;
    scales.forEach(function(scale) {
      var ds = Downsample.sizeAtLeast(scale);
      assert.operator(ds.dimensionScale, '<=', round(Math.max(scale, min)));
      assert.equal(ds.scale(100), ds.dimensionScale * 100);
      assert.ok(ds === Downsample.NONE || ds.toString()[0] === '#');
    });
  });

  test('areaAtLeast', function() {
    var min = 1 / Downsample.MAX_AREA_REDUCTION;
    scales.forEach(function(scale) {
      var ds = Downsample.areaAtLeast(scale);
      assert.operator(ds.areaScale, '<=', round(Math.max(scale, min)));

      ds = Downsample.areaAtLeast(scale * scale);
      assert.operator(ds.areaScale, '<=', round(Math.max(scale * scale, min)));
      assert.equal(ds.scale(100), ds.dimensionScale * 100);
      assert.ok(ds === Downsample.NONE || ds.toString()[0] === '#');
    });
  });

  test('sizeNoMoreThan', function() {
    scales.forEach(function(scale) {
      var ds = Downsample.sizeNoMoreThan(scale);
      assert.operator(ds.dimensionScale, '>=', round(Math.min(scale, 1)));
      assert.equal(ds.scale(100), ds.dimensionScale * 100);
      assert.ok(ds === Downsample.NONE || ds.toString()[0] === '#');
    });
  });

  test('areaNoMoreThan', function() {
    scales.forEach(function(scale) {
      var ds = Downsample.areaNoMoreThan(scale);
      assert.operator(ds.areaScale, '>=', round(Math.min(scale, 1)));

      ds = Downsample.areaNoMoreThan(scale * scale);
      assert.operator(ds.areaScale, '>=', round(Math.min(scale * scale, 1)));
      assert.equal(ds.scale(100), ds.dimensionScale * 100);
      assert.ok(ds === Downsample.NONE || ds.toString()[0] === '#');
    });
  });

  test('max reduction amounts', function() {
    var ds = Downsample.sizeNoMoreThan(0);
    assert.equal(ds.dimensionScale, round(1 / Downsample.MAX_SIZE_REDUCTION));
    assert.equal(ds.areaScale, round(1 / Downsample.MAX_AREA_REDUCTION));
  });
});
