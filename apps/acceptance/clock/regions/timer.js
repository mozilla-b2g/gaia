'use strict';
var View = require('../../lib/view');
var Marionette = require('marionette-client');

this.selectors = {
    _notebookMenuButton: '#button-notebook-menu',
    _notebookHeader: '#main header h1',
    _notebookAddButton: '#button-notebook-add',
    _rootElement: '#timer-panel'
};


function Timer(client) {
    console.log(client);
    this.client = client.scope({ searchTimeout: 5000 });
    this.actions = new Marionette.Actions(this.client);
    View.apply(this, Array.prototype.slice.apply(arguments));
    console.log(Notebook.prototype);
}

Timer.prototype = Object.create(View.prototype);
Timer.prototype.constructor = Notebook;

Timer.prototype.launch = function(){
    this.prototype.launch.call();
};

Timer.prototype.editHeader = function(headerName) {
    this.click(this._notebookHeader);
    this.sendKeys(headerName);
};

Timer.prototype.createNewNote = function() {
    this.click(this._notebookAddButton);
};

Timer.ORIGIN = 'app://clock.gaiamobile.org';

module.exports = Timer;
