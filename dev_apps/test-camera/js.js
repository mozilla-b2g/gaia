"use strict";

var camera = null;

window.addEventListener('DOMContentLoaded', function() {
  var viewfinder = document.getElementById('viewfinder');
  var status = document.getElementById('status');

  function getCameraSuccess(success) {
    camera = success.camera;
    viewfinder.mozSrcObject = success.camera;
    viewfinder.play();
    status.textContent = "open";
    camera.addEventListener("close", function onClosed(e) {
      camera.removeEventListener("close", onClosed);
      status.textContent = "closed";
    });
  }
  function getCameraError(error) {
    alert("Error getting camera: " + error);
  }

  if (navigator.mozCameras) {
    // just use the first camera
    navigator.mozCameras.getCamera(navigator.mozCameras.getListOfCameras()[0],
                                   null).then(
                                    getCameraSuccess,
                                    getCameraError
                                  );
  } else {
    alert("navigator.mozCameras not found!");
  }
});

window.addEventListener('beforeunload', function() {
  viewfinder.mozSrcObject = null;
  if (camera) {
    camera.release();
    camera = null;
  }
});
