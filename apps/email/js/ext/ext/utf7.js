// Copyright (c) 2010-2011 Konstantin Käfer

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

(function(root, factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.utf7 = factory();
    }
}(this, function() {
    'use strict';

    function encode(str) {
        var b = new Uint8Array(str.length * 2),
            octets = '',
            i, bi, len, c, encoded;

        for (i = 0, bi = 0, len = str.length; i < len; i++) {
            // Note that we can't simply convert a UTF-8 string to Base64 because
            // UTF-8 uses a different encoding. In modified UTF-7, all characters
            // are represented by their two byte Unicode ID.
            c = str.charCodeAt(i);
            // Upper 8 bits shifted into lower 8 bits so that they fit into 1 byte.
            b[bi++] = c >> 8;
            // Lower 8 bits. Cut off the upper 8 bits so that they fit into 1 byte.
            b[bi++] = c & 0xFF;
        }

        // Convert b:Uint8Array to a binary string
        for (i = 0, len = b.length; i < len; i++) {
            octets += String.fromCharCode(b[i]);
        }

        // Modified Base64 uses , instead of / and omits trailing =.
        encoded = '';
        if (typeof window !== 'undefined' && btoa) {
            encoded = btoa(octets);
        } else {
            encoded = (new Buffer(octets, "binary")).toString("base64");
        }
        return encoded.replace(/=+$/, '');
    }

    /**
     * Safe base64 decoding. Does not throw on unexpected input.
     *
     * Implementation from the MDN docs:
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Base64_encoding_and_decoding
     * (MDN code samples are MIT licensed)
     *
     * @param {String} base64Str Base64 encoded string
     * @returns {Uint8Array} Decoded binary blob
     */
    function base64toTypedArray(base64Str) {
        var bitsSoFar = 0;
        var validBits = 0;
        var iOut = 0;
        var arr = new Uint8Array(Math.ceil(base64Str.length * 3 / 4));
        var c;
        var bits;

        for (var i = 0, len = base64Str.length; i < len; i++) {
            c = base64Str.charCodeAt(i);
            if (c >= 0x41 && c <= 0x5a) { // [A-Z]
                bits = c - 0x41;
            } else if (c >= 0x61 && c <= 0x7a) { // [a-z]
                bits = c - 0x61 + 0x1a;
            } else if (c >= 0x30 && c <= 0x39) { // [0-9]
                bits = c - 0x30 + 0x34;
            } else if (c === 0x2b) { // +
                bits = 0x3e;
            } else if (c === 0x2f) { // /
                bits = 0x3f;
            } else if (c === 0x3d) { // =
                validBits = 0;
                continue;
            } else {
                // ignore all other characters!
                continue;
            }
            bitsSoFar = (bitsSoFar << 6) | bits;
            validBits += 6;
            if (validBits >= 8) {
                validBits -= 8;
                arr[iOut++] = bitsSoFar >> validBits;
                if (validBits === 2) {
                    bitsSoFar &= 0x03;
                } else if (validBits === 4) {
                    bitsSoFar &= 0x0f;
                }
            }
        }

        if (iOut < arr.length) {
            return arr.subarray(0, iOut);
        }
        return arr;
    }

    function decode(str) {
        var octets = base64toTypedArray(str),
            r = [];

        for (var i = 0, len = octets.length; i < len;) {
            // Calculate charcode from two adjacent bytes.
            r.push(String.fromCharCode(octets[i++] << 8 | octets[i++]));
        }
        return r.join('');
    }

    // Escape RegEx from http://simonwillison.net/2006/Jan/20/escape/
    function escape(chars) {
        return chars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }

    // Character classes defined by RFC 2152.
    var setD = 'A-Za-z0-9' + escape('\'(),-./:?'),
        setO = escape('!"#$%&*;<=>@[]^_\'{|}'),
        setW = escape(' \r\n\t'),

        // Stores compiled regexes for various replacement pattern.
        regexes = {},
        regexAll = new RegExp('[^' + setW + setD + setO + ']+', 'g');

    return {
        // RFC 2152 UTF-7 encoding.
        encode: function(str, mask) {
            // Generate a RegExp object from the string of mask characters.
            if (!mask) {
                mask = '';
            }
            if (!regexes[mask]) {
                regexes[mask] = new RegExp('[^' + setD + escape(mask) + ']+', 'g');
            }

            // We replace subsequent disallowed chars with their escape sequence.
            return str.replace(regexes[mask], function(chunk) {
                // + is represented by an empty sequence +-, otherwise call encode().
                return '+' + (chunk === '+' ? '' : encode(chunk)) + '-';
            });
        },

        // RFC 2152 UTF-7 encoding with all optionals.
        encodeAll: function(str) {
            // We replace subsequent disallowed chars with their escape sequence.
            return str.replace(regexAll, function(chunk) {
                // + is represented by an empty sequence +-, otherwise call encode().
                return '+' + (chunk === '+' ? '' : encode(chunk)) + '-';
            });
        },

        // RFC 2152 UTF-7 decoding.
        decode: function(str) {
            return str.replace(/\+([A-Za-z0-9\/]*)-?/gi, function(_, chunk) {
                // &- represents &.
                if (chunk === '') {
                    return '+';
                }
                return decode(chunk);
            });
        },

        imap: {
            // RFC 3501, section 5.1.3 UTF-7 encoding.
            encode: function(str) {
                // All printable ASCII chars except for & must be represented by themselves.
                // We replace subsequent non-representable chars with their escape sequence.
                return str.replace(/&/g, '&-').replace(/[^\x20-\x7e]+/g, function(chunk) {
                    // & is represented by an empty sequence &-, otherwise call encode().
                    chunk = (chunk === '&' ? '' : encode(chunk)).replace(/\//g, ',');
                    return '&' + chunk + '-';
                });
            },

            // RFC 3501, section 5.1.3 UTF-7 decoding.
            decode: function(str) {
                return str.replace(/&([^-]*)-/g, function(_, chunk) {
                    // &- represents &.
                    if (chunk === '') {
                        return '&';
                    }
                    return decode(chunk.replace(/,/g, '/'));
                });
            }
        }
    };
}));