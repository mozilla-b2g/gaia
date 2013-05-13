window.onload = function() {
  navigator.mozSetMessageHandler('activity', function(activityRequest) {
    if (activityRequest.source.name === 'share-filenames') {
      addImages(activityRequest.source.data.filenames);
    }
  });
};

function addImages(filenames) {
  console.log('Receiving', filenames.length, 'files');
  var storage = navigator.mozGetDeviceStorage('pictures');
  filenames.forEach(function(filename) {
    storage.get(filename).onsuccess = function(e) {
      var blob = e.target.result;
      var url = URL.createObjectURL(blob);
      var img = document.createElement('img');
      img.style.width = '100px';
      img.src = url;
      img.onload = function() { URL.revokeObjectURL(this.src); };
      document.body.appendChild(img);
    };
  });
}
