'use strict';

function sensorTest() {
  var interval = document.getElementById('interval');
  var accelerationX = document.getElementById('acceleration-x');
  var accelerationY = document.getElementById('acceleration-y');
  var accelerationZ = document.getElementById('acceleration-z');
  var accelerationGX = document.getElementById('acceleration-gravity-x');
  var accelerationGY = document.getElementById('acceleration-gravity-y');
  var accelerationGZ = document.getElementById('acceleration-gravity-z');
  var rotAlpha = document.getElementById('rot-rate-alpha');
  var rotBeta = document.getElementById('rot-rate-beta');
  var rotGamma = document.getElementById('rot-rate-gamma');
  var orientationAlpha = document.getElementById('orientation-alpha');
  var orientationBeta = document.getElementById('orientation-beta');
  var orientationGamma = document.getElementById('orientation-gamma');
  var proximityMin = document.getElementById('proximity-min');
  var proximityMax = document.getElementById('proximity-max');
  var proximityValue = document.getElementById('proximity-value');
  var compassCalibration = document.getElementById('compassneedscalibration');

  window.addEventListener('devicemotion', function(e) {
    interval.textContent = e.interval;

    if (e.acceleration) {
      accelerationX.textContent = e.acceleration.x;
      accelerationY.textContent = e.acceleration.y;
      accelerationZ.textContent = e.acceleration.z;
    }

    if (e.accelerationIncludingGravity) {
      accelerationGX.textContent = e.accelerationIncludingGravity.x;
      accelerationGY.textContent = e.accelerationIncludingGravity.y;
      accelerationGZ.textContent = e.accelerationIncludingGravity.z;
    }

    if (e.rotationRate) {
      rotAlpha.textContent = e.rotationRate.alpha;
      rotBeta.textContent = e.rotationRate.beta;
      rotGamma.textContent = e.rotationRate.gamma;
    }
  }, false);

  window.addEventListener('deviceorientation', function(e) {
    if (e) {
      orientationAlpha.textContent = e.alpha;
      orientationBeta.textContent = e.beta;
      orientationGamma.textContent = e.gamma;
    }
  }, false);

  window.addEventListener('devicelight', function(event) {
    document.getElementById('light').textContent = event.value;
  });

  window.addEventListener('deviceproximity', function(event) {
    proximityMin.textContent = event.min;
    proximityMax.textContent = event.max;
    proximityValue.textContent = event.value;
  });

  window.addEventListener('compassneedscalibration', function(e) {
    compassCalibration.textContent = 'true';
  }, false);
}

window.addEventListener('load', sensorTest);
