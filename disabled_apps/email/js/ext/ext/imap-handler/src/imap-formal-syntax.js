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

    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.imapFormalSyntax = factory();
    }
}(this, function() {

    'use strict';

    // IMAP Formal Syntax
    // http://tools.ietf.org/html/rfc3501#section-9

    function expandRange(start, end) {
        var chars = [];
        for (var i = start; i <= end; i++) {
            chars.push(i);
        }
        return String.fromCharCode.apply(String, chars);
    }

    function excludeChars(source, exclude) {
        var sourceArr = Array.prototype.slice.call(source);
        for (var i = sourceArr.length - 1; i >= 0; i--) {
            if (exclude.indexOf(sourceArr[i]) >= 0) {
                sourceArr.splice(i, 1);
            }
        }
        return sourceArr.join('');
    }

    return {

        CHAR: function() {
            var value = expandRange(0x01, 0x7F);
            this.CHAR = function() {
                return value;
            };
            return value;
        },

        CHAR8: function() {
            var value = expandRange(0x01, 0xFF);
            this.CHAR8 = function() {
                return value;
            };
            return value;
        },

        SP: function() {
            return ' ';
        },

        CTL: function() {
            var value = expandRange(0x00, 0x1F) + '\x7F';
            this.CTL = function() {
                return value;
            };
            return value;
        },

        DQUOTE: function() {
            return '"';
        },

        ALPHA: function() {
            var value = expandRange(0x41, 0x5A) + expandRange(0x61, 0x7A);
            this.ALPHA = function() {
                return value;
            };
            return value;
        },

        DIGIT: function() {
            var value = expandRange(0x30, 0x39) + expandRange(0x61, 0x7A);
            this.DIGIT = function() {
                return value;
            };
            return value;
        },

        'ATOM-CHAR': function() {
            var value = excludeChars(this.CHAR(), this['atom-specials']());
            this['ATOM-CHAR'] = function() {
                return value;
            };
            return value;
        },

        'ASTRING-CHAR': function() {
            var value = this['ATOM-CHAR']() + this['resp-specials']();
            this['ASTRING-CHAR'] = function() {
                return value;
            };
            return value;
        },

        'TEXT-CHAR': function() {
            var value = excludeChars(this.CHAR(), '\r\n');
            this['TEXT-CHAR'] = function() {
                return value;
            };
            return value;
        },

        'atom-specials': function() {
            var value = '(' + ')' + '{' + this.SP() + this.CTL() + this['list-wildcards']() +
                this['quoted-specials']() + this['resp-specials']();
            this['atom-specials'] = function() {
                return value;
            };
            return value;
        },

        'list-wildcards': function() {
            return '%' + '*';
        },

        'quoted-specials': function() {
            var value = this.DQUOTE() + '\\';
            this['quoted-specials'] = function() {
                return value;
            };
            return value;
        },

        'resp-specials': function() {
            return ']';
        },

        tag: function() {
            var value = excludeChars(this['ASTRING-CHAR'](), '+');
            this.tag = function() {
                return value;
            };
            return value;
        },

        command: function() {
            var value = this.ALPHA() + this.DIGIT();
            this.command = function() {
                return value;
            };
            return value;
        },

        verify: function(str, allowedChars) {
            for (var i = 0, len = str.length; i < len; i++) {
                if (allowedChars.indexOf(str.charAt(i)) < 0) {
                    return i;
                }
            }
            return -1;
        }
    };
}));