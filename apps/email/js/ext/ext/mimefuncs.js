// Copyright (c) 2013 Andris Reinman
//
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

    var encoding;

    if (typeof define === 'function' && define.amd) {
        // amd for browser
        define(['stringencoding'], function(encoding) {
            return factory(encoding.TextEncoder, encoding.TextDecoder, root.btoa);
        });
    } else if (typeof exports === 'object' && typeof navigator !== 'undefined') {
        // common.js for browser
        encoding = require('wo-stringencoding');
        module.exports = factory(encoding.TextEncoder, encoding.TextDecoder, root.btoa);
    } else if (typeof exports === 'object') {
        // common.js for node.js
        encoding = require('wo-stringencoding');
        module.exports = factory(encoding.TextEncoder, encoding.TextDecoder, function(str) {
            var NodeBuffer = require('buffer').Buffer;
            return new NodeBuffer(str, 'binary').toString("base64");
        });
    } else {
        // global for browser
        root.mimefuncs = factory(root.TextEncoder, root.TextDecoder, root.btoa);
    }
}(this, function(TextEncoder, TextDecoder, btoa) {
    'use strict';

    btoa = btoa || base64Encode;

    var mimefuncs = {
        /**
         * Encodes all non printable and non ascii bytes to =XX form, where XX is the
         * byte value in hex. This function does not convert linebreaks etc. it
         * only escapes character sequences
         *
         * @param {String|Uint8Array} data Either a string or an Uint8Array
         * @param {String} [fromCharset='UTF-8'] Source encoding
         * @return {String} Mime encoded string
         */
        mimeEncode: function(data, fromCharset) {
            fromCharset = fromCharset || 'UTF-8';

            var buffer = mimefuncs.charset.convert(data || '', fromCharset),
                ranges = [
                    [0x09],
                    [0x0A],
                    [0x0D],
                    [0x20],
                    [0x21],
                    [0x23, 0x3C],
                    [0x3E],
                    [0x40, 0x5E],
                    [0x60, 0x7E]
                ],
                result = '',
                ord;

            for (var i = 0, len = buffer.length; i < len; i++) {
                ord = buffer[i];
                // if the char is in allowed range, then keep as is, unless it is a ws in the end of a line
                if (mimefuncs._checkRanges(ord, ranges) && !((ord === 0x20 || ord === 0x09) && (i === len - 1 || buffer[i + 1] === 0x0a || buffer[i + 1] === 0x0d))) {
                    result += String.fromCharCode(ord);
                    continue;
                }
                result += '=' + (ord < 0x10 ? '0' : '') + ord.toString(16).toUpperCase();
            }

            return result;
        },

        /**
         * Decodes mime encoded string to an unicode string
         *
         * @param {String} str Mime encoded string
         * @param {String} [fromCharset='UTF-8'] Source encoding
         * @return {String} Decoded unicode string
         */
        mimeDecode: function(str, fromCharset) {
            str = (str || '').toString();

            fromCharset = fromCharset || 'UTF-8';

            var encodedBytesCount = (str.match(/\=[\da-fA-F]{2}/g) || []).length,
                bufferLength = str.length - encodedBytesCount * 2,
                chr, hex,
                buffer = new Uint8Array(bufferLength),
                bufferPos = 0;

            for (var i = 0, len = str.length; i < len; i++) {
                chr = str.charAt(i);
                if (chr === '=' && (hex = str.substr(i + 1, 2)) && /[\da-fA-F]{2}/.test(hex)) {
                    buffer[bufferPos++] = parseInt(hex, 16);
                    i += 2;
                    continue;
                }
                buffer[bufferPos++] = chr.charCodeAt(0);
            }

            return mimefuncs.charset.decode(buffer, fromCharset);
        },

        /**
         * Encodes a string or an typed array of given charset into unicode
         * base64 string. Also adds line breaks
         *
         * @param {String|Uint8Array} data String to be base64 encoded
         * @param {String} [fromCharset='UTF-8']
         * @return {String} Base64 encoded string
         */
        base64Encode: function(data, fromCharset) {
            var buf, b64;

            if (fromCharset !== 'binary' && typeof data !== 'string') {
                buf = mimefuncs.charset.convert(data || '', fromCharset);
            } else {
                buf = data;
            }

            b64 = mimefuncs.base64.encode(buf);
            return mimefuncs._addSoftLinebreaks(b64, 'base64');
        },

        /**
         * Decodes a base64 string of any charset into an unicode string
         *
         * @param {String} str Base64 encoded string
         * @param {String} [fromCharset='UTF-8'] Original charset of the base64 encoded string
         * @return {String} Decoded unicode string
         */
        base64Decode: function(str, fromCharset) {
            var buf = mimefuncs.base64.decode(str || '', 'buffer');
            return mimefuncs.charset.decode(buf, fromCharset);
        },

        /**
         * Encodes a string or an Uint8Array into a quoted printable encoding
         * This is almost the same as mimeEncode, except line breaks will be changed
         * as well to ensure that the lines are never longer than allowed length
         *
         * @param {String|Uint8Array} data String or an Uint8Array to mime encode
         * @param {String} [fromCharset='UTF-8'] Original charset of the string
         * @return {String} Mime encoded string
         */
        quotedPrintableEncode: function(data, fromCharset) {
            var mimeEncodedStr = mimefuncs.mimeEncode(data, fromCharset);

            mimeEncodedStr = mimeEncodedStr.
                // fix line breaks, ensure <CR><LF>
            replace(/\r?\n|\r/g, '\r\n').
                // replace spaces in the end of lines
            replace(/[\t ]+$/gm, function(spaces) {
                return spaces.replace(/ /g, '=20').replace(/\t/g, '=09');
            });

            // add soft line breaks to ensure line lengths sjorter than 76 bytes
            return mimefuncs._addSoftLinebreaks(mimeEncodedStr, 'qp');
        },

        /**
         * Decodes a string from a quoted printable encoding. This is almost the
         * same as mimeDecode, except line breaks will be changed as well
         *
         * @param {String} str Mime encoded string to decode
         * @param {String} [fromCharset='UTF-8'] Original charset of the string
         * @return {String} Mime decoded string
         */
        quotedPrintableDecode: function(str, fromCharset) {
            str = (str || '').toString();

            str = str.
                // remove invalid whitespace from the end of lines
            replace(/[\t ]+$/gm, '').
                // remove soft line breaks
            replace(/\=(?:\r?\n|$)/g, '');

            return mimefuncs.mimeDecode(str, fromCharset);
        },

        /**
         * Encodes a string or an Uint8Array to an UTF-8 MIME Word (rfc2047)
         *
         * @param {String|Uint8Array} data String to be encoded
         * @param {String} mimeWordEncoding='Q' Encoding for the mime word, either Q or B
         * @param {Number} [maxLength=0] If set, split mime words into several chunks if needed
         * @param {String} [fromCharset='UTF-8'] Source sharacter set
         * @return {String} Single or several mime words joined together
         */
        mimeWordEncode: function(data, mimeWordEncoding, maxLength, fromCharset) {
            mimeWordEncoding = (mimeWordEncoding || 'Q').toString().toUpperCase().trim().charAt(0);

            if (!fromCharset && typeof maxLength === 'string' && !maxLength.match(/^[0-9]+$/)) {
                fromCharset = maxLength;
                maxLength = undefined;
            }

            maxLength = maxLength || 0;

            var encodedStr,
                toCharset = 'UTF-8',
                i, len, parts;

            if (maxLength && maxLength > 7 + toCharset.length) {
                maxLength -= (7 + toCharset.length);
            }

            if (mimeWordEncoding === 'Q') {
                encodedStr = mimefuncs.mimeEncode(data, fromCharset);
                encodedStr = encodedStr.replace(/[\r\n\t_]/g, function(chr) {
                    var code = chr.charCodeAt(0);
                    return '=' + (code < 0x10 ? '0' : '') + code.toString(16).toUpperCase();
                }).replace(/\s/g, '_');
            } else if (mimeWordEncoding === 'B') {
                encodedStr = typeof data === 'string' ? data : mimefuncs.decode(data, fromCharset);
                maxLength = Math.max(3, (maxLength - maxLength % 4) / 4 * 3);
            }

            if (maxLength && encodedStr.length > maxLength) {
                if (mimeWordEncoding === 'Q') {
                    encodedStr = mimefuncs._splitMimeEncodedString(encodedStr, maxLength).join('?= =?' + toCharset + '?' + mimeWordEncoding + '?');
                } else {

                    // RFC2047 6.3 (2) states that encoded-word must include an integral number of characters, so no chopping unicode sequences
                    parts = [];
                    for (i = 0, len = encodedStr.length; i < len; i += maxLength) {
                        parts.push(mimefuncs.base64.encode(encodedStr.substr(i, maxLength)));
                    }

                    if (parts.length > 1) {
                        return '=?' + toCharset + '?' + mimeWordEncoding + '?' + parts.join('?= =?' + toCharset + '?' + mimeWordEncoding + '?') + '?=';
                    } else {
                        encodedStr = parts.join('');
                    }
                }
            } else if (mimeWordEncoding === 'B') {
                encodedStr = mimefuncs.base64.encode(encodedStr);
            }

            return '=?' + toCharset + '?' + mimeWordEncoding + '?' + encodedStr + (encodedStr.substr(-2) === '?=' ? '' : '?=');
        },

        /**
         * Finds word sequences with non ascii text and converts these to mime words
         *
         * @param {String|Uint8Array} data String to be encoded
         * @param {String} mimeWordEncoding='Q' Encoding for the mime word, either Q or B
         * @param {Number} [maxLength=0] If set, split mime words into several chunks if needed
         * @param {String} [fromCharset='UTF-8'] Source sharacter set
         * @return {String} String with possible mime words
         */
        mimeWordsEncode: function(data, mimeWordEncoding, maxLength, fromCharset) {
            if (!fromCharset && typeof maxLength === 'string' && !maxLength.match(/^[0-9]+$/)) {
                fromCharset = maxLength;
                maxLength = undefined;
            }

            maxLength = maxLength || 0;

            var decodedValue = mimefuncs.charset.decode(mimefuncs.charset.convert((data || ''), fromCharset)),
                encodedValue;

            encodedValue = decodedValue.replace(/([^\s\u0080-\uFFFF]*[\u0080-\uFFFF]+[^\s\u0080-\uFFFF]*(?:\s+[^\s\u0080-\uFFFF]*[\u0080-\uFFFF]+[^\s\u0080-\uFFFF]*\s*)?)+/g, function(match) {
                return match.length ? mimefuncs.mimeWordEncode(match, mimeWordEncoding || 'Q', maxLength) : '';
            });

            return encodedValue;
        },

        /**
         * Decode a complete mime word encoded string
         *
         * @param {String} str Mime word encoded string
         * @return {String} Decoded unicode string
         */
        mimeWordDecode: function(str) {
            str = (str || '').toString().trim();

            var fromCharset, encoding, match;

            match = str.match(/^\=\?([\w_\-\*]+)\?([QqBb])\?([^\?]+)\?\=$/i);
            if (!match) {
                return str;
            }

            // RFC2231 added language tag to the encoding
            // see: https://tools.ietf.org/html/rfc2231#section-5
            // this implementation silently ignores this tag
            fromCharset = match[1].split('*').shift();

            encoding = (match[2] || 'Q').toString().toUpperCase();
            str = (match[3] || '').replace(/_/g, ' ');

            if (encoding === 'B') {
                return mimefuncs.base64Decode(str, fromCharset);
            } else if (encoding === 'Q') {
                return mimefuncs.mimeDecode(str, fromCharset);
            } else {
                return str;
            }

        },

        /**
         * Decode a string that might include one or several mime words
         *
         * @param {String} str String including some mime words that will be encoded
         * @return {String} Decoded unicode string
         */
        mimeWordsDecode: function(str) {
            str = (str || '').toString();
            str = str.
            replace(/(=\?[^?]+\?[QqBb]\?[^?]+\?=)\s+(?==\?[^?]+\?[QqBb]\?[^?]+\?=)/g, '$1').
            replace(/\=\?([\w_\-\*]+)\?([QqBb])\?[^\?]+\?\=/g, function(mimeWord) {
                return mimefuncs.mimeWordDecode(mimeWord);
            });

            return str;
        },

        /**
         * Folds long lines, useful for folding header lines (afterSpace=false) and
         * flowed text (afterSpace=true)
         *
         * @param {String} str String to be folded
         * @param {Number} [lineLengthMax=76] Maximum length of a line
         * @param {Boolean} afterSpace If true, leave a space in th end of a line
         * @return {String} String with folded lines
         */
        foldLines: function(str, lineLengthMax, afterSpace) {
            str = (str || '').toString();
            lineLengthMax = lineLengthMax || 76;

            var pos = 0,
                len = str.length,
                result = '',
                line, match;

            while (pos < len) {
                line = str.substr(pos, lineLengthMax);
                if (line.length < lineLengthMax) {
                    result += line;
                    break;
                }
                if ((match = line.match(/^[^\n\r]*(\r?\n|\r)/))) {
                    line = match[0];
                    result += line;
                    pos += line.length;
                    continue;
                } else if ((match = line.match(/(\s+)[^\s]*$/)) && match[0].length - (afterSpace ? (match[1] || '').length : 0) < line.length) {
                    line = line.substr(0, line.length - (match[0].length - (afterSpace ? (match[1] || '').length : 0)));
                } else if ((match = str.substr(pos + line.length).match(/^[^\s]+(\s*)/))) {
                    line = line + match[0].substr(0, match[0].length - (!afterSpace ? (match[1] || '').length : 0));
                }

                result += line;
                pos += line.length;
                if (pos < len) {
                    result += '\r\n';
                }
            }

            return result;
        },

        /**
         * Encodes and folds a header line for a MIME message header.
         * Shorthand for mimeWordsEncode + foldLines
         *
         * @param {String} key Key name, will not be encoded
         * @param {String|Uint8Array} value Value to be encoded
         * @param {String} [fromCharset='UTF-8'] Character set of the value
         * @return {String} encoded and folded header line
         */
        headerLineEncode: function(key, value, fromCharset) {
            var encodedValue = mimefuncs.mimeWordsEncode(value, 'Q', 52, fromCharset);
            return mimefuncs.foldLines(key + ': ' + encodedValue, 76);
        },

        /**
         * Splits a string by :
         * The result is not mime word decoded, you need to do your own decoding based
         * on the rules for the specific header key
         *
         * @param {String} headerLine Single header line, might include linebreaks as well if folded
         * @return {Object} And object of {key, value}
         */
        headerLineDecode: function(headerLine) {
            var line = (headerLine || '').toString().replace(/(?:\r?\n|\r)[ \t]*/g, ' ').trim(),
                match = line.match(/^\s*([^:]+):(.*)$/),
                key = (match && match[1] || '').trim(),
                value = (match && match[2] || '').trim();

            return {
                key: key,
                value: value
            };
        },

        /**
         * Parses a block of header lines. Does not decode mime words as every
         * header might have its own rules (eg. formatted email addresses and such)
         *
         * @param {String} headers Headers string
         * @return {Object} An object of headers, where header keys are object keys. NB! Several values with the same key make up an Array
         */
        headerLinesDecode: function(headers) {
            var lines = headers.split(/\r?\n|\r/),
                headersObj = {},
                key, value,
                header,
                i, len;

            for (i = lines.length - 1; i >= 0; i--) {
                if (i && lines[i].match(/^\s/)) {
                    lines[i - 1] += '\r\n' + lines[i];
                    lines.splice(i, 1);
                }
            }

            for (i = 0, len = lines.length; i < len; i++) {
                header = mimefuncs.headerLineDecode(lines[i]);
                key = (header.key || '').toString().toLowerCase().trim();
                value = header.value || '';

                if (!headersObj[key]) {
                    headersObj[key] = value;
                } else {
                    headersObj[key] = [].concat(headersObj[key], value);
                }
            }

            return headersObj;
        },

        /**
         * Converts 'binary' string to an Uint8Array
         *
         * @param {String} 'binary' string
         * @return {Uint8Array} Octet stream buffer
         */
        toTypedArray: function(binaryString) {
            var buf = new Uint8Array(binaryString.length);
            for (var i = 0, len = binaryString.length; i < len; i++) {
                buf[i] = binaryString.charCodeAt(i);
            }
            return buf;
        },

        /**
         * Converts an Uint8Array to 'binary' string
         *
         * @param {Uint8Array} buf Octet stream buffer
         * @return {String} 'binary' string
         */
        fromTypedArray: function(buf) {
            var i, l;

            // ensure the value is a Uint8Array, not ArrayBuffer if used
            if (!buf.buffer) {
                buf = new Uint8Array(buf);
            }

            var sbits = new Array(buf.length);
            for (i = 0, l = buf.length; i < l; i++) {
                sbits[i] = String.fromCharCode(buf[i]);
            }

            return sbits.join('');
        },

        /**
         * Parses a header value with key=value arguments into a structured
         * object.
         *
         *   parseHeaderValue('content-type: text/plain; CHARSET='UTF-8'') ->
         *   {
         *     'value': 'text/plain',
         *     'params': {
         *       'charset': 'UTF-8'
         *     }
         *   }
         *
         * @param {String} str Header value
         * @return {Object} Header value as a parsed structure
         */
        parseHeaderValue: function(str) {
            var response = {
                    value: false,
                    params: {}
                },
                key = false,
                value = '',
                type = 'value',
                quote = false,
                escaped = false,
                chr;

            for (var i = 0, len = str.length; i < len; i++) {
                chr = str.charAt(i);
                if (type === 'key') {
                    if (chr === '=') {
                        key = value.trim().toLowerCase();
                        type = 'value';
                        value = '';
                        continue;
                    }
                    value += chr;
                } else {
                    if (escaped) {
                        value += chr;
                    } else if (chr === '\\') {
                        escaped = true;
                        continue;
                    } else if (quote && chr === quote) {
                        quote = false;
                    } else if (!quote && chr === '"') {
                        quote = chr;
                    } else if (!quote && chr === ';') {
                        if (key === false) {
                            response.value = value.trim();
                        } else {
                            response.params[key] = value.trim();
                        }
                        type = 'key';
                        value = '';
                    } else {
                        value += chr;
                    }
                    escaped = false;

                }
            }

            if (type === 'value') {
                if (key === false) {
                    response.value = value.trim();
                } else {
                    response.params[key] = value.trim();
                }
            } else if (value.trim()) {
                response.params[value.trim().toLowerCase()] = '';
            }

            // handle parameter value continuations
            // https://tools.ietf.org/html/rfc2231#section-3

            // preprocess values
            Object.keys(response.params).forEach(function(key) {
                var actualKey, nr, match, value;
                if ((match = key.match(/(\*(\d+)|\*(\d+)\*|\*)$/))) {
                    actualKey = key.substr(0, match.index);
                    nr = Number(match[2] || match[3]) || 0;

                    if (!response.params[actualKey] || typeof response.params[actualKey] !== 'object') {
                        response.params[actualKey] = {
                            charset: false,
                            values: []
                        };
                    }

                    value = response.params[key];

                    if (nr === 0 && match[0].substr(-1) === '*' && (match = value.match(/^([^']*)'[^']*'(.*)$/))) {
                        response.params[actualKey].charset = match[1] || 'iso-8859-1';
                        value = match[2];
                    }

                    response.params[actualKey].values[nr] = value;

                    // remove the old reference
                    delete response.params[key];
                }
            });

            // concatenate split rfc2231 strings and convert encoded strings to mime encoded words
            Object.keys(response.params).forEach(function(key) {
                var value;
                if (response.params[key] && Array.isArray(response.params[key].values)) {
                    value = response.params[key].values.map(function(val) {
                        return val || '';
                    }).join('');

                    if (response.params[key].charset) {
                        // convert "%AB" to "=?charset?Q?=AB?="
                        response.params[key] = '=?' +
                            response.params[key].charset +
                            '?Q?' +
                            value.
                            // fix invalidly encoded chars
                        replace(/[=\?_\s]/g, function(s) {
                                var c = s.charCodeAt(0).toString(16);
                                if (s === ' ') {
                                    return '_';
                                } else {
                                    return '%' + (c.length < 2 ? '0' : '') + c;
                                }
                            }).
                            // change from urlencoding to percent encoding
                        replace(/%/g, '=') +
                            '?=';
                    } else {
                        response.params[key] = value;
                    }
                }
            }.bind(this));

            return response;
        },

        /**
         * Encodes a string or an Uint8Array to an UTF-8 Parameter Value Continuation encoding (rfc2231)
         * Useful for splitting long parameter values.
         *
         * For example
         *      title="unicode string"
         * becomes
         *     title*0*="utf-8''unicode"
         *     title*1*="%20string"
         *
         * @param {String|Uint8Array} data String to be encoded
         * @param {Number} [maxLength=50] Max length for generated chunks
         * @param {String} [fromCharset='UTF-8'] Source sharacter set
         * @return {Array} A list of encoded keys and headers
         */
        continuationEncode: function(key, data, maxLength, fromCharset) {
            var list = [];
            var encodedStr = typeof data === 'string' ? data : mimefuncs.decode(data, fromCharset);
            var chr;
            var line;
            var startPos = 0;
            var isEncoded = false;

            maxLength = maxLength || 50;

            // process ascii only text
            if (/^[\w.\- ]*$/.test(data)) {

                // check if conversion is even needed
                if (encodedStr.length <= maxLength) {
                    return [{
                        key: key,
                        value: /[\s";=]/.test(encodedStr) ? '"' + encodedStr + '"' : encodedStr
                    }];
                }

                encodedStr = encodedStr.replace(new RegExp('.{' + maxLength + '}', 'g'), function(str) {
                    list.push({
                        line: str
                    });
                    return '';
                });

                if (encodedStr) {
                    list.push({
                        line: encodedStr
                    });
                }

            } else {

                // first line includes the charset and language info and needs to be encoded
                // even if it does not contain any unicode characters
                line = 'utf-8\'\'';
                isEncoded = true;
                startPos = 0;
                // process text with unicode or special chars
                for (var i = 0, len = encodedStr.length; i < len; i++) {

                    chr = encodedStr[i];

                    if (isEncoded) {
                        chr = encodeURIComponent(chr);
                    } else {
                        // try to urlencode current char
                        chr = chr === ' ' ? chr : encodeURIComponent(chr);
                        // By default it is not required to encode a line, the need
                        // only appears when the string contains unicode or special chars
                        // in this case we start processing the line over and encode all chars
                        if (chr !== encodedStr[i]) {
                            // Check if it is even possible to add the encoded char to the line
                            // If not, there is no reason to use this line, just push it to the list
                            // and start a new line with the char that needs encoding
                            if ((encodeURIComponent(line) + chr).length >= maxLength) {
                                list.push({
                                    line: line,
                                    encoded: isEncoded
                                });
                                line = '';
                                startPos = i - 1;
                            } else {
                                isEncoded = true;
                                i = startPos;
                                line = '';
                                continue;
                            }
                        }
                    }

                    // if the line is already too long, push it to the list and start a new one
                    if ((line + chr).length >= maxLength) {
                        list.push({
                            line: line,
                            encoded: isEncoded
                        });
                        line = chr = encodedStr[i] === ' ' ? ' ' : encodeURIComponent(encodedStr[i]);
                        if (chr === encodedStr[i]) {
                            isEncoded = false;
                            startPos = i - 1;
                        } else {
                            isEncoded = true;
                        }
                    } else {
                        line += chr;
                    }
                }

                if (line) {
                    list.push({
                        line: line,
                        encoded: isEncoded
                    });
                }
            }

            return list.map(function(item, i) {
                return {
                    // encoded lines: {name}*{part}*
                    // unencoded lines: {name}*{part}
                    // if any line needs to be encoded then the first line (part==0) is always encoded
                    key: key + '*' + i + (item.encoded ? '*' : ''),
                    value: /[\s";=]/.test(item.line) ? '"' + item.line + '"' : item.line
                };
            });
        },

        /**
         * Splits a mime encoded string. Needed for dividing mime words into smaller chunks
         *
         * @param {String} str Mime encoded string to be split up
         * @param {Number} maxlen Maximum length of characters for one part (minimum 12)
         * @return {Array} Split string
         */
        _splitMimeEncodedString: function(str, maxlen) {
            var curLine, match, chr, done,
                lines = [];

            // require at least 12 symbols to fit possible 4 octet UTF-8 sequences
            maxlen = Math.max(maxlen || 0, 12);

            while (str.length) {
                curLine = str.substr(0, maxlen);

                // move incomplete escaped char back to main
                if ((match = curLine.match(/\=[0-9A-F]?$/i))) {
                    curLine = curLine.substr(0, match.index);
                }

                done = false;
                while (!done) {
                    done = true;
                    // check if not middle of a unicode char sequence
                    if ((match = str.substr(curLine.length).match(/^\=([0-9A-F]{2})/i))) {
                        chr = parseInt(match[1], 16);
                        // invalid sequence, move one char back anc recheck
                        if (chr < 0xC2 && chr > 0x7F) {
                            curLine = curLine.substr(0, curLine.length - 3);
                            done = false;
                        }
                    }
                }

                if (curLine.length) {
                    lines.push(curLine);
                }
                str = str.substr(curLine.length);
            }

            return lines;
        },

        /**
         * Adds soft line breaks (the ones that will be stripped out when decoding) to
         * ensure that no line in the message is never longer than 76 symbols
         *
         * Lines can't be longer than 76 + <CR><LF> = 78 bytes
         * http://tools.ietf.org/html/rfc2045#section-6.7
         *
         * @param {String} str Encoded string
         * @param {String} encoding Either "qp" or "base64" (the default)
         * @return {String} String with forced line breaks
         */
        _addSoftLinebreaks: function(str, encoding) {
            var lineLengthMax = 76;

            encoding = (encoding || 'base64').toString().toLowerCase().trim();

            if (encoding === 'qp') {
                return mimefuncs._addQPSoftLinebreaks(str, lineLengthMax);
            } else {
                return mimefuncs._addBase64SoftLinebreaks(str, lineLengthMax);
            }
        },

        /**
         * Adds soft line breaks (the ones that will be stripped out when decoding base64) to
         * ensure that no line in the message is never longer than lineLengthMax
         *
         * @param {String} base64EncodedStr String in BASE64 encoding
         * @param {Number} lineLengthMax Maximum length of a line
         * @return {String} String with forced line breaks
         */
        _addBase64SoftLinebreaks: function(base64EncodedStr, lineLengthMax) {
            base64EncodedStr = (base64EncodedStr || '').toString().trim();
            return base64EncodedStr.replace(new RegExp('.{' + lineLengthMax + '}', 'g'), '$&\r\n').trim();
        },

        /**
         * Adds soft line breaks(the ones that will be stripped out when decoding QP) to * ensure that no line in the message is never longer than lineLengthMax * * Not sure of how and why this works, but at least it seems to be working: /
         *
         * @param {String} qpEncodedStr String in Quoted-Printable encoding
         * @param {Number} lineLengthMax Maximum length of a line
         * @return {String} String with forced line breaks
         */
        _addQPSoftLinebreaks: function(qpEncodedStr, lineLengthMax) {
            qpEncodedStr = (qpEncodedStr || '').toString();

            lineLengthMax = lineLengthMax || 76;

            var pos = 0,
                len = qpEncodedStr.length,
                match, code, line,
                lineMargin = Math.floor(lineLengthMax / 3),
                result = '';

            // insert soft linebreaks where needed
            while (pos < len) {
                line = qpEncodedStr.substr(pos, lineLengthMax);
                if ((match = line.match(/\r\n/))) {
                    line = line.substr(0, match.index + match[0].length);
                    result += line;
                    pos += line.length;
                    continue;
                }

                if (line.substr(-1) === '\n') {
                    // nothing to change here
                    result += line;
                    pos += line.length;
                    continue;
                } else if ((match = line.substr(-lineMargin).match(/\n.*?$/))) {
                    // truncate to nearest line break
                    line = line.substr(0, line.length - (match[0].length - 1));
                    result += line;
                    pos += line.length;
                    continue;
                } else if (line.length > lineLengthMax - lineMargin && (match = line.substr(-lineMargin).match(/[ \t\.,!\?][^ \t\.,!\?]*$/))) {
                    // truncate to nearest space
                    line = line.substr(0, line.length - (match[0].length - 1));
                } else if (line.substr(-1) === '\r') {
                    line = line.substr(0, line.length - 1);
                } else {
                    if (line.match(/\=[\da-f]{0,2}$/i)) {

                        // push incomplete encoding sequences to the next line
                        if ((match = line.match(/\=[\da-f]{0,1}$/i))) {
                            line = line.substr(0, line.length - match[0].length);
                        }

                        // ensure that utf-8 sequences are not split
                        while (line.length > 3 && line.length < len - pos && !line.match(/^(?:=[\da-f]{2}){1,4}$/i) && (match = line.match(/\=[\da-f]{2}$/ig))) {
                            code = parseInt(match[0].substr(1, 2), 16);
                            if (code < 128) {
                                break;
                            }

                            line = line.substr(0, line.length - 3);

                            if (code >= 0xC0) {
                                break;
                            }
                        }

                    }
                }

                if (pos + line.length < len && line.substr(-1) !== '\n') {
                    if (line.length === lineLengthMax && line.match(/\=[\da-f]{2}$/i)) {
                        line = line.substr(0, line.length - 3);
                    } else if (line.length === lineLengthMax) {
                        line = line.substr(0, line.length - 1);
                    }
                    pos += line.length;
                    line += '=\r\n';
                } else {
                    pos += line.length;
                }

                result += line;
            }

            return result;
        },

        /**
         * Checks if a number is in specified ranges or not
         *
         * @param {Number} nr Number to check for
         * @ranges {Array} ranges Array of range duples
         * @return {Boolean} Returns true, if nr was found to be at least one of the specified ranges
         */
        _checkRanges: function(nr, ranges) {
            for (var i = ranges.length - 1; i >= 0; i--) {
                if (!ranges[i].length) {
                    continue;
                }
                if (ranges[i].length === 1 && nr === ranges[i][0]) {
                    return true;
                }
                if (ranges[i].length === 2 && nr >= ranges[i][0] && nr <= ranges[i][1]) {
                    return true;
                }
            }
            return false;
        }
    };

    /**
     * Character set encoding and decoding functions
     */
    mimefuncs.charset = {

        /**
         * Encodes an unicode string into an Uint8Array object as UTF-8
         *
         * TextEncoder only supports unicode encodings (utf-8, utf16le/be) but no other,
         * so we force UTF-8 here.
         *
         * @param {String} str String to be encoded
         * @return {Uint8Array} UTF-8 encoded typed array
         */
        encode: function(str) {
            return new TextEncoder('UTF-8').encode(str);
        },

        /**
         * Decodes a string from Uint8Array to an unicode string using specified encoding
         *
         * @param {Uint8Array} buf Binary data to be decoded
         * @param {String} [fromCharset='UTF-8'] Binary data is decoded into string using this charset
         * @return {String} Decded string
         */
        decode: function(buf, fromCharset) {
            fromCharset = mimefuncs.charset.normalizeCharset(fromCharset || 'UTF-8');

            // ensure the value is a Uint8Array, not ArrayBuffer if used
            if (!buf.buffer) {
                buf = new Uint8Array(buf);
            }

            try {
                return new TextDecoder(fromCharset).decode(buf);
            } catch (E) {
                try {
                    return new TextDecoder('utf-8', {
                        fatal: true // if the input is not a valid utf-8 the decoder will throw
                    }).decode(buf);
                } catch (E) {
                    try {
                        return new TextDecoder('iso-8859-15').decode(buf);
                    } catch (E) {
                        // should not happen as there is something matching for every byte (non character bytes are allowed)
                        return mimefuncs.fromTypedArray(buf);
                    }
                }
            }

        },

        /**
         * Convert a string from specific encoding to UTF-8 Uint8Array
         *
         * @param {String|Uint8Array} str String to be encoded
         * @param {String} [fromCharset='UTF-8'] Source encoding for the string
         * @return {Uint8Array} UTF-8 encoded typed array
         */
        convert: function(data, fromCharset) {
            fromCharset = mimefuncs.charset.normalizeCharset(fromCharset || 'UTF-8');

            var bufString;

            if (typeof data !== 'string') {
                if (fromCharset.match(/^utf[\-_]?8$/)) {
                    return data;
                }
                bufString = mimefuncs.charset.decode(data, fromCharset);
                return mimefuncs.charset.encode(bufString);
            }
            return mimefuncs.charset.encode(data);
        },

        /**
         * Converts well known invalid character set names to proper names.
         * eg. win-1257 will be converted to WINDOWS-1257
         *
         * @param {String} charset Charset name to convert
         * @return {String} Canoninicalized charset name
         */
        normalizeCharset: function(charset) {
            var match;

            if ((match = charset.match(/^utf[\-_]?(\d+)$/i))) {
                return 'UTF-' + match[1];
            }

            if ((match = charset.match(/^win[\-_]?(\d+)$/i))) {
                return 'WINDOWS-' + match[1];
            }

            if ((match = charset.match(/^latin[\-_]?(\d+)$/i))) {
                return 'ISO-8859-' + match[1];
            }

            return charset;
        }
    };

    /**
     * Base64 encoding and decoding functions
     */
    mimefuncs.base64 = {

        /**
         * Encodes input into base64
         *
         * @param {String|Uint8Array} data Data to be encoded into base64
         * @return {String} Base64 encoded string
         */
        encode: function(data) {
            if (!data) {
                return '';
            }

            if (typeof data === 'string') {
                // window.btoa uses pseudo binary encoding, so unicode strings
                // need to be converted before encoding
                return btoa(unescape(encodeURIComponent(data)));
            }

            var len = data.byteLength,
                binStr = '';

            if (!data.buffer) {
                data.buffer = new Uint8Array(data);
            }

            for (var i = 0; i < len; i++) {
                binStr += String.fromCharCode(data[i]);
            }

            return btoa(binStr);
        },

        /**
         * Decodes base64 encoded string into an unicode string or Uint8Array
         *
         * @param {String} data Base64 encoded data
         * @param {String} [outputEncoding='buffer'] Output encoding, either 'string' or 'buffer' (Uint8Array)
         * @return {String|Uint8Array} Decoded string
         */
        decode: function(data, outputEncoding) {
            outputEncoding = (outputEncoding || 'buffer').toLowerCase().trim();

            var buf = mimefuncs.base64.toTypedArray(data);

            if (outputEncoding === 'string') {
                return mimefuncs.charset.decode(buf);
            } else {
                return buf;
            }
        },

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
        toTypedArray: function(base64Str) {
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
    };

    /*
     * Encodes a string in base 64. DedicatedWorkerGlobalScope for Safari does not provide btoa.
     * https://github.com/davidchambers/Base64.js
     */
    function base64Encode(input) {
        var str = String(input);
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        for (var block, charCode, idx = 0, map = chars, output = ''; str.charAt(idx | 0) || (map = '=', idx % 1); output += map.charAt(63 & block >> 8 - idx % 1 * 8)) {
            charCode = str.charCodeAt(idx += 3 / 4);
            if (charCode > 0xFF) {
                throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
            }
            block = block << 8 | charCode;
        }
        return output;
    }

    return mimefuncs;
}));
