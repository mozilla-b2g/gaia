//Place globals you want to expose
//to your tests here for example:

expect = require('expect.js');
sinon = require('sinon');

expect = require('sinon-expect').enhance(expect, sinon, 'was');
require('sinon-mocha').enhance(sinon);
