var buster = require('buster');

var net   = require('net'),
    async = require('async');

var emptyPort = require(__dirname + '/../');

buster.testCase('emptyPort', {
        'required': function () {
                assert(emptyPort);
        },
        'find one empty port': function (done) {
                emptyPort( {
                        startPort: 3000,
                        maxPort:   4000
                }, function (err, port) {
                        assert(!err);

                        assert(3000 <= port);
                        assert(4000 >= port);

                        done();
                } );
        },
        'raise error on not found': function (done) {
                var port, server;

                async.series( [ function (next) {
                        emptyPort( {
                                startPort: 3000,
                                maxPort  : 4000
                        }, function (err, p) {
                                port = p;
                                next();
                        } );
                }, function (next) {
                        server = new net.Server();
                        server.listen(port, 'localhost', function () {
                                next();
                        });
                }, function (next) {
                        emptyPort({
                                port: port
                        }, function (err, port) {
                                assert(err);
                                server.close();
                                next();
                        });
                } ], done );
        }
});