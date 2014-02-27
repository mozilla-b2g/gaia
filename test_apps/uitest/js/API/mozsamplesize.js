function log(...args) {
  var pre = document.createElement('pre');
  pre.textContent = args.join(' ');
  document.body.appendChild(pre);
}


var button = document.getElementById('report');
button.onclick = function() {
  var images = document.getElementsByTagName('img');
  for(var i = 0; i < images.length; i++) {
    var image = images[i];
    log(image.id, 'width/height:', image.width, image.height,
        'naturalWidth/Height:', image.naturalWidth, image.naturalHeight);
  }
}

document.getElementById('compare').onclick = function() {
  var a = new MozActivity({
    name: 'pick',
    data: {
      type: 'image/jpeg'
    }
  });

  a.onsuccess = function() {
    var imageblob = a.result.blob;
    var url = URL.createObjectURL(imageblob);
    var img1 = document.getElementById('picked1');
    var img2 = document.getElementById('picked2');
    img1.src = url;
    img1.onload = function() {
      var fullwidth = img1.naturalWidth;
      var desiredwidth = 300 * window.devicePixelRatio;
      var samplefactor = Math.max(1, Math.floor(fullwidth/desiredwidth));
      log('decoding with samplesize', samplefactor, 'to reduce full width',
          fullwidth, 'to be closer to', desiredwidth);

      url += "#-moz-samplesize=" + samplefactor;
      img2.src = url;
      img2.onload = function() {
        console.log(img2.width, img2.naturalWidth);
      };

    };

  }
};

document.getElementById('memtest1').onclick = function() { memTest(4); };
document.getElementById('memtest2').onclick = function() { memTest(4, 8); };

function memTest(number, samplesize) {
  var a = new MozActivity({
    name: 'pick',
    data: {
      type: 'image/jpeg'
    }
  });

  a.onsuccess = function() {
    var imageblob = a.result.blob;
    var reader = new FileReader();
    reader.readAsArrayBuffer(imageblob);
    reader.onload = function() {
      var imagedata = reader.result;

      for(var i = 0; i < number; i++) {
        var blob = new Blob([imagedata], { type:"image/jpeg" });
        var url = URL.createObjectURL(blob);
        if (samplesize) {
          url += "#-moz-samplesize=" + samplesize;
        }
        var img = new Image();
        img.src = url;
        img.width = 75;
        img.height = 100;
        document.body.appendChild(img);

        if (i === number-1) {
          img.onload = function() {
            var bytes = img.naturalWidth * img.naturalHeight * 4 * number;
            var mb = bytes / (1024*1024);
            log('image size', img.naturalWidth, img.naturalHeight);
            log(number, "copies of image at samplesize", samplesize||1,
                "should require", mb, "megabytes");
          }
        }
      }
    };

  };
}
