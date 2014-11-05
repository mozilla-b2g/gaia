window.onload = function() {
  navigator.mozSetMessageHandler('activity', function(activityRequest) {
    activity = activityRequest;
    if (activityRequest.source.name === 'share') {
      addImages(activityRequest.source.data);
    }
  });

  document.getElementById('ok').onclick = done;
};

var activity;

function done() {
  activity.postResult('shared');
}

function addImages(data) {
  var blobs = data.blobs, filenames = data.filenames;
  console.log('share receiver: got', blobs.length, 'images');
  blobs.forEach(function(blob, index) {
    var url = URL.createObjectURL(blob);
    var img = document.createElement('img');
    img.style.width = '100px';
    img.src = url;
    img.onload = function() { URL.revokeObjectURL(url); };
    document.body.appendChild(img);
    var label = document.createElement('span');
    label.textContent = filenames[index];
    document.body.appendChild(label);
  });
}
