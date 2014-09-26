// asuth.

/**
 * ASCII-encoding tricks, particularly ordered-base64 encoding for
 * lexicographically ordered things like IndexedDB or 64-bit number support that
 * we can't use JS numbers for.
 *
 * The math logic is by me (asuth); hopefully it's not too embarassing.
 **/

define(
  [
    'exports'
  ],
  function(
    exports
  ) {

/**
 * A lexicographically ordered base64 encoding.  Our two extra characters are {
 * and } because they are at the top of the ordering space and have a clear (to
 * JS coders) ordering which makes it tractable to eyeball an encoded value and
 * not be completely confused/misled.
 */
var ORDERED_ARBITRARY_BASE64_CHARS = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd',
  'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
  'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
  'y', 'z', '{', '}'
];
/**
 * Zero padding to get us up to the maximum encoding length of a 64-bit value in
 * our encoding (11) or for decimal re-conversion (16).
 */
var ZERO_PADDING = '0000000000000000';

/**
 * Encode a JS int in our base64 encoding.
 */
function encodeInt(v, padTo) {
  var sbits = [];
  do {
    // note: bitwise ops are 32-bit only.
    // so, this is fine:
    sbits.push(ORDERED_ARBITRARY_BASE64_CHARS[v & 0x3f]);
    // but this can't be >>> 6 and has to be a divide.
    v = Math.floor(v / 64);
  } while (v > 0);
  sbits.reverse();
  var estr = sbits.join('');
  if (padTo && estr.length < padTo)
    return ZERO_PADDING.substring(0, padTo - estr.length) + estr;
  return estr;
}
exports.encodeInt = encodeInt;

/**
 * 10^14 >> 14 so that its 'lowest' binary 1 ends up in the one's place.  It
 * is encoded in 33 bits itself.
 */
var E10_14_RSH_14 = Math.pow(10, 14) / Math.pow(2, 14),
      P2_14 = Math.pow(2, 14),
      P2_22 = Math.pow(2, 22),
      P2_32 = Math.pow(2, 32),
      P2_36 = Math.pow(2, 36),
      MASK32 = 0xffffffff;

/**
 * Convert a decimal uint64 string to a compact string representation that can
 * be compared using our helper method `cmpUI64`.  We could do direct straight
 * string comparison if we were willing to pad all strings out to 11 characters,
 * but that's a lot of overhead considering that we expect a lot of our values
 * to be muuuuch smaller.  (Appropriate padding can be requested for cases
 * where the ordering is explicitly desired, like IndexedDB keys.  Just only
 * request as many bits as you really need!)
 *
 * JS can handle up to 2^53 reliably which means that for numbers larger than
 * that we will have to do a second parse.  For that to work (easily), we need
 * to pick a power of 10 to cut at where the smallest '1' in its binary encoding
 * is at least in the 14th bit so we can pre-shift off 13 bits so when we
 * multiply by 10 we don't go floating point, as it were.  (We also need to add
 * in the relevant bits from the lower parse appropriately shifted.)
 */
exports.parseUI64 = function p(s, padTo) {
  // 2^53 is 16 digits long, so any string shorter than that can be handled
  // by the built-in logic.
  if (s.length < 16) {
    return encodeInt(parseInt(s, 10));
  }

  var lowParse = parseInt(s.substring(s.length - 14), 10),
      highParse = parseInt(s.substring(0, s.length - 14), 10),
      // multiply the high parse by our scaled power of 10
      rawHighBits = highParse * E10_14_RSH_14;

  // Now lowParse's low 14 bits are valid, but everything above that needs to
  // be mixed (by addition) with rawHighBits.  We'll mix in 22 bits from
  // rawHighBits to get lowBits to 36 useful bits.  The main thing is to lop off
  // the higher bits in rawHighBits that we don't want so they don't go float.
  // We do want the 37rd bit if there was addition overflow to carry to the
  // upper calculation.
  var lowBitsAdded = (((rawHighBits % P2_36) * P2_14) % P2_36 +
                      lowParse % P2_36),
      lowBits = lowBitsAdded % P2_36,
      overflow = Math.floor(lowBitsAdded / P2_36) % 2;

  // We can lop off the low 22-bits of the high bits (since lowBits is taking
  // care of that) and combine that with the bits of low above 36.
  var highBits = Math.floor(rawHighBits / P2_22) +
                 Math.floor(lowParse / P2_36) + overflow;

  var outStr = encodeInt(highBits) + encodeInt(lowBits, 6);
  if (padTo && outStr.length < padTo)
    return ZERO_PADDING.substring(0, padTo - outStr.length) + outStr;
  return outStr;
};

exports.cmpUI64 = function(a, b) {
  // longer equals bigger!
  var c = a.length - b.length;
  if (c !== 0)
    return c;

  if (a < b)
    return -1;
  else if (a > b)
    return 1;
  return 0;
};

/**
 * Convert the output of `parseUI64` back into a decimal string.
 */
exports.decodeUI64 = function d(es) {
  var iNonZero = 0;
  for (;es.charCodeAt(iNonZero) === 48; iNonZero++) {
  }
  if (iNonZero)
    es = es.substring(iNonZero);

  var v, i;
  // 8 characters is 48 bits, JS can do that internally.
  if (es.length <= 8) {
    v = 0;
    for (i = 0; i < es.length; i++) {
      v = v * 64 + ORDERED_ARBITRARY_BASE64_CHARS.indexOf(es[i]);
    }
    return v.toString(10);
  }

  // upper-string gets 28 bits (that could hold 30), lower-string gets 36 bits.
  // This is how we did things in encoding is why.
  var ues = es.substring(0, es.length - 6), uv = 0,
      les = es.substring(es.length - 6), lv = 0;

  for (i = 0; i < ues.length; i++) {
    uv = uv * 64 + ORDERED_ARBITRARY_BASE64_CHARS.indexOf(ues[i]);
  }
  for (i = 0; i < les.length; i++) {
    lv = lv * 64 + ORDERED_ARBITRARY_BASE64_CHARS.indexOf(les[i]);
  }

  // Do the division to figure out the "high" string from our encoding (a whole
  // number.)  Then subtract that whole number off our effective number, leaving
  // us dealing with <53 bits so we can just hand it off to the JS engine.

  var rsh14val = (uv * P2_22 + Math.floor(lv / P2_14)),
      uraw = rsh14val / E10_14_RSH_14,
      udv = Math.floor(uraw),
      uds = udv.toString();

  var rsh14Leftover = rsh14val - udv * E10_14_RSH_14,
      lowBitsRemoved = rsh14Leftover * P2_14 + lv % P2_14;

  var lds = lowBitsRemoved.toString();
  if (lds.length < 14)
    lds = ZERO_PADDING.substring(0, 14 - lds.length) + lds;

  return uds + lds;
};
//d(p('10000000000000000'));
//d(p('18014398509481984'));
//d(p('1171221845949812801'));

}); // end define
