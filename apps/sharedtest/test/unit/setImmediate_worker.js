importScripts('/shared/js/setImmediate.js');

setImmediate(function() {
    self.postMessage('TEST');
});
