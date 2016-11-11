'use strict';
var View = require('../../lib/view');
var Marionette = require('marionette-client');


function Homescreen(client) {
    View.call(this, client);
}

Homescreen.prototype = Object.create(View.prototype);
Homescreen.prototype.constructor = Homescreen;


Homescreen.prototype.launch = function(){
    View.prototype.launch.call(this, this.ORIGIN);
};

Homescreen.prototype.selectors = {
    sections: {
        main: {
            _rootElement: '#icons',
            _dialerIcon : 'div.icon[data-identifier="app://communications.gaiamobile.org/manifest.webapp-dialer"]'
        }
    }
};

Homescreen.prototype.verifyHomescreenVisible = function(alarmInfo) {
    var selectorObject = {};
    selectorObject.root = this.selectors.sections.main._rootElement;
    selectorObject.element = this.selectors.sections.main._dialerIcon;
    View.prototype.waitForDisplay.call(this, selectorObject);

};


Homescreen.prototype.ORIGIN = 'app://verticalhome.gaiamobile.org';

module.exports = Homescreen;
