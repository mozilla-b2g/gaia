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
  var urls = data.urls, filenames = data.filenames;
  console.log('share receiver: got', urls.length, 'images');
  urls.forEach(function(url, iUrl) {
    var img = document.createElement('img');
    img.style.width = '100px';
    img.src = url;
    document.body.appendChild(img);
    var label = document.createElement('span');
    label.textContent = filenames[iUrl];
    document.body.appendChild(label);
  });
}
