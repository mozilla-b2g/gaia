/*
 * This code runs in a Worker to receive messages sent by
 * image_processor_thread.js. It loads image_processor.js, creates an
 * ImageProcessor object, and handles the messages it receives by
 * calling methods on that object.
 *
 * See the documentation in image_processor.js for details.
 */
'use strict';

/* global console, ImageProcessor */

importScripts('image_processor.js');

var processor = new ImageProcessor();

self.onmessage = function(message) {
  var cmd = message.data.cmd;
  var arg = message.data.arg;

  try {
    var result = processor[cmd](arg);
    if (result) { // A promised ArrayBuffer
      result.then(function(returnValue) {
        postMessage({ cmd: cmd, result: returnValue }, [returnValue]);
      });
    }
  }
  catch(e) {
    console.error(e, e.stack);
    postMessage({ cmd: cmd, error: e.toString() });
  }
};
