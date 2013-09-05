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
//            postMessage() implementation is always used.
//         2) The support for executing strings with eval() has been
//            disabled and will now throw an exception.
//         3) Always attach to prototype of window
//         4) Convert test code to use suite() and test().
//
//       The style of this code is different from the rest of gaia, but
//       we chose to minimize non-functional changes in order to make
//       importing fixes from upstream easier in the future.
//
// XXX: Remove this file if/when bug 686201 land.

(function () {
    "use strict";

    var tasks = (function () {
        function Task(handler, args) {
            if (typeof handler !== "function") {
                throw new Error("setImmediate() handler must be a function; eval not supported");
            }
            this.handler = handler;
            this.args = args;
        }
        Task.prototype.run = function () {
            // Choice of `thisArg` is not in the setImmediate spec; `undefined` is in the setTimeout spec though:
            // http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html
            this.handler.apply(undefined, this.args);
        };

        var nextHandle = 1; // Spec says greater than zero
        var tasksByHandle = {};
        var currentlyRunningATask = false;

        return {
            addFromSetImmediateArguments: function (args) {
                var handler = args[0];
                var argsToHandle = Array.prototype.slice.call(args, 1);
                var task = new Task(handler, argsToHandle);

                var thisHandle = nextHandle++;
                tasksByHandle[thisHandle] = task;
                return thisHandle;
            },
            runIfPresent: function (handle) {
                // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
                // So if we're currently running a task, we'll need to delay this invocation.
                if (!currentlyRunningATask) {
                    var task = tasksByHandle[handle];
                    if (task) {
                        currentlyRunningATask = true;
                        try {
                            task.run();
                        } finally {
                            delete tasksByHandle[handle];
                            currentlyRunningATask = false;
                        }
                    }
                } else {
                    // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
                    // "too much recursion" error.
                    window.setTimeout(function () {
                        tasks.runIfPresent(handle);
                    }, 0);
                }
            },
            remove: function (handle) {
                delete tasksByHandle[handle];
            }
        };
    }());

    function installPostMessageImplementation(attachTo) {
        // Installs an event handler on `window` for the `message` event: see
        // * https://developer.mozilla.org/en/DOM/window.postMessage
        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

        var MESSAGE_PREFIX = "com.bn.NobleJS.setImmediate" + Math.random();

        function isStringAndStartsWith(string, putativeStart) {
            return typeof string === "string" && string.substring(0, putativeStart.length) === putativeStart;
        }

        function onGlobalMessage(event) {
            // This will catch all incoming messages (even from other windows!), so we need to try reasonably hard to
            // avoid letting anyone else trick us into firing off. We test the origin is still this window, and that a
            // (randomly generated) unpredictable identifying prefix is present.
            if (event.source === window && isStringAndStartsWith(event.data, MESSAGE_PREFIX)) {
                var handle = event.data.substring(MESSAGE_PREFIX.length);
                tasks.runIfPresent(handle);
            }
        }
        window.addEventListener("message", onGlobalMessage, false);

        attachTo.setImmediate = function () {
            var handle = tasks.addFromSetImmediateArguments(arguments);

            // Make `window` post a message to itself with the handle and identifying prefix, thus asynchronously
            // invoking our onGlobalMessage listener above.
            window.postMessage(MESSAGE_PREFIX + handle, "*");

            return handle;
        };
    }

    if (!window.setImmediate) {
        // If supported, we should attach to the prototype of window, since that is where setTimeout et al. live.
        var attachTo = Object.getPrototypeOf(window);

        installPostMessageImplementation(attachTo);
        attachTo.clearImmediate = tasks.remove;
    }
}());
