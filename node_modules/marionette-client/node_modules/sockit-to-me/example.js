// Import the add-on.
var sockittome = require('./');

// Create a new sockit object.
var sockit = new sockittome.Sockit();

// Connect to a host and port.
sockit.connect({ host: "www.google.com", port: 80 });

// Write some data! Takes either a String or a node.js 'Buffer' object.
sockit.write("GET / HTTP/1.0\r\n\r\n");
//sockit.write(new Buffer("GET / HTTP/1.0\r\n\r\n"));

// Read some tasty bytes! Returns a node.js 'Buffer' object, always.
var buffer = sockit.read(1024);

// Observe amazing results.
console.log("Read ", buffer.length, " bytes");

// And beautiful raw HTTP response.
console.log(buffer.toString());

// Close it up.
sockit.close();
