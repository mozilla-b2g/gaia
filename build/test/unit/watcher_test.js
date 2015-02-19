'use strict';

var assert = require('chai').assert,
    proxyquire = require('proxyquire'),
    mockPath = {
      'resolve': function(p){ return p; }
    },
    mockChildProcess = new (require('./mock_child_process.js')
        .MockChildProcess)(),
    fe = require('fe.js'),
    fsStub = fe.fs,
    watchStub = proxyquire('watch', {'fs': fsStub}),
    monitor = proxyquire(__dirname + '/../../monitor.js',
        {'watch': watchStub,
         'path': mockPath,
         'child_process': mockChildProcess}),
    Monitor = monitor.Monitor;

suite('build monitor', function() {
  var subject;
  setup(function() {
    var fefs = fe.instance();
    fefs.directory('/fake/gaia');
    fefs.directory('/fake/gaia/apps');
    var fakeapp = fefs.directory('/fake/gaia/apps/fakeapp');
    fefs.file(fakeapp, 'fake.json', {}, function(){});
    subject = new Monitor('/fake/gaia',
      {'directories': ['/fake/gaia/apps']});

    // Force to use the fake sep.
    subject.configs.sep = '/';
  });

  test('#parsePath - when pass a changed file in, ' +
       'should parsed the directory and app name.', function() {
    var result = subject.parsePath('/fake/gaia/apps/fakeapp/main.html');
    assert.equal(result[0], 'apps', 'should parsed the correct' +
      'directory "apps" but it\'s: "' + result[0] + '"');
    assert.equal(result[1], 'fakeapp', 'should parsed the correct' +
      'app name "fakeapp" but it\'s: "' + result[1] + '"');
  });

  test('#localObjFilter - test if the filter would' +
      'ignore files under "locales-obj"', function() {
    var result = subject.localObjFilter(
      '/fake/gaia/apps/fakeapp/locales-obj/zh_TW.json');
    assert.isFalse(result, 'pass a path with "locales-obj" should be false,' +
      'which means it should be ignored');
  });

  test('#invokeMake - mimic the behavior to make an ' +
      'app via monitoring', function() {

    // Because I fetch the spawn and execute it standalone in the target code.
    mockChildProcess.spawn =
      mockChildProcess.spawn.bind(mockChildProcess);
    var rc = mockChildProcess.rc();
    subject.invokeMake('fakeapp');
    rc.on('close');
    assert.equal(mockChildProcess.states.command, 'make', 'should invoke the' +
      '"make" command.');
    assert.isFalse(subject.states.making, 'the "making" flag, which is used' +
      ' to prevent infinite make, should be false after the process got done.');
  });
});
