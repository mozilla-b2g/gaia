'use strict';

document.querySelector('body').classList.add('loaded');

var testInput = document.getElementById('textInput');
testInput.addEventListener('focus', function(){
	this.style = 'background:#f00;';
});

