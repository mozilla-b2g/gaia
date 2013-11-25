'use strict';

function telephonyTest() {
  if ('mozTelephony' in navigator && navigator.mozTelephony) {
    document.getElementById('mozTelephony').textContent = 'Exist';
  }
  else {
    document.getElementById('mozTelephony').textContent = 'Not available';
  }
  if ('mozIccManager' in navigator && navigator.mozIccManager) {
    document.getElementById('mozIccManager').textContent = 'Exist';
  }
  else {
    document.getElementById('mozIccManager').textContent = 'Not available';
  }
  if ('mozMobileConnection' in navigator && navigator.mozMobileConnection) {
    document.getElementById('mozMobileConnection').textContent = 'Exist';
  }
  else {
    document.getElementById('mozMobileConnection').textContent =
                                                           'Not available';
  }
}

window.addEventListener('load', telephonyTest);
