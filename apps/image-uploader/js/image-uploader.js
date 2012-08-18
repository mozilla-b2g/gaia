window.onload = function() {
  console.log("Loading image-uploader");
  navigator.mozSetMessageHandler('activity', function(activityRequest) {
    console.log("image-uploader activityRequest");
    if (activityRequest.source.name === 'share-filenames') {
      addImages(activityRequest.source.data.filenames);
    }
  });
};

function uploadCanardPc(source) {
  var url = "http://tof.canardpc.com/";
  console.log("Uploading", source);
}

function addImages(filenames) {
  console.log('Receiving', filenames.length, 'files');
  var storage = navigator.getDeviceStorage('pictures');
  filenames.forEach(function(filename) {
    storage.get(filename).onsuccess = function(e) {
      var blob = e.target.result;
      var url = URL.createObjectURL(blob);
      var holder = document.getElementById('previews');
      var img = document.createElement('img');
      img.style.width = '85%';
      img.src = url;
      img.onload = function() { URL.revokeObjectURL(this.src); };
      holder.appendChild(img);
    };
  });
}

function getSelectedServices() {
  var services = document.getElementsByTagName("input");
  var selectedServices = [];
  for (var service in services) {
    var s = services[service];
    if (s.type === "checkbox" && s.checked === true) {
      selectedServices.push(s.id);
    }
  }
  return selectedServices;
}

function share() {
  var services = getSelectedServices();
  if (services.length > 0) {
    document.getElementById("share").disabled = true;
    for (var sn in services) {
      var serv = services[sn];
      console.log("Service to use", serv);
      var imgs = document.getElementById("previews").getElementsByTagName("img");
      for (var i in imgs) {
      	var img = imgs[i];
	if (img.src != "") {
	  console.log("Preparing activity for", img.src);
	  switch (serv) {
            case "upload-canardpc":
	      uploadCanardPc(img.src);
	      break;
	  }
	}
      }
    }
  }
}
