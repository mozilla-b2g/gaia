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
        root.SmtpClientResponseParser = factory();
    }
}(this, function() {
    'use strict';

    /**
     * Generates a parser object for data coming from a SMTP server
     *
     * @constructor
     */
    var SmtpResponseParser = function() {

        /**
         * If the complete line is not received yet, contains the beginning of it
         */
        this._remainder = '';

        /**
         * If the response is a list, contains previous not yet emitted lines
         */
        this._block = {
            data: [],
            lines: [],
            statusCode: null
        };

        /**
         * If set to true, do not accept any more input
         */
        this.destroyed = false;
    };

    // Event handlers

    /**
     * NB! Errors do not block, the parsing and data emitting continues despite of the errors
     */
    SmtpResponseParser.prototype.onerror = function() {};
    SmtpResponseParser.prototype.ondata = function() {};
    SmtpResponseParser.prototype.onend = function() {};

    // Public API

    /**
     * Queue some data from the server for parsing. Only allowed, if 'end' has not been called yet
     *
     * @param {String} chunk Chunk of data received from the server
     */
    SmtpResponseParser.prototype.send = function(chunk) {
        if (this.destroyed) {
            return this.onerror(new Error('This parser has already been closed, "write" is prohibited'));
        }

        // Lines should always end with <CR><LF> but you never know, might be only <LF> as well
        var lines = (this._remainder + (chunk || '')).split(/\r?\n/);
        this._remainder = lines.pop(); // not sure if the line has completely arrived yet

        for (var i = 0, len = lines.length; i < len; i++) {
            this._processLine(lines[i]);
        }
    };

    /**
     * Indicate that all the data from the server has been received. Can be called only once.
     *
     * @param {String} [chunk] Chunk of data received from the server
     */
    SmtpResponseParser.prototype.end = function(chunk) {
        if (this.destroyed) {
            return this.onerror(new Error('This parser has already been closed, "end" is prohibited'));
        }

        if (chunk) {
            this.send(chunk);
        }

        if (this._remainder) {
            this._processLine(this._remainder);
        }

        this.destroyed = true;
        this.onend();
    };

    // Private API

    /**
     * Processes a single and complete line. If it is a continous one (slash after status code),
     * queue it to this._block
     *
     * @param {String} line Complete line of data from the server
     */
    SmtpResponseParser.prototype._processLine = function(line) {
        var match, response;

        // possible input strings for the regex:
        // 250-MESSAGE
        // 250 MESSAGE
        // 250 1.2.3 MESSAGE

        if (!line.trim()) {
            // nothing to check, empty line
            return;
        }

        this._block.lines.push(line);

        if ((match = line.match(/^(\d{3})([\- ])(?:(\d+\.\d+\.\d+)(?: ))?(.*)/))) {

            this._block.data.push(match[4]);

            if (match[2] === '-') {
                if (this._block.statusCode && this._block.statusCode !== Number(match[1])) {
                    this.onerror('Invalid status code ' + match[1] +
                        ' for multi line response (' + this._block.statusCode + ' expected)');
                } else if (!this._block.statusCode) {
                    this._block.statusCode = Number(match[1]);
                }
                return;
            } else {
                response = {
                    statusCode: Number(match[1]) || 0,
                    enhancedStatus: match[3] || null,
                    data: this._block.data.join('\n'),
                    line: this._block.lines.join('\n')
                };
                response.success = response.statusCode >= 200 && response.statusCode < 300;

                this.ondata(response);
                this._block = {
                    data: [],
                    lines: [],
                    statusCode: null
                };
                this._block.statusCode = null;
            }
        } else {
            this.onerror(new Error('Invalid SMTP response "' + line + '"'));
            this.ondata({
                success: false,
                statusCode: this._block.statusCode || null,
                enhancedStatus: null,
                data: [line].join('\n'),
                line: this._block.lines.join('\n')
            });
            this._block = {
                data: [],
                lines: [],
                statusCode: null
            };
        }
    };

    return SmtpResponseParser;
}));