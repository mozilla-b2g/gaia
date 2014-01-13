// The image we want to view
var imageblob;

// Create an image from a canvas
var canvas = document.createElement('canvas');
canvas.width = 600;
canvas.height = 800;
var context = canvas.getContext('2d');
context.font = '20pt Arial';
context.fillStyle = 'red';
context.fillText('Hello World', 100, 100);
context.strokeStyle = 'blue';
context.lineWidth = 4;
context.strokeRect(0, 0, 600, 800);

canvas.toBlob(function(blob) {
  imageblob = blob;
}, 'image/png');

document.getElementById('view').onclick = function() {
  var a = new MozActivity({
    name: 'open',
    data: {
      type: 'image/png',
      blob: imageblob
    }
  });
  a.onsuccess = function() {
    console.log('activity returns', JSON.stringify(a.result));
  };
};

document.getElementById('viewsave').onclick = function() {
  var a = new MozActivity({
    name: 'open',
    data: {
      type: 'image/png',
      blob: imageblob,
      allowSave: true,
      filename: 'downloads/uitests/helloworldhello.png'
    }
  });
  a.onsuccess = function() {
    console.log('activity returns', JSON.stringify(a.result));
  };
};

document.getElementById('viewError').onclick = function() {
  var a = new MozActivity({
    name: 'open',
    data: {
      type: 'image/jpeg',
      blob: new Blob(['empty-image'], {'type': 'image/jpeg'})
    }
  });
  a.onsuccess = function() {
    console.log('activity returns', JSON.stringify(a.result));
  };
};
