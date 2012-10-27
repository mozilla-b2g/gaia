var watchId = undefined;
var sep = "<br />************<br />";

var dtf = undefined;
var _ = undefined;

function success(position) {
  var debug = document.getElementById('geoloc-debug').checked;
  var s = document.querySelector('#log');

  if (!debug) {
    s.innerHTML = "";
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
    watchId = navigator.geolocation.watchPosition(success, error);
    document.getElementById('nbr-gps-fixes').value = "0";
    document.getElementById('date-last-fix').value = "";
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
    enable('btnClear');
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

window.addEventListener('DOMContentLoaded', function() {
  dtf = new navigator.mozL10n.DateTimeFormat();
  _ = navigator.mozL10n.get;
  disable('btnStop');
  disable('btnClear');
});
