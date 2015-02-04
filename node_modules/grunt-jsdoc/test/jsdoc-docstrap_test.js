var test = require('./jsdoc-task_test');
test.setUp = function(done){
    this.destination = 'doc/docstrap';
    done();
};

exports.JsDocStrapTest = test;
