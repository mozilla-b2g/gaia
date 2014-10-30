var test = require('./jsdoc-task_test');
test.setUp = function(done){
    this.destination = 'doc/basic';
    done();
};

exports.JsDocBasicTest = test;
