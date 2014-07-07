// downsample.js
//
// This module defines a single global Downsample object with static
// methods that return objects representing media fragments for
// downsampling images while they are decoded. The current implementation
// is based on the #-moz-samplesize media fragment. But because of
// problems with that fragment (see bug 1004908) it seems likely that a
// new syntax or new fragment will be introduced. If that happens, we can
// just change this module and not have to change anything else that
// depends on it.
//
// The method Downsample.areaAtLeast(scale) returns an object
// representing a media fragment to use to decode an image downsampled by
// at least as much as the specified scale.  If you are trying to preview
// an 8mp image and don't want to use more than 2mp of image memory, for
// example, you would pass a scale of .25 (2mp/8mp) here, and the
// resulting media fragment could be appended to the url to make the
// image decode at a size equal to or smaller than 2mp.
//
// The method Downsample.sizeNoMoreThan(scale) returns a media fragment
// object that you can use to reduce the dimensions of an image as much
// as possible without exceeding the specified scale. If you have a
// 1600x1200 image and want to decode it to produce an image that is as
// small as possible but at least 160x120, you would pass a scale of 0.1.
//
// The returned objects have a dimensionScale property that specifies how
// they affect the dimensions of the image and an areaScale property that
// specifies how much they affect the area (number of pixels) in an
// image. (The areaScale is just the square of the scale.) To avoid
// floating-point rounding issues, the values of these scale properties
// are rounded to the nearest hundredth.
//
// The returned objects also have a scale() method that scales a
// dimension with proper rounding (it rounds up to the nearest integer
// just as libjpeg does).
//
// Each object also has a toString() method that returns the required
// media fragment (including the hash mark) so you can simply use
// string concatentation to append one of these objects to the URL of
// the image you want to decode.
//
// Downsample.NONE is a no-op media fragment object with scale set to
// 1, and a toString() method that returns the empty string.
//
(function(exports) {
  'use strict';

  // Round to the nearest hundredth to combat floating point rounding errors
  function round(x) {
    return Math.round(x * 100) / 100;
  }


  //
  // A factory method for returning an object that represents a
  // #-moz-samplesize media fragment. The use of Math.ceil() in the
  // scale method is from jpeg_core_output_dimensions() in
  // media/libjpeg/jdmaster.c and jdiv_round_up() in media/libjpeg/jutils.c
  //
  function MozSampleSize(n, scale) {
    return Object.freeze({
      dimensionScale: round(scale),
      areaScale: round(scale * scale),
      toString: function() { return '#-moz-samplesize=' + n; },
      scale: function(x) { return Math.ceil(x * scale); }
    });
  }

  // A fragment object that represents no downsampling with no fragment
  var NONE = Object.freeze({
    dimensionScale: 1,
    areaScale: 1,
    toString: function() { return ''; },
    scale: function(x) { return x; }
  });

  //
  // The five possible #-moz-samplesize values.
  // The mapping from sample size to scale comes from:
  // the moz-samplesize code in /image/decoders/nsJPEGDecoder.cpp and
  // the jpeg_core_output_dimensions() function in media/libjpeg/jdmaster.c
  //
  var fragments = [
    NONE,
    MozSampleSize(2, 1 / 2), // samplesize=2 reduces size by 1/2 and area by 1/4
    MozSampleSize(3, 3 / 8), // etc.
    MozSampleSize(4, 1 / 4),
    MozSampleSize(8, 1 / 8)
  ];

  // Return the fragment object that has the largest scale and downsamples the
  // dimensions of an image at least as much as the specified scale.
  // If none of the choices scales enough, return the one that comes closest
  function sizeAtLeast(scale) {
    scale = round(scale);
    for (var i = 0; i < fragments.length; i++) {
      var f = fragments[i];
      if (f.dimensionScale <= scale) {
        return f;
      }
    }
    return fragments[fragments.length - 1];
  }

  // Return the fragment object that downsamples an image as far as possible
  // without going beyond the specified scale. This might return NONE.
  function sizeNoMoreThan(scale) {
    scale = round(scale);
    for (var i = fragments.length - 1; i >= 0; i--) {
      var f = fragments[i];
      if (f.dimensionScale >= scale) {
        return f;
      }
    }
    return NONE;
  }

  // Return the fragment object that has the largest scale and downsamples the
  // area of an image at least as much as the specified scale.
  // If none of the choices scales enough, return the one that comes closest
  function areaAtLeast(scale) {
    scale = round(scale);
    for (var i = 0; i < fragments.length; i++) {
      var f = fragments[i];
      if (f.areaScale <= scale) {
        return f;
      }
    }
    return fragments[fragments.length - 1];
  }

  // Return the fragment object that downsamples the area of an image
  // as far as possible without going beyond the specified scale. This
  // might return NONE.
  function areaNoMoreThan(scale) {
    scale = round(scale);
    for (var i = fragments.length - 1; i >= 0; i--) {
      var f = fragments[i];
      if (f.areaScale >= scale) {
        return f;
      }
    }
    return NONE;
  }

  exports.Downsample = {
    sizeAtLeast: sizeAtLeast,
    sizeNoMoreThan: sizeNoMoreThan,
    areaAtLeast: areaAtLeast,
    areaNoMoreThan: areaNoMoreThan,
    NONE: NONE,
    MAX_SIZE_REDUCTION: 1 / fragments[fragments.length - 1].dimensionScale,
    MAX_AREA_REDUCTION: 1 / fragments[fragments.length - 1].areaScale
  };
}(window));
