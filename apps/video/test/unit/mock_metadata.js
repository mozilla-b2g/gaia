/* exported startParsingMetadata, stopParsingMetadata */
/* exported metadataQueue, processingQueue, captureFrame */
'use strict';

var metadataQueue;
var processingQueue;

function startParsingMetadata() {
}

function stopParsingMetadata() {
}

// We need a mock captureFrame function as opposed to simply
// using a spy because the function needs to have an implementation,
// it needs to invoke the callback function.
function captureFrame(player, metadata, callback) {
  callback();
}
