'use strict';

window.onload = function() {
	document.getElementById('option-keypad').click();
	var scrolable = document.getElementById('call-log-container');
	var filtersCallLog = document.getElementById('call-log-filter');
	
	var globalScroll = scrolable.scrollTop;
	var scrollStarted = false;

	function scroll() {
		var yScroll = scrolable.scrollTop;
		if(scrollStarted) {
			filtersCallLog.classList.remove('visible');
		}
		if( yScroll > 140) {
			filtersCallLog.classList.add('after-scroll');
		}
		else {
			filtersCallLog.classList.remove('after-scroll');
		}

		globalScroll = yScroll;
	}
	scrolable.onscroll = scroll;

	scrolable.addEventListener('touchstart', function(){
		scrollStarted = true;
	}, false);
	scrolable.addEventListener('touchend', function(){
		scrollStarted = false;
		filtersCallLog.classList.add('visible');}
	, false);
}();