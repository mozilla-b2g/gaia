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
        define(['mimefuncs', 'addressparser', 'mimeparser-tzabbr'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('mimefuncs'), require('wo-addressparser'), require('./mimeparser-tzabbr'));
    } else {
        root.MimeParser = factory(root.mimefuncs, root.addressparser, root.tzabbr);
    }

}(this, function(mimefuncs, addressparser, tzabbr) {
    'use strict';

    /**
     * Creates a parser for a mime stream
     *
     * @constructor
     */
    function MimeParser() {
        /**
         * Returned to the write calls
         */
        this.running = true;

        /**
         * Cache for parsed node objects
         */
        this.nodes = {};

        /**
         * Root node object
         */
        this.node = new MimeNode(null, this);

        /**
         * Data is written to nodes one line at the time. If entire line
         * is not received yet, buffer it before passing on
         */
        this._remainder = '';
    }

    /**
     * Writes a chunk of data to the processing queue. Splits data to lines and feeds
     * complete lines to the current node element
     *
     * @param {Uint8Array|String} chunk Chunk to be processed. Either an Uint8Array value or a 'binary' string
     */
    MimeParser.prototype.write = function(chunk) {
        if (!chunk || !chunk.length) {
            return !this.running;
        }

        var lines = (this._remainder + (typeof chunk === 'object' ?
            mimefuncs.fromTypedArray(chunk) : chunk)).split(/\r?\n/g);
        this._remainder = lines.pop();

        for (var i = 0, len = lines.length; i < len; i++) {
            this.node.writeLine(lines[i]);
        }

        return !this.running;
    };

    /**
     * Indicates that there is no more data coming
     *
     * @param {Uint8Array|String} [chunk] Final chunk to be processed
     */
    MimeParser.prototype.end = function(chunk) {
        if (chunk && chunk.length) {
            this.write(chunk);
        }

        if (this.node._lineCount || this._remainder) {
            this.node.writeLine(this._remainder);
            this._remainder = '';
        }

        if (this.node) {
            this.node.finalize();
        }

        this.onend();
    };

    /**
     * Retrieves a mime part object for specified path
     *
     *   parser.getNode('1.2.3')
     *
     * @param {String} path Path to the node
     */
    MimeParser.prototype.getNode = function(path) {
        path = path || '';
        return this.nodes['node' + path] || null;
    };

    // PARSER EVENTS

    /**
     * Override this function.
     * Called when the parsing is ended
     * @event
     */
    MimeParser.prototype.onend = function() {};

    /**
     * Override this function.
     * Called when the parsing is ended
     * @event
     * @param {Object} node Current mime part. See node.header for header lines
     */
    MimeParser.prototype.onheader = function() {};

    /**
     * Override this function.
     * Called when a body chunk is emitted
     * @event
     * @param {Object} node Current mime part
     * @param {Uint8Array} chunk Body chunk
     */
    MimeParser.prototype.onbody = function() {};

    // NODE PROCESSING

    /**
     * Creates an object that holds and manages one part of the multipart message
     *
     * @constructor
     * @param {Object} parentNode Reference to the parent element. If not specified, then this is root node
     * @param {Object} parser MimeParser object
     */
    function MimeNode(parentNode, parser) {

        // Public properties

        /**
         * An array of unfolded header lines
         */
        this.header = [];

        /**
         * An object that holds header key=value pairs
         */
        this.headers = {};

        /**
         * Path for this node
         */
        this.path = parentNode ? parentNode.path.concat(parentNode._childNodes.length + 1) : [];

        // Private properties

        /**
         * Reference to the 'master' parser object
         */
        this._parser = parser;

        /**
         * Parent node for this specific node
         */
        this._parentNode = parentNode;

        /**
         * Current state, always starts out with HEADER
         */
        this._state = 'HEADER';

        /**
         * Body buffer
         */
        this._bodyBuffer = '';

        /**
         * Line counter bor the body part
         */
        this._lineCount = 0;

        /**
         * If this is a multipart or message/rfc822 mime part, the value
         * will be converted to array and hold all child nodes for this node
         */
        this._childNodes = false;

        /**
         * Active child node (if available)
         */
        this._currentChild = false;

        /**
         * Remainder string when dealing with base64 and qp values
         */
        this._lineRemainder = '';

        /**
         * Indicates if this is a multipart node
         */
        this._isMultipart = false;

        /**
         * Stores boundary value for current multipart node
         */
        this._multipartBoundary = false;

        /**
         * Indicates if this is a message/rfc822 node
         */
        this._isRfc822 = false;

        /**
         * Stores the raw content of this node
         */
        this.raw = '';

        // Att this node to the path cache
        this._parser.nodes['node' + this.path.join('.')] = this;
    }

    // Public methods

    /**
     * Processes an enitre input line
     *
     * @param {String} line Entire input line as 'binary' string
     */
    MimeNode.prototype.writeLine = function(line) {

        this.raw += (this.raw ? '\n' : '') + line;

        if (this._state === 'HEADER') {
            this._processHeaderLine(line);
        } else if (this._state === 'BODY') {
            this._processBodyLine(line);
        }
    };

    /**
     * Processes any remainders
     */
    MimeNode.prototype.finalize = function() {
        if (this._isRfc822) {
            this._currentChild.finalize();
        } else {
            this._emitBody(true);
        }
    };

    // Private methods

    /**
     * Processes a line in the HEADER state. It the line is empty, change state to BODY
     *
     * @param {String} line Entire input line as 'binary' string
     */
    MimeNode.prototype._processHeaderLine = function(line) {
        if (!line) {
            this._parseHeaders();
            this._parser.onheader(this);
            this._state = 'BODY';
            return;
        }

        if (line.match(/^\s/) && this.header.length) {
            this.header[this.header.length - 1] += '\n' + line;
        } else {
            this.header.push(line);
        }
    };

    /**
     * Joins folded header lines and calls Content-Type and Transfer-Encoding processors
     */
    MimeNode.prototype._parseHeaders = function() {

        // Join header lines
        var key, value, hasBinary;

        for (var i = 0, len = this.header.length; i < len; i++) {
            value = this.header[i].split(':');
            key = (value.shift() || '').trim().toLowerCase();
            value = (value.join(':') || '').replace(/\n/g, '').trim();

            if (value.match(/[\u0080-\uFFFF]/)) {
                if (!this.charset) {
                    hasBinary = true;
                }
                // use default charset at first and if the actual charset is resolved, the conversion is re-run
                value = mimefuncs.charset.decode(mimefuncs.charset.convert(mimefuncs.toTypedArray(value), this.charset || 'iso-8859-1'));
            }

            if (!this.headers[key]) {
                this.headers[key] = [this._parseHeaderValue(key, value)];
            } else {
                this.headers[key].push(this._parseHeaderValue(key, value));
            }

            if (!this.charset && key === 'content-type') {
                this.charset = this.headers[key][this.headers[key].length - 1].params.charset;
            }

            if (hasBinary && this.charset) {
                // reset values and start over once charset has been resolved and 8bit content has been found
                hasBinary = false;
                this.headers = {};
                i = -1; // next iteration has i == 0
            }
        }

        this._processContentType();
        this._processContentTransferEncoding();
    };

    /**
     * Parses single header value
     * @param {String} key Header key
     * @param {String} value Value for the key
     * @return {Object} parsed header
     */
    MimeNode.prototype._parseHeaderValue = function(key, value) {
        var parsedValue, isAddress = false;

        switch (key) {
            case 'content-type':
            case 'content-transfer-encoding':
            case 'content-disposition':
            case 'dkim-signature':
                parsedValue = mimefuncs.parseHeaderValue(value);
                break;
            case 'from':
            case 'sender':
            case 'to':
            case 'reply-to':
            case 'cc':
            case 'bcc':
            case 'abuse-reports-to':
            case 'errors-to':
            case 'return-path':
            case 'delivered-to':
                isAddress = true;
                parsedValue = {
                    value: [].concat(addressparser.parse(value) || [])
                };
                break;
            case 'date':
                parsedValue = {
                    value: this._parseDate(value)
                };
                break;
            default:
                parsedValue = {
                    value: value
                };
        }
        parsedValue.initial = value;

        this._decodeHeaderCharset(parsedValue, {
            isAddress: isAddress
        });

        return parsedValue;
    };

    /**
     * Checks if a date string can be parsed. Falls back replacing timezone
     * abbrevations with timezone values
     *
     * @param {String} str Date header
     * @returns {String} UTC date string if parsing succeeded, otherwise returns input value
     */
    MimeNode.prototype._parseDate = function(str) {
        str = (str || '').toString().trim();

        var date = new Date(str);

        if (this._isValidDate(date)) {
            return date.toUTCString().replace(/GMT/, '+0000');
        }

        // Assume last alpha part is a timezone
        // Ex: "Date: Thu, 15 May 2014 13:53:30 EEST"
        str = str.replace(/\b[a-z]+$/i, function(tz) {
            tz = tz.toUpperCase();
            if (tzabbr.hasOwnProperty(tz)) {
                return tzabbr[tz];
            }
            return tz;
        });

        date = new Date(str);

        if (this._isValidDate(date)) {
            return date.toUTCString().replace(/GMT/, '+0000');
        } else {
            return str;
        }
    };

    /**
     * Checks if a value is a Date object and it contains an actual date value
     * @param {Date} date Date object to check
     * @returns {Boolean} True if the value is a valid date
     */
    MimeNode.prototype._isValidDate = function(date) {
        return Object.prototype.toString.call(date) === '[object Date]' && date.toString() !== 'Invalid Date';
    };

    MimeNode.prototype._decodeHeaderCharset = function(parsed, options) {
        options = options || {};

        // decode default value
        if (typeof parsed.value === 'string') {
            parsed.value = mimefuncs.mimeWordsDecode(parsed.value);
        }

        // decode possible params
        Object.keys(parsed.params || {}).forEach(function(key) {
            if (typeof parsed.params[key] === 'string') {
                parsed.params[key] = mimefuncs.mimeWordsDecode(parsed.params[key]);
            }
        });

        // decode addresses
        if (options.isAddress && Array.isArray(parsed.value)) {
            parsed.value.forEach(function(addr) {
                if (addr.name) {
                    addr.name = mimefuncs.mimeWordsDecode(addr.name);
                    if (Array.isArray(addr.group)) {
                        this._decodeHeaderCharset({
                            value: addr.group
                        }, {
                            isAddress: true
                        });
                    }
                }
            }.bind(this));
        }

        return parsed;
    };

    /**
     * Parses Content-Type value and selects following actions.
     */
    MimeNode.prototype._processContentType = function() {
        var contentDisposition;

        this.contentType = this.headers['content-type'] && this.headers['content-type'][0] ||
            mimefuncs.parseHeaderValue('text/plain');
        this.contentType.value = (this.contentType.value || '').toLowerCase().trim();
        this.contentType.type = (this.contentType.value.split('/').shift() || 'text');

        if (this.contentType.params && this.contentType.params.charset && !this.charset) {
            this.charset = this.contentType.params.charset;
        }

        if (this.contentType.type === 'multipart' && this.contentType.params.boundary) {
            this._childNodes = [];
            this._isMultipart = (this.contentType.value.split('/').pop() || 'mixed');
            this._multipartBoundary = this.contentType.params.boundary;
        }

        if (this.contentType.value === 'message/rfc822') {
            /**
             * Parse message/rfc822 only if the mime part is not marked with content-disposition: attachment,
             * otherwise treat it like a regular attachment
             */
            contentDisposition = this.headers['content-disposition'] && this.headers['content-disposition'][0] ||
                mimefuncs.parseHeaderValue('');
            if ((contentDisposition.value || '').toLowerCase().trim() !== 'attachment') {
                this._childNodes = [];
                this._currentChild = new MimeNode(this, this._parser);
                this._childNodes.push(this._currentChild);
                this._isRfc822 = true;
            }
        }
    };

    /**
     * Parses Content-Trasnfer-Encoding value to see if the body needs to be converted
     * before it can be emitted
     */
    MimeNode.prototype._processContentTransferEncoding = function() {
        this.contentTransferEncoding = this.headers['content-transfer-encoding'] && this.headers['content-transfer-encoding'][0] ||
            mimefuncs.parseHeaderValue('7bit');
        this.contentTransferEncoding.value = (this.contentTransferEncoding.value || '').toLowerCase().trim();
    };

    /**
     * Processes a line in the BODY state. If this is a multipart or rfc822 node,
     * passes line value to child nodes.
     *
     * @param {String} line Entire input line as 'binary' string
     */
    MimeNode.prototype._processBodyLine = function(line) {
        var curLine, match;

        this._lineCount++;

        if (this._isMultipart) {
            if (line === '--' + this._multipartBoundary) {
                if (this._currentChild) {
                    this._currentChild.finalize();
                }
                this._currentChild = new MimeNode(this, this._parser);
                this._childNodes.push(this._currentChild);
            } else if (line === '--' + this._multipartBoundary + '--') {
                if (this._currentChild) {
                    this._currentChild.finalize();
                }
                this._currentChild = false;
            } else if (this._currentChild) {
                this._currentChild.writeLine(line);
            } else {
                // Ignore body for multipart
            }
        } else if (this._isRfc822) {
            this._currentChild.writeLine(line);
        } else {
            switch (this.contentTransferEncoding.value) {
                case 'base64':
                    curLine = this._lineRemainder + line.trim();

                    if (curLine.length % 4) {
                        this._lineRemainder = curLine.substr(-curLine.length % 4);
                        curLine = curLine.substr(0, curLine.length - this._lineRemainder.length);
                    } else {
                        this._lineRemainder = '';
                    }

                    if (curLine.length) {
                        this._bodyBuffer += mimefuncs.fromTypedArray(mimefuncs.base64.decode(curLine));
                    }

                    break;
                case 'quoted-printable':
                    curLine = this._lineRemainder + (this._lineCount > 1 ? '\n' : '') + line;

                    if ((match = curLine.match(/=[a-f0-9]{0,1}$/i))) {
                        this._lineRemainder = match[0];
                        curLine = curLine.substr(0, curLine.length - this._lineRemainder.length);
                    } else {
                        this._lineRemainder = '';
                    }

                    this._bodyBuffer += curLine.replace(/\=(\r?\n|$)/g, '').replace(/=([a-f0-9]{2})/ig, function(m, code) {
                        return String.fromCharCode(parseInt(code, 16));
                    });
                    break;
                    // case '7bit':
                    // case '8bit':
                default:
                    this._bodyBuffer += (this._lineCount > 1 ? '\n' : '') + line;
                    break;
            }
        }
    };

    /**
     * Emits a chunk of the body
     *
     * @param {Boolean} forceEmit If set to true does not keep any remainders
     */
    MimeNode.prototype._emitBody = function() {
        var contentDisposition = this.headers['content-disposition'] && this.headers['content-disposition'][0] ||
            mimefuncs.parseHeaderValue('');
        var delSp;

        if (this._isMultipart || !this._bodyBuffer) {
            return;
        }

        // Process flowed text before emitting it
        if (/^text\/(plain|html)$/i.test(this.contentType.value) &&
            this.contentType.params && /^flowed$/i.test(this.contentType.params.format)) {

            delSp = /^yes$/i.test(this.contentType.params.delsp);

            this._bodyBuffer = this._bodyBuffer.
            split('\n').
            // remove soft linebreaks
            // soft linebreaks are added after space symbols
            reduce(function(previousValue, currentValue, index) {
                var body = previousValue;
                if (delSp) {
                    // delsp adds spaces to text to be able to fold it
                    // these spaces can be removed once the text is unfolded
                    body = body.replace(/[ ]+$/, '');
                }
                if (/ $/.test(previousValue) && !/(^|\n)\-\- $/.test(previousValue)) {
                    return body + currentValue;
                } else {
                    return body + '\n' + currentValue;
                }
            }).
            // remove whitespace stuffing
            // http://tools.ietf.org/html/rfc3676#section-4.4
            replace(/^ /gm, '');
        }

        this.content = mimefuncs.toTypedArray(this._bodyBuffer);

        if (/^text\/(plain|html)$/i.test(this.contentType.value) && !/^attachment$/i.test(contentDisposition.value)) {

            if (!this.charset && /^text\/html$/i.test(this.contentType.value)) {
                this.charset = this._detectHTMLCharset(this._bodyBuffer);
            }

            // decode "binary" string to an unicode string
            if (!/^utf[\-_]?8$/i.test(this.charset)) {
                this.content = mimefuncs.charset.convert(mimefuncs.toTypedArray(this._bodyBuffer), this.charset || 'iso-8859-1');
            }

            // override charset for text nodes
            this.charset = this.contentType.params.charset = 'utf-8';
        }
        this._bodyBuffer = '';

        this._parser.onbody(this, this.content);
    };

    /**
     * Detect charset from a html file
     *
     * @param {String} html Input HTML
     * @returns {String} Charset if found or undefined
     */
    MimeNode.prototype._detectHTMLCharset = function(html) {
        var charset, input, meta;

        if (typeof html !== 'string') {
            html = html.toString('ascii');
        }

        html = html.replace(/\r?\n|\r/g, " ");

        if ((meta = html.match(/<meta\s+http-equiv=["'\s]*content-type[^>]*?>/i))) {
            input = meta[0];
        }

        if (input) {
            charset = input.match(/charset\s?=\s?([a-zA-Z\-_:0-9]*);?/);
            if (charset) {
                charset = (charset[1] || '').trim().toLowerCase();
            }
        }

        if (!charset && (meta = html.match(/<meta\s+charset=["'\s]*([^"'<>\/\s]+)/i))) {
            charset = (meta[1] || '').trim().toLowerCase();
        }

        return charset;
    };

    return MimeParser;
}));
