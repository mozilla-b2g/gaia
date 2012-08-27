/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var d = new Date();
var f = new navigator.mozL10n.DateTimeFormat();

function updatePrettyDate(time) {
  document.getElementById('prettyDate').textContent = f.fromNow(time);
}

function updateCustomDate(format) {
  document.getElementById('customDate').textContent = f.localeFormat(d, format);
}

window.addEventListener('localized', function startup() {
  document.getElementById('date').textContent = f.localeFormat(d, '%x');
  document.getElementById('time').textContent = f.localeFormat(d, '%X');
  document.getElementById('dateTime').textContent = f.localeFormat(d, '%c');
  document.getElementById('default').textContent = d.toLocaleFormat('%c');
  document.querySelector('input').value = d.getTime();
  updatePrettyDate(d.getTime());
  updateCustomDate('%R');
});

