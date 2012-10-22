var watchId = undefined;
var sep = "<br />************<br />";

function success(position) {
  var s = document.querySelector('#log');
  s.innerHTML = sep + s.innerHTML;
  for (var i in position.coords) {
    var e = position.coords[i];
    if (typeof e == 'number') {
      s.innerHTML = i + ":" + position.coords[i] + "<br />" + s.innerHTML;
    }
  }
  var link = '<a href="http://www.openstreetmap.org/?lat=' + position.coords.latitude + '&lon=' + position.coords.longitude + '&zoom=16">Show on map</a><br />';
  s.innerHTML = link + s.innerHTML;
}

function error(msg) {
  var s = document.querySelector('#log');
  s.innerHTML = sep + msg + sep + s.innerHTML;
}

function startGeoloc() {
  error("Starting watchPosition");
  if (navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(success, error);
    enable('btnStop');
    enable('btnClear');
    disable('btnStart');
  } else {
    error('not supported');
  }
}

function stopGeoloc() {
  if (watchId != undefined) {
    error("Stopping watchPosition");
    navigator.geolocation.clearWatch(watchId);
    disable('btnStop');
    disable('btnClear');
    enable('btnStart');
  }
}

function clearGeoloc() {
  var s = document.querySelector('#log');
  s.innerHTML = "";
}

function enable(id) {
  var e = document.getElementById(id);
  if (e) {
    e.disabled = false;
  }
}

function disable(id) {
  var e = document.getElementById(id);
  if (e) {
    e.disabled = true;
  }
}

window.onload = function() {
  disable('btnStop');
  disable('btnClear');
};
