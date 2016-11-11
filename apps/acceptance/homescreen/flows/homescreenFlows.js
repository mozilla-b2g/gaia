'use strict';
var HomeScreen = require('../regions/homescreen');


function HomescreenFlows(client) {
    HomeScreen.call(this, client);
}

HomescreenFlows.prototype = Object.create(HomeScreen.prototype);
HomescreenFlows.prototype.constructor = HomescreenFlows;

HomescreenFlows.prototype.verifyHomescreen = function() {
    HomeScreen.prototype.verifyHomescreenVisible.call(this);
};

module.exports = HomescreenFlows;