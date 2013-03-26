var pause = 0;
var source = document.createElement('canvas');
var image = document.createElement('img');
var dest = document.createElement('canvas');

// Start with an 8mp canvas
source.width = 1024*2;
source.height = 1024*4;
source.getContext('2d').fillStyle = '#888';
source.getContext('2d').fillRect(0, 0, source.width, source.height);

// And a small destination
dest.width = 200;
dest.height = 400;

var numdecodes = 0;
var stopplease = false;

function decode() {
  document.getElementById('iterations').textContent = ++numdecodes;

  // convert the source canvas to a jpeg image
  source.toBlob(function(blob) {
    // When we get the jpeg blob, load it into an image
    image.src = URL.createObjectURL(blob);

    // When the image loads, draw it to force it to decode
    image.onload = function() {
      dest.getContext('2d').drawImage(image,
                                      0, 0, dest.width, dest.height);

      // Now try to release the image memory
      URL.revokeObjectURL(image.src)
      image.src = '';

      if (stopplease)
        return;

      // Decode it again, after an optional wait
      setTimeout(decode, pause);
    };
  }, 'image/jpeg');
}

document.getElementById('start').onclick = function() {
  stopplease = false;
  decode();
};
document.getElementById('stop').onclick = function() { stopplease = true; };
