function callback() {
    var options = {
	zoom: 8,
	center: new google.maps.LatLng(41.23, 2.11),
	disableDefaultUI: true,
	mapTypeControl: true,
	mapTypeControlOptions: {
	    style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
	    position: google.maps.ControlPosition.TOP_CENTER
	},
	scaleControl: true,
	scaleControlOptions: {
	    position: google.maps.ControlPosition.BOTTOM_CENTER
	},
	zoomControl: true,
	zoomControlOptions: {
	    style: google.maps.ZoomControlStyle.LARGE
	},
	mapTypeId: google.maps.MapTypeId.ROADMAP
    }
    var map = new google.maps.Map(document.getElementById("map"), options);
}
function OnLoad() {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "http://maps.google.com/maps/api/js?sensor=false&callback=callback";
    document.body.appendChild(script);
}
