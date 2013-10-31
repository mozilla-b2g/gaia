/*global WBMP*/

'use strict';

requireApp('sms/js/wbmp.js');

suite('wbmp.js >', function() {

  var wbmpBlob, wbmpAsPngBlob;

  suiteSetup(function(done) {
    var assetsNeeded = 0;

    function getAsset(filename, loadCallback) {
      assetsNeeded++;

      var req = new XMLHttpRequest();
      req.open('GET', filename, true);
      req.responseType = 'blob';
      req.onload = function() {
        loadCallback(req.response);
        if (--assetsNeeded === 0) {
          done();
        }
      };
      req.send();
    }

    getAsset('/test/unit/media/grid.wbmp', function(blob) {
      wbmpBlob = blob;
    });
    getAsset('/test/unit/media/grid.png', function(blob) {
      wbmpAsPngBlob = blob;
    });
  });

  function writeBlobToCanvas(blob, callback) {
    var canvas = document.createElement('canvas');
    var image = new Image();

    var blobUrl = window.URL.createObjectURL(blob);
    image.src = blobUrl;
    image.onload = function() {
      window.URL.revokeObjectURL(this.src);
      canvas.height = image.naturalHeight;
      canvas.width = image.naturalWidth;
      var context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      callback(canvas);
    };
  }

  function assertPngEquals(pngBlob1, pngBlob2, done) {
    var canvases = [];

    function canvasReady(canvas) {
      canvases.push(canvas);
      if (canvases.length === 2) {
        done(compareCanvases);
      }
    }

    function compareCanvases() {
      var c1 = canvases[0];
      var c2 = canvases[1];
      assert.equal(c1.width, c2.width);
      assert.equal(c1.height, c2.height);

      var id1 = c1.getContext('2d').getImageData(0, 0, c1.width, c1.height);
      var id2 = c2.getContext('2d').getImageData(0, 0, c2.width, c2.height);

      var data1 = id1.data;
      var data2 = id2.data;

      assert.equal(data1.length, data2.length);

      for (var i = 0, l = data1.length; i < l; i++) {
        assert.equal(data1[i], data2[i]);
      }
    }

    writeBlobToCanvas(pngBlob1, canvasReady);
    writeBlobToCanvas(pngBlob2, canvasReady);
  }

  test('Decode correctly', function(done) {
    var reader = new FileReader();
    reader.readAsArrayBuffer(wbmpBlob);
    reader.onload = function() {
      var arrayBuffer = this.result;
      WBMP.decode(arrayBuffer, function(blob) {
        assertPngEquals(blob, wbmpAsPngBlob, done);
      });
    };
  });
});
