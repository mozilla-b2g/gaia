'use strict';

// This should be fixed at a plaftorm level using
// an utf8 normalized form.
// Platform bug: https://bugzilla.mozilla.org/show_bug.cgi?id=779068
// Please remove when this bug is fixed.

function normalizeText(value) {
  var map = [
    ['[àáâãäå]', 'a'],
    ['æ', 'ae'],
    ['ç', 'c'],
    ['[èéêë]', 'e'],
    ['[ìíîï]', 'i'],
    ['ñ', 'n'],
    ['[òóôõö]', 'o'],
    ['œ', 'oe'],
    ['[ùúûü]', 'u'],
    ['[ýÿ]', 'y']
  ];

  for (var i = 0; i < map.length; i++) {
    value = value.replace(new RegExp(map[i][0], 'gi'), function(match) {
      if (match.toUpperCase() === match) {
        return map[i][1].toUpperCase();
      } else {
        return map[i][1];
      }
    });
  }

  return value;
}
