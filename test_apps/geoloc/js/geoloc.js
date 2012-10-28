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

function locationsToGPX() {
  var xmldoc = document.implementation.createDocument("", "", null);
  var doc = xmldoc.createElementNS('http://www.topografix.com/GPX/1/1', 'gpx');
  doc.setAttribute('creator', 'FirefoxOS geotracker');
  doc.setAttribute('version', '1.1');
  xmldoc.appendChild(doc);

  var time = xmldoc.createElement('time');
  var ts = xmldoc.createTextNode(dtf.localeFormat(new Date(), '%Y-%m-%dT%H:%M:%S%z'));
  time.appendChild(ts);
  doc.appendChild(time);

  var createSimpleNode = function(name, value) {
    var e = xmldoc.createElement(name);
    e.appendChild(xmldoc.createTextNode(value));
    return e;
  };

  for (var ei in locations) {
    var e = locations[ei];
    var x = xmldoc.createElement('wpt');
    x.setAttribute('lat', e.coords.latitude);
    x.setAttribute('lon', e.coords.longitude);

    var ele = createSimpleNode('ele', e.coords.altitude);
    x.appendChild(ele);

    var time = createSimpleNode('time', dtf.localeFormat(new Date(e.timestamp), '%Y-%m-%dT%H:%M:%S%z'));
    x.appendChild(time);

    var ext = xmldoc.createElement('extensions');
    x.appendChild(ext);
    var accuracy = createSimpleNode('accuracy', e.coords.accuracy);
    ext.appendChild(accuracy);

    var altitudeAccuracy = createSimpleNode('altitudeAccuracy', e.coords.altitudeAccuracy);
    ext.appendChild(altitudeAccuracy);

    if (!isNaN(e.coords.speed)) {
      var speed = createSimpleNode('speed', e.coords.speed);
      ext.appendChild(speed);
    }

    if (!isNaN(e.coords.heading)) {
      var heading = createSimpleNode('heading', e.coords.heading);
      ext.appendChild(heading);
    }

    doc.appendChild(x);
  }

  return xmldoc;
}

function locationsToFile(format) {
  var xmldoc = undefined;
  if (format == "gpx") {
    xmldoc = locationsToGPX();
  }

  var oSerializer = new XMLSerializer();
  return '<?xml version="1.0" ?>'
         + oSerializer.serializeToString(xmldoc);
}

function saveGeoloc() {
  var date = dtf.localeFormat(new Date(), "%Y%m%d%H%M%S");
  var file = locationsToFile("gpx");
  var blob = new Blob([file], {type: 'application/gpx+xml'});
  var fname = "geoloc/geoloc-" + date + ".gpx";
  var storage = navigator.getDeviceStorage('sdcard');
  if (!storage) {
    console.log("No storage available!");
    console.log(file);
    return;
  }
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
