//RESIZE.JS

//Base set-up
base =  {
	font: 62.5,
	width: 320,
	height: 480,
	pixel: 1,
	ratio: function () {
		 return this.height / this.width;
	}
};

//Device info
device =  {
	width: function () {
		return window.innerWidth;
	},
	height: function () {
		return window.innerHeight;
	},
	pixel: function () {
		if ( window.devicePixelRatio !== undefined ) {
			return window.devicePixelRatio;
		} else {
			return base.pixel;
		}
	},
	ratio: function () {
		var raw = this.height() / this.width();
		decimal_split(raw);
	}
}

//Scale function
scale =  (function (){
	
	var scale_ratio = device.width() / base.width;
	scale_ratio = scale_ratio.toFixed(2);

	var root = document.getElementsByTagName("html")[0];
	var font_size = base.font;

	//Check for non base width devices
	if (  base.width != device.width() ) {
		var font_size = scale_ratio * base.font; 
	}

	//Check for portrait devices
	if ( device.width() == device.height() || device.width() > device.height() ) {
		var font_size = device.width() / 1000 * base.font;
	}

	var font_size = font_size.toFixed(2);
	root.style.fontSize = font_size+"%";

});

//Add scale to listeners
window.addEventListener("load", function (e) {
	scale();
});
// window.addEventListener("resize", function (e) {
// 	scale();
// });