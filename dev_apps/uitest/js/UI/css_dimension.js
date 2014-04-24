'use strict';

function css_dimension_test() {
  var bar_inch = document.getElementById('bar_inch');
  var bar_mm = document.getElementById('bar_mm');
  var bar_px = document.getElementById('bar_px');
  var bar_mozmm = document.getElementById('bar_mozmm');

  bar_inch.style.width = '1in';
  bar_inch.style.backgroundColor = '#00FF00';
  bar_mm.style.width = '25.4mm';
  bar_mm.style.backgroundColor = '#00DD44';
  bar_px.style.width = '96px';
  bar_px.style.backgroundColor = '#00BB88';
  bar_mozmm.style.width = '25.4mozmm';
  bar_mozmm.style.backgroundColor = '#0099CC';
}

window.addEventListener('load', css_dimension_test);
