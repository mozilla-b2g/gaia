'use strict';

window.onload = function () {
	document.getElementById('option-keypad').click();
	var scrolable = document.getElementById('call-log-container');
	scrolable.onscroll = scroll;
	var ScrollYGlobal = 0;
	var elFloating = document.getElementById('call-log-filter');
	elFloating.style.marginTop = "-4rem";

	function scroll () {
		var yScroll = scrolable.scrollTop;
		var marginTopEl = parseInt(elFloating.style.marginTop);
		//console.log('ScrollYGlobal: '+ScrollYGlobal +'// yScroll: '+ 
		//	yScroll + '// marginTopEl: ' + marginTopEl);
		if(ScrollYGlobal < yScroll && yScroll > 70) { //scroll down
			//console.log('scroll down');
			marginTopEl++;
			if(marginTopEl >= 0) marginTopEl = 0;
			//scrolable.scrollTop = marginTopEl*10;
			elFloating.style.marginTop = marginTopEl+'rem';
		} else if(ScrollYGlobal > yScroll) { //scroll up
			//console.log('scroll up');
			marginTopEl--;
			if(marginTopEl < -4) marginTopEl = -4;
			elFloating.style.marginTop = marginTopEl+'rem';
		} else if(ScrollYGlobal == 0 || yScroll == 0) {
			elFloating.style.marginTop = '-4rem';
		} 
		ScrollYGlobal = yScroll;
	}
}