// Copyright (c) 2012 Barnesandnoble.com, llc, Donavon West, and Domenic Denicola
//
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: This is an import of the NobleJS setImmediate() polyfill located here:
//
//         https://github.com/NobleJS/setImmediate
//
//       It has been customized in the following ways:
//
//         1) Non-gecko browser compatibility code has been removed.  The
//            postMessage() implementation is always used, except for
//            web workers.  There we use setTimeout(0) since MessageChannel
//            is not implemented in gecko yet.  (Bug 911972)
//         2) The support for executing strings with eval() has been
//            disabled and will now throw an exception.
//         3) Convert test code to use suite() and test().
//
//       The style of this code is different from the rest of gaia, but
//       we chose to minimize non-functional changes in order to make
//       importing fixes from upstream easier in the future.
//
// XXX: Remove this file if/when bug 686201 land.

"use strict";
/*global setImmediate: false, clearImmediate: false, specify: false, window: false */

require("/shared/js/setImmediate.js");

suite("setImmediate polyfill", function() {
    test("Handlers do execute", function (done) {
        setImmediate(function () {
            done();
        });
    });

    test("Handlers do not execute in the same event loop turn as the call to `setImmediate`", function (done) {
        var handlerCalled = false;
        function handler() {
            handlerCalled = true;
            done();
        }

        setImmediate(handler);
        assert.ok(!handlerCalled);
    });

    test("`setImmediate` passes through an argument to the handler", function (done) {
        var expectedArg = { expected: true };

        function handler(actualArg) {
            assert.strictEqual(actualArg, expectedArg);
            done();
        }

        setImmediate(handler, expectedArg);
    });

    test("`setImmediate` passes through two arguments to the handler", function (done) {
        var expectedArg1 = { arg1: true };
        var expectedArg2 = { arg2: true };

        function handler(actualArg1, actualArg2) {
            assert.strictEqual(actualArg1, expectedArg1);
            assert.strictEqual(actualArg2, expectedArg2);
            done();
        }

        setImmediate(handler, expectedArg1, expectedArg2);
    });

    test("`clearImmediate` within the same event loop turn prevents the handler from executing", function (done) {
        var handlerCalled = false;
        function handler() {
            handlerCalled = true;
        }

        var handle = setImmediate(handler);
        clearImmediate(handle);

        setTimeout(function () {
            assert.ok(!handlerCalled);
            done();
        }, 100);
    });

    test("`clearImmediate` does not interfere with handlers other than the one with ID passed to it", function (done) {
        var expectedArgs = ["A", "D"];
        var recordedArgs = [];
        function handler(arg) {
            recordedArgs.push(arg);
        }

        setImmediate(handler, "A");
        clearImmediate(setImmediate(handler, "B"));
        var handle = setImmediate(handler, "C");
        setImmediate(handler, "D");
        clearImmediate(handle);

        setTimeout(function () {
            assert.deepEqual(recordedArgs, expectedArgs);
            done();
        }, 100);
    });

    // NOTE: Test fxos customization to prevent eval usage
    test("`setImmediate` does not permit eval", function(done) {
        function complete() {
            assert.ok(false, "eval executed");
            done();
        }

        try {
            setImmediate("complete()");
        } catch (e) {
            assert.ok(!!e, "received exception when attempting eval");
            done();
        }
    });

    test("When inside a web worker context, setImmediate calls the passed handler", function (done) {
        var worker = new window.Worker("setImmediate_worker.js");
        worker.addEventListener("message", function (event) {
            assert.strictEqual(event.data, "TEST");
            done();
        }, false);
    });
});
