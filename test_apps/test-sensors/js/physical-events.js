window.addEventListener("devicemotion", function (event) {
	if (event.acceleration) {
	    document.getElementById("acceleration-x").innerHTML = event.acceleration.x
	    document.getElementById("acceleration-y").innerHTML = event.acceleration.y
	    document.getElementById("acceleration-z").innerHTML = event.acceleration.z
	}

	if (event.accelerationIncludingGravity) {
	    document.getElementById("acceleration-gravity-x").innerHTML = event.accelerationIncludingGravity.x
	    document.getElementById("acceleration-gravity-y").innerHTML = event.accelerationIncludingGravity.y
	    document.getElementById("acceleration-gravity-z").innerHTML = event.accelerationIncludingGravity.z
	}
	
	document.getElementById("interval").innerHTML = event.interval;

    
	if (event.rotationRate) {
	    document.getElementById("rot-rate-alpha").innerHTML = event.rotationRate.alpha
	    document.getElementById("rot-rate-beta").innerHTML = event.rotationRate.beta
	    document.getElementById("rot-rate-gamma").innerHTML = event.rotationRate.gamma
	}
    }, false);

window.addEventListener("deviceorientation", function (event) {
	if (event) {
	    document.getElementById("orientation-alpha").innerHTML = event.alpha
	    document.getElementById("orientation-beta").innerHTML = event.beta
	    document.getElementById("orientation-gamma").innerHTML = event.gamma
	}
    }, false);


window.addEventListener("compassneedscalibration", function (event) {
	document.getElementById("compassneedscalibration").innerHTML = "true";
    }, false);
