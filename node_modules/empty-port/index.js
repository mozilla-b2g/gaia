var net = require('net');

var empryPort = function (opt, callback) {
        var startPort = opt.startPort || opt.port || 1;
        var maxPort   = opt.maxPort   || opt.port || 65537;
        var host      = opt.host      || 'localhost';

        var usedPorts = {};
        var usedPortCount = 0;

        var range = maxPort - startPort;

        var pickRandomPort = function () {
                if (usedPortCount >= range) {
                        return null;
                }

                var port = startPort + parseInt(Math.random() * (range + 1));

                return usedPorts[port] ? pickRandomPort() : port;
        };

        var tryToConnect = function (port, callback) {
                var socket = new net.Socket();
                var server = new net.Server();

                socket.on('error', function(err) {
                        server.on('error', function (err) {
                                callback(err);
                        });
                        server.listen(port, host, function () {
                                server.close();
                                callback();
                        });
                });
                socket.connect(port, host, function() {
                        socket.end();
                        callback('listened port');
                });
        };

        var iterator = function (next) {
                var pickedPort = pickRandomPort();
                if (!pickedPort) {
                        return callback('not found.');
                }

                tryToConnect(pickedPort, function (err) {
                        if (err) {
                                usedPorts[pickedPort] = true;
                                usedPortCount++;
                                return iterator(next);
                        }
                        return callback(null, pickedPort);
                });
        };

        iterator();
};

module.exports = empryPort;