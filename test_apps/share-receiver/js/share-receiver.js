window.onload = function() {
  navigator.mozSetMessageHandler('activity', function(activityRequest) {
    activity = activityRequest;
    if (activityRequest.source.name === 'share') {
      addImages(activityRequest.source.data.urls);
    }
  });

  document.getElementById('ok').onclick = done;
};

var activity;

function done() {
  activity.postResult('shared');
}

function addImages(urls) {
  console.log('share receiver: got', urls.length, 'images');
  urls.forEach(function(url) {
    var img = document.createElement('img');
    img.style.width = '100px';
    img.src = url;
    document.body.appendChild(img);
  });
}
