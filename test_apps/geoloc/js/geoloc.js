var running = false;
var watchId = undefined;
var sep = "<br />************<br />";

var dtf = undefined;
var _ = undefined;

var locations = undefined;

function success(position) {
  var debug = document.getElementById('geoloc-debug').checked;
  var s = document.querySelector('#log');

  if (!debug) {
    s.innerHTML = "";
  }

  if (keep()) {
    locations.push(position);
  }

  s.innerHTML = sep + s.innerHTML;
  for (var i in position.coords) {
    var e = position.coords[i];
    if (typeof e == 'number') {
      s.innerHTML = i + ":" + position.coords[i] + "<br />" + s.innerHTML;
    }
  }
  var link = '<a href="http://www.openstreetmap.org/?mlat=' + position.coords.latitude + '&mlon=' + position.coords.longitude + '&zoom=16">Show on map</a><br />';
  s.innerHTML = link + s.innerHTML;

  var nbfixes = document.getElementById('nbr-gps-fixes');
  nbfixes.value = parseInt(nbfixes.value) + 1;

  var datefix = document.getElementById('date-last-fix');
  var cdate = new Date();
  var localeFormat = dtf.localeFormat(cdate, _('dateTimeFormat_%X'));
  datefix.value = localeFormat;
}

function error(msg) {
  var s = document.querySelector('#log');
  s.innerHTML = sep + msg + sep + s.innerHTML;
}

function startGeoloc() {
  error("Starting watchPosition");
  if (navigator.geolocation) {
    locations = new Array();
    watchId = navigator.geolocation.watchPosition(success, error);
    document.getElementById('nbr-gps-fixes').value = "0";
    document.getElementById('date-last-fix').value = "";
    enable('btnStop');
    enable('btnClear');
    disable('btnStart');
    disable('btnSave');
    running = true;
  } else {
    error('not supported');
  }
}

function stopGeoloc() {
  if (watchId != undefined) {
    error("Stopping watchPosition");
    navigator.geolocation.clearWatch(watchId);
    disable('btnStop');
    enable('btnClear');
    enable('btnStart');
    if (keep()) {
      enable('btnSave');
    }
    running = false;
  }
}

function clearGeoloc() {
  var s = document.querySelector('#log');
  s.innerHTML = "";
}

function saveGeoloc() {
  var date = dtf.localeFormat(new Date(), "%Y%m%d%H%M%S");
  var storage = navigator.getDeviceStorage('sdcard');
  var res = "";
  for (var ei in locations) {
    var e = locations[ei];
    res += "Got a location: " + e.coords.latitude + "," + e.coords.longitude + " -- " + e.coords.accuracy + "\n";
  }
  var blob = new Blob([res], {type: 'application/gpx+xml'});
  var fname = "geoloc-" + date + ".gpx";
  var save = storage.addNamed(blob, fname);
  save.onsuccess = function() {
    console.log("Successfully saved " + fname);
  };
  save.onerror = function() {
    console.error("Error while saving to " + fname + ": " + this.error.name);
  };
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

function keep() {
  var e = document.getElementById('geoloc-keep');
  if (e) {
    return e.checked;
  }
  return false;
}

window.addEventListener('DOMContentLoaded', function() {
  dtf = new navigator.mozL10n.DateTimeFormat();
  _ = navigator.mozL10n.get;
  disable('btnStop');
  disable('btnClear');
  disable('btnSave');
  var keep = document.getElementById('geoloc-keep');
  keep.addEventListener('change', function(ev) {
    if (running) {
      return;
    }

    if (ev.target.checked) {
      enable('btnSave');
    } else {
      disable('btnSave');
    }
  });
});
