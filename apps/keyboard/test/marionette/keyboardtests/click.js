'use strict';

var testInput = document.getElementById('textInput');
testInput.addEventListener('focus', function(){
	this.style = 'background:#f00;';
});