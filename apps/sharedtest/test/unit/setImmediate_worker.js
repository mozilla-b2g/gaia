/* global setImmediate */

importScripts('/shared/js/setImmediate.js');

setImmediate(function() {
    'use strict';
    self.postMessage('TEST');
});
