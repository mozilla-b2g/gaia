var canvas;

window.onload = function() {
  canvas = document.createElement('canvas');
  canvas.width = 2* 1024;
  canvas.height = 2.5 * 1024;
  canvas.getContext('2d').fillStyle = '#888';
  canvas.getContext('2d').fillRect(0, 0, canvas.width, canvas.height);
  var decodebtn = document.getElementById('decodeBtn');
  decodebtn.onclick = decode;
  decodebtn.disabled = false;

  var releasebtn = document.getElementById('releaseBtn');
  releasebtn.onclick = release;
  releasebtn.disabled = false;
};

function decode() {
  canvas.toBlob(function(blob) {
    console.log('image blob created', blob.size, blob.type);
    console.log("decoding image; should allocate 20mb of memory");
    var image = document.createElement('img');
    document.body.appendChild(image);
    var url = URL.createObjectURL(blob);
    image.src = url;
  }, 'image/jpeg');
}

function release() {
  var image = document.getElementsByTagName('img')[0];
  if (!image)
    return;

  console.log("attempting to release image memory");
  URL.revokeObjectURL(image.src);
  image.src = '';
  document.body.removeChild(image);
}
