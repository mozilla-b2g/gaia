;(function(define){define(function(require,exports,module){
'use strict';

/**
 * Simple logger.
 *
 * @return {Function}
 */
var debug = 0 ? console.log.bind(console) : function(){};

/**
 * Global canvas cache.
 *
 * @type {Object}
 */
var cache = {};

/**
 * Default min/max font-size.
 *
 * @type {Number}
 */
var MIN = 16;
var MAX = 24;

/**
 * The number of pixels to subtract from
 * the given `config.space` to ensure
 * HTML text doesn't overflow container.
 *
 * Ideally we would use 1px, but in some
 * cases italicised text in canvas is ~2px
 * longer than the same text in HTML.
 *
 * http://bugzil.la/1126391
 *
 * @type {Number}
 */
var BUFFER = 3;

/**
 * Get the font-size that closest fits
 * the given space with the given font.
 *
 * Config:
 *
 *   - {String} `text` The text string
 *   - {String} `font` Font shorthand string
 *   - {Number} `space` Width (px) to fit the text into
 *   - {Number} `min` Min font-size (px) (optional)
 *   - {Number} `max` Max font-size (px) (optional)
 *
 * @param  {Object} config
 * @return {Object} {fontSize,overflowing,textWidth}
 */
module.exports = function(config) {
  debug('font fit', config);
  var space = config.space - BUFFER;
  var min = config.min || MIN;
  var max = config.max || MAX;
  var text = trim(config.text);
  var fontSize = max;
  var textWidth;
  var font;

  do {
    font = config.font.replace(/\d+px/, fontSize + 'px');
    textWidth = getTextWidth(text, font);
  } while (textWidth > space && fontSize !== min && fontSize--);

  return {
    textWidth: textWidth,
    fontSize: fontSize,
    overflowing: textWidth > space
  };
};

/**
 * Get the width of the given text
 * with the given font style.
 *
 * @param  {String} text
 * @param  {String} font (CSS shorthand)
 * @return {Number} (px)
 */
function getTextWidth(text, font) {
  var ctx = getCanvasContext(font);
  var width = ctx.measureText(text).width;
  debug('got text width', width);
  return width;
}

/**
 * Get a canvas context configured
 * to the given font style.
 *
 * @param  {String} font
 * @return {CanvasRenderingContext2D}
 */
function getCanvasContext(font) {
  debug('get canvas context', font);

  var cached = cache[font];
  if (cached) { return cached; }

  var canvas = document.createElement('canvas');
  canvas.setAttribute('moz-opaque', 'true');
  canvas.setAttribute('width', '1px');
  canvas.setAttribute('height', '1px');
  debug('created canvas', canvas);

  var ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.font = font;

  return cache[font] = ctx;
}

/**
 * Trim leading, trailing
 * and excess whitespace.
 *
 * @param  {String} text
 * @return {String}
 */
function trim(text) {
  return text.replace(/\s+/g, ' ').trim();
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('font-fit',this));
