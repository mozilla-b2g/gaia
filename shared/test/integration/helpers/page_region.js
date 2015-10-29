'use strict';

var View = require('./view');

function PageRegion(client, element) {
	View.call(this, client);
	this.waitForDisplay(element);
}

PageRegion.prototype = Object.create(View.prototype);
PageRegion.prototype.constructor = PageRegion;


module.exports = PageRegion;