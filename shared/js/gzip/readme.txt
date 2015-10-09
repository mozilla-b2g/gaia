The files in `shared/gzip` add the ability to perform gzip compression
in a Worker. This provides two benefits: 1) The gzip library module can be
loaded into memory when it is needed and released when it is no no longer
needed. 2) The compression processing effort takes place in the worker, not
in an app.

The gzip compression module, gzip.min.js, is distrubuted under the
MIT License. The source code lives here --  https://github.com/imaya/zlib.js
