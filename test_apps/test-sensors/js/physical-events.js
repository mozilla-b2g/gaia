window.addEventListener("devicemotion", function (e) {
  if (e.acceleration) {
    document.getElementById("acceleration-x").innerHTML = e.acceleration.x
    document.getElementById("acceleration-y").innerHTML = e.acceleration.y
    document.getElementById("acceleration-z").innerHTML = e.acceleration.z
  }

  if (e.accelerationIncludingGravity) {
    document.getElementById("acceleration-gravity-x").innerHTML = e.accelerationIncludingGravity.x
    document.getElementById("acceleration-gravity-y").innerHTML = e.accelerationIncludingGravity.y
    document.getElementById("acceleration-gravity-z").innerHTML = e.accelerationIncludingGravity.z
  }

  document.getElementById("interval").innerHTML = e.interval;

  if (e.rotationRate) {
    document.getElementById("rot-rate-alpha").innerHTML = e.rotationRate.alpha
    document.getElementById("rot-rate-beta").innerHTML = e.rotationRate.beta
    document.getElementById("rot-rate-gamma").innerHTML = e.rotationRate.gamma
  }
}, false);

window.addEventListener("deviceorientation", function (e) {
  if (e) {
    document.getElementById("orientation-alpha").innerHTML = e.alpha
    document.getElementById("orientation-beta").innerHTML = e.beta
    document.getElementById("orientation-gamma").innerHTML = e.gamma
  }
}, false);

window.addEventListener("compassneedscalibration", function (e) {
  document.getElementById("compassneedscalibration").innerHTML = "true";
}, false);
