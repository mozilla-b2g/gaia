'use strict';
var View = require('../../lib/view');
var Marionette = require('marionette-client');

this.selectors = {
    _notebookMenuButton: '#button-notebook-menu',
    _notebookHeader: '#main header h1',
    _notebookAddButton: '#button-notebook-add',
    _rootElement: '#stopwatch-panel'
};


function StopWatch(client) {
    console.log(client);
    this.client = client.scope({ searchTimeout: 5000 });
    this.actions = new Marionette.Actions(this.client);
    View.apply(this, Array.prototype.slice.apply(arguments));
    console.log(Notebook.prototype);
}

StopWatch.prototype = Object.create(View.prototype);
StopWatch.prototype.constructor = Notebook;

StopWatch.prototype.launch = function(){
    this.prototype.launch.call();
};

StopWatch.prototype.editHeader = function(headerName) {
    this.click(this._notebookHeader);
    this.sendKeys(headerName);
};

StopWatch.prototype.createNewNote = function() {
    this.click(this._notebookAddButton);
};

StopWatch.ORIGIN = 'app://clock.gaiamobile.org';

module.exports = StopWatch;
