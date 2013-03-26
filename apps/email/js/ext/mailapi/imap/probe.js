
/**
 * Make our TCPSocket implementation look like node's net library.
 *
 * We make sure to support:
 *
 * Attributes:
 * - encrypted (false, this is not the tls byproduct)
 * - destroyed
 *
 * Methods:
 * - setKeepAlive(Boolean)
 * - write(Buffer)
 * - end
 *
 * Events:
 * - "connect"
 * - "close"
 * - "end"
 * - "data"
 * - "error"
 **/
define('net',['require','exports','module','util','events'],function(require, exports, module) {

var util = require('util'),
    EventEmitter = require('events').EventEmitter;

function NetSocket(port, host, crypto) {
  this._host = host;
  this._port = port;
  this._actualSock = navigator.mozTCPSocket.open(
    host, port, { useSSL: crypto, binaryType: 'arraybuffer' });
  EventEmitter.call(this);

  this._actualSock.onopen = this._onconnect.bind(this);
  this._actualSock.onerror = this._onerror.bind(this);
  this._actualSock.ondata = this._ondata.bind(this);
  this._actualSock.onclose = this._onclose.bind(this);

  this.destroyed = false;
}
exports.NetSocket = NetSocket;
util.inherits(NetSocket, EventEmitter);
NetSocket.prototype.setTimeout = function() {
};
NetSocket.prototype.setKeepAlive = function(shouldKeepAlive) {
};
NetSocket.prototype.write = function(buffer) {
  this._actualSock.send(buffer);
};
NetSocket.prototype.end = function() {
  this._actualSock.close();
  this.destroyed = true;
};

NetSocket.prototype._onconnect = function(event) {
  this.emit('connect', event.data);
};
NetSocket.prototype._onerror = function(event) {
  this.emit('error', event.data);
};
NetSocket.prototype._ondata = function(event) {
  var buffer = Buffer(event.data);
  this.emit('data', buffer);
};
NetSocket.prototype._onclose = function(event) {
  this.emit('close', event.data);
  this.emit('end', event.data);
};


exports.connect = function(port, host) {
  return new NetSocket(port, host, false);
};

}); // end define
;
/**
 *
 **/

define('tls',
  [
    'net',
    'exports'
  ],
  function(
    $net,
    exports
  ) {

exports.connect = function(port, host, wuh, onconnect) {
  var socky = new $net.NetSocket(port, host, true);
  if (onconnect)
    socky.on('connect', onconnect);
  return socky;
};

}); // end define
;
define('mailparser/datetime',['require','exports','module'],function (require, exports, module) {
/* 
 * More info at: http://phpjs.org
 * 
 * This is version: 3.18
 * php.js is copyright 2010 Kevin van Zonneveld.
 * 
 * Portions copyright Brett Zamir (http://brett-zamir.me), Kevin van Zonneveld
 * (http://kevin.vanzonneveld.net), Onno Marsman, Theriault, Michael White
 * (http://getsprink.com), Waldo Malqui Silva, Paulo Freitas, Jonas Raoni
 * Soares Silva (http://www.jsfromhell.com), Jack, Philip Peterson, Ates Goral
 * (http://magnetiq.com), Legaev Andrey, Ratheous, Alex, Martijn Wieringa,
 * Nate, lmeyrick (https://sourceforge.net/projects/bcmath-js/), Philippe
 * Baumann, Enrique Gonzalez, Webtoolkit.info (http://www.webtoolkit.info/),
 * Ash Searle (http://hexmen.com/blog/), travc, Jani Hartikainen, Carlos R. L.
 * Rodrigues (http://www.jsfromhell.com), Ole Vrijenhoek, WebDevHobo
 * (http://webdevhobo.blogspot.com/), T.Wild,
 * http://stackoverflow.com/questions/57803/how-to-convert-decimal-to-hex-in-javascript,
 * pilus, GeekFG (http://geekfg.blogspot.com), Rafał Kukawski
 * (http://blog.kukawski.pl), Johnny Mast (http://www.phpvrouwen.nl), Michael
 * Grier, Erkekjetter, d3x, marrtins, Andrea Giammarchi
 * (http://webreflection.blogspot.com), stag019, mdsjack
 * (http://www.mdsjack.bo.it), Chris, Steven Levithan
 * (http://blog.stevenlevithan.com), Arpad Ray (mailto:arpad@php.net), David,
 * Joris, Tim de Koning (http://www.kingsquare.nl), Marc Palau, Michael White,
 * Public Domain (http://www.json.org/json2.js), gettimeofday, felix, Aman
 * Gupta, Pellentesque Malesuada, Thunder.m, Tyler Akins (http://rumkin.com),
 * Karol Kowalski, Felix Geisendoerfer (http://www.debuggable.com/felix),
 * Alfonso Jimenez (http://www.alfonsojimenez.com), Diplom@t
 * (http://difane.com/), majak, Mirek Slugen, Mailfaker
 * (http://www.weedem.fr/), Breaking Par Consulting Inc
 * (http://www.breakingpar.com/bkp/home.nsf/0/87256B280015193F87256CFB006C45F7),
 * Josh Fraser
 * (http://onlineaspect.com/2007/06/08/auto-detect-a-time-zone-with-javascript/),
 * Martin (http://www.erlenwiese.de/), Paul Smith, KELAN, Robin, saulius, AJ,
 * Oleg Eremeev, Steve Hilder, gorthaur, Kankrelune
 * (http://www.webfaktory.info/), Caio Ariede (http://caioariede.com), Lars
 * Fischer, Sakimori, Imgen Tata (http://www.myipdf.com/), uestla, Artur
 * Tchernychev, Wagner B. Soares, Christoph, nord_ua, class_exists, Der Simon
 * (http://innerdom.sourceforge.net/), echo is bad, XoraX
 * (http://www.xorax.info), Ozh, Alan C, Taras Bogach, Brad Touesnard, MeEtc
 * (http://yass.meetcweb.com), Peter-Paul Koch
 * (http://www.quirksmode.org/js/beat.html), T0bsn, Tim Wiel, Bryan Elliott,
 * jpfle, JT, Thomas Beaucourt (http://www.webapp.fr), David Randall, Frank
 * Forte, Eugene Bulkin (http://doubleaw.com/), noname, kenneth, Hyam Singer
 * (http://www.impact-computing.com/), Marco, Raphael (Ao RUDLER), Ole
 * Vrijenhoek (http://www.nervous.nl/), David James, Steve Clay, Jason Wong
 * (http://carrot.org/), T. Wild, Paul, J A R, LH, strcasecmp, strcmp, JB,
 * Daniel Esteban, strftime, madipta, Valentina De Rosa, Marc Jansen,
 * Francesco, Stoyan Kyosev (http://www.svest.org/), metjay, Soren Hansen,
 * 0m3r, Sanjoy Roy, Shingo, sankai, sowberry, hitwork, Rob, Norman "zEh"
 * Fuchs, Subhasis Deb, josh, Yves Sucaet, Ulrich, Scott Baker, ejsanders,
 * Nick Callen, Steven Levithan (stevenlevithan.com), Aidan Lister
 * (http://aidanlister.com/), Philippe Jausions
 * (http://pear.php.net/user/jausions), Zahlii, Denny Wardhana, Oskar Larsson
 * Högfeldt (http://oskar-lh.name/), Brian Tafoya
 * (http://www.premasolutions.com/), johnrembo, Gilbert, duncan, Thiago Mata
 * (http://thiagomata.blog.com), Alexander Ermolaev
 * (http://snippets.dzone.com/user/AlexanderErmolaev), Linuxworld, lmeyrick
 * (https://sourceforge.net/projects/bcmath-js/this.), Jon Hohle, Pyerre,
 * merabi, Saulo Vallory, HKM, ChaosNo1, djmix, Lincoln Ramsay, Adam Wallner
 * (http://web2.bitbaro.hu/), paulo kuong, jmweb, Orlando, kilops, dptr1988,
 * DxGx, Pedro Tainha (http://www.pedrotainha.com), Bayron Guevara, Le Torbi,
 * James, Douglas Crockford (http://javascript.crockford.com), Devan
 * Penner-Woelk, Jay Klehr, Kheang Hok Chin (http://www.distantia.ca/), Luke
 * Smith (http://lucassmith.name), Rival, Amir Habibi
 * (http://www.residence-mixte.com/), Blues (http://tech.bluesmoon.info/), Ben
 * Bryan, booeyOH, Dreamer, Cagri Ekin, Diogo Resende, Howard Yeend, Pul,
 * 3D-GRAF, jakes, Yannoo, Luke Godfrey, daniel airton wermann
 * (http://wermann.com.br), Allan Jensen (http://www.winternet.no), Benjamin
 * Lupton, davook, Atli Þór, Maximusya, Leslie Hoare, Bug?, setcookie, YUI
 * Library: http://developer.yahoo.com/yui/docs/YAHOO.util.DateLocale.html,
 * Blues at http://hacks.bluesmoon.info/strftime/strftime.js, Andreas,
 * Michael, Christian Doebler, Gabriel Paderni, Marco van Oort, Philipp
 * Lenssen, Arnout Kazemier (http://www.3rd-Eden.com), penutbutterjelly, Anton
 * Ongson, DtTvB (http://dt.in.th/2008-09-16.string-length-in-bytes.html),
 * meo, Greenseed, Yen-Wei Liu, mk.keck, William, rem, Jamie Beck
 * (http://www.terabit.ca/), Russell Walker (http://www.nbill.co.uk/),
 * Garagoth, Dino, Andrej Pavlovic, gabriel paderni, FGFEmperor, Scott Cariss,
 * Slawomir Kaniecki, ReverseSyntax, Mateusz "loonquawl" Zalega, Francois,
 * Kirk Strobeck, Billy, vlado houba, Jalal Berrami, date, Itsacon
 * (http://www.itsacon.net/), Martin Pool, Pierre-Luc Paour, ger, john
 * (http://www.jd-tech.net), mktime, Simon Willison
 * (http://simonwillison.net), Nick Kolosov (http://sammy.ru), marc andreu,
 * Arno, Nathan, Kristof Coomans (SCK-CEN Belgian Nucleair Research Centre),
 * Fox, nobbler, stensi, Matteo, Riddler (http://www.frontierwebdev.com/),
 * Tomasz Wesolowski, T.J. Leahy, rezna, Eric Nagel, Alexander M Beedie, baris
 * ozdil, Greg Frazier, Bobby Drake, Ryan W Tenney (http://ryan.10e.us), Tod
 * Gentille, Rafał Kukawski, FremyCompany, Manish, Cord, fearphage
 * (http://http/my.opera.com/fearphage/), Victor, Brant Messenger
 * (http://www.brantmessenger.com/), Matt Bradley, Luis Salazar
 * (http://www.freaky-media.com/), Tim de Koning, taith, Rick Waldron, Mick@el
 * 
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL KEVIN VAN ZONNEVELD BE LIABLE FOR ANY CLAIM, DAMAGES
 * OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */ 
this.strtotime = function(str, now) {
    // http://kevin.vanzonneveld.net
    // +   original by: Caio Ariede (http://caioariede.com)
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +      input by: David
    // +   improved by: Caio Ariede (http://caioariede.com)
    // +   improved by: Brett Zamir (http://brett-zamir.me)
    // +   bugfixed by: Wagner B. Soares
    // +   bugfixed by: Artur Tchernychev
    // %        note 1: Examples all have a fixed timestamp to prevent tests to fail because of variable time(zones)
    // *     example 1: strtotime('+1 day', 1129633200);
    // *     returns 1: 1129719600
    // *     example 2: strtotime('+1 week 2 days 4 hours 2 seconds', 1129633200);
    // *     returns 2: 1130425202
    // *     example 3: strtotime('last month', 1129633200);
    // *     returns 3: 1127041200
    // *     example 4: strtotime('2009-05-04 08:30:00');
    // *     returns 4: 1241418600
 
    var i, match, s, strTmp = '', parse = '';

    strTmp = str;
    strTmp = strTmp.replace(/\s{2,}|^\s|\s$/g, ' '); // unecessary spaces
    strTmp = strTmp.replace(/[\t\r\n]/g, ''); // unecessary chars

    if (strTmp == 'now') {
        return (new Date()).getTime()/1000; // Return seconds, not milli-seconds
    } else if (!isNaN(parse = Date.parse(strTmp))) {
        return (parse/1000);
    } else if (now) {
        now = new Date(now*1000); // Accept PHP-style seconds
    } else {
        now = new Date();
    }

    strTmp = strTmp.toLowerCase();

    var __is =
    {
        day:
        {
            'sun': 0,
            'mon': 1,
            'tue': 2,
            'wed': 3,
            'thu': 4,
            'fri': 5,
            'sat': 6
        },
        mon:
        {
            'jan': 0,
            'feb': 1,
            'mar': 2,
            'apr': 3,
            'may': 4,
            'jun': 5,
            'jul': 6,
            'aug': 7,
            'sep': 8,
            'oct': 9,
            'nov': 10,
            'dec': 11
        }
    };

    var process = function (m) {
        var ago = (m[2] && m[2] == 'ago');
        var num = (num = m[0] == 'last' ? -1 : 1) * (ago ? -1 : 1);

        switch (m[0]) {
            case 'last':
            case 'next':
                switch (m[1].substring(0, 3)) {
                    case 'yea':
                        now.setFullYear(now.getFullYear() + num);
                        break;
                    case 'mon':
                        now.setMonth(now.getMonth() + num);
                        break;
                    case 'wee':
                        now.setDate(now.getDate() + (num * 7));
                        break;
                    case 'day':
                        now.setDate(now.getDate() + num);
                        break;
                    case 'hou':
                        now.setHours(now.getHours() + num);
                        break;
                    case 'min':
                        now.setMinutes(now.getMinutes() + num);
                        break;
                    case 'sec':
                        now.setSeconds(now.getSeconds() + num);
                        break;
                    default:
                        var day;
                        if (typeof (day = __is.day[m[1].substring(0, 3)]) != 'undefined') {
                            var diff = day - now.getDay();
                            if (diff == 0) {
                                diff = 7 * num;
                            } else if (diff > 0) {
                                if (m[0] == 'last') {diff -= 7;}
                            } else {
                                if (m[0] == 'next') {diff += 7;}
                            }
                            now.setDate(now.getDate() + diff);
                        }
                }
                break;

            default:
                if (/\d+/.test(m[0])) {
                    num *= parseInt(m[0], 10);

                    switch (m[1].substring(0, 3)) {
                        case 'yea':
                            now.setFullYear(now.getFullYear() + num);
                            break;
                        case 'mon':
                            now.setMonth(now.getMonth() + num);
                            break;
                        case 'wee':
                            now.setDate(now.getDate() + (num * 7));
                            break;
                        case 'day':
                            now.setDate(now.getDate() + num);
                            break;
                        case 'hou':
                            now.setHours(now.getHours() + num);
                            break;
                        case 'min':
                            now.setMinutes(now.getMinutes() + num);
                            break;
                        case 'sec':
                            now.setSeconds(now.getSeconds() + num);
                            break;
                    }
                } else {
                    return false;
                }
                break;
        }
        return true;
    };

    match = strTmp.match(/^(\d{2,4}-\d{2}-\d{2})(?:\s(\d{1,2}:\d{2}(:\d{2})?)?(?:\.(\d+))?)?$/);
    if (match != null) {
        if (!match[2]) {
            match[2] = '00:00:00';
        } else if (!match[3]) {
            match[2] += ':00';
        }

        s = match[1].split(/-/g);

        for (i in __is.mon) {
            if (__is.mon[i] == s[1] - 1) {
                s[1] = i;
            }
        }
        s[0] = parseInt(s[0], 10);

        s[0] = (s[0] >= 0 && s[0] <= 69) ? '20'+(s[0] < 10 ? '0'+s[0] : s[0]+'') : (s[0] >= 70 && s[0] <= 99) ? '19'+s[0] : s[0]+'';
        return parseInt(this.strtotime(s[2] + ' ' + s[1] + ' ' + s[0] + ' ' + match[2])+(match[4] ? match[4]/1000 : ''), 10);
    }

    var regex = '([+-]?\\d+\\s'+
        '(years?|months?|weeks?|days?|hours?|min|minutes?|sec|seconds?'+
        '|sun\\.?|sunday|mon\\.?|monday|tue\\.?|tuesday|wed\\.?|wednesday'+
        '|thu\\.?|thursday|fri\\.?|friday|sat\\.?|saturday)'+
        '|(last|next)\\s'+
        '(years?|months?|weeks?|days?|hours?|min|minutes?|sec|seconds?'+
        '|sun\\.?|sunday|mon\\.?|monday|tue\\.?|tuesday|wed\\.?|wednesday'+
        '|thu\\.?|thursday|fri\\.?|friday|sat\\.?|saturday))'+
        '(\\sago)?';

    match = strTmp.match(new RegExp(regex, 'gi')); // Brett: seems should be case insensitive per docs, so added 'i'
    if (match == null) {
        return false;
    }

    for (i = 0; i < match.length; i++) {
        if (!process(match[i].split(' '))) {
            return false;
        }
    }

    return (now.getTime()/1000);
}
});
define('mailparser/streams',['require','exports','module','stream','util','mimelib','encoding','crypto'],function (require, exports, module) {
var Stream = require('stream').Stream,
    utillib = require('util'),
    mimelib = require('mimelib'),
    encodinglib = require('encoding'),
    crypto = require('crypto');

module.exports.Base64Stream = Base64Stream;
module.exports.QPStream = QPStream;
module.exports.BinaryStream = BinaryStream;

function Base64Stream(){
    Stream.call(this);
    this.writable = true;
    
    this.checksum = crypto.createHash("md5");
    this.length = 0;
    
    this.current = "";
}
utillib.inherits(Base64Stream, Stream);

Base64Stream.prototype.write = function(data){
    this.handleInput(data);
    return true;
};

Base64Stream.prototype.end = function(data){
    this.handleInput(data);
    this.emit("end");
    return {
        length: this.length,
        checksum: this.checksum.digest("hex")
    };
};

Base64Stream.prototype.handleInput = function(data){
    if(!data || !data.length){
        return;
    }
    
    data = (data || "").toString("utf-8");
    
    var remainder = 0;
    this.current += data.replace(/[^\w\+\/=]/g,'');
    var buffer = new Buffer(this.current.substr(0, this.current.length - this.current.length % 4),"base64");
    if(buffer.length){
        this.length += buffer.length;
        this.checksum.update(buffer);
        this.emit("data", buffer);
    }
    this.current = (remainder=this.current.length % 4)?this.current.substr(- remainder):"";
};

function QPStream(charset){
    Stream.call(this);
    this.writable = true;
    
    this.checksum = crypto.createHash("md5");
    this.length = 0;
    
    this.charset = charset || "UTF-8";
    this.current = undefined;
}
utillib.inherits(QPStream, Stream);

QPStream.prototype.write = function(data){
    this.handleInput(data);
    return true;
};

QPStream.prototype.end = function(data){
    this.handleInput(data);
    this.flush();
    this.emit("end");
    return {
        length: this.length,
        checksum: this.checksum.digest("hex")
    };
};

QPStream.prototype.handleInput = function(data){
    if(!data || !data.length){
        return;
    }
    
    data = (data || "").toString("utf-8");
    if(data.match(/^\r\n/)){
        data = data.substr(2);
    }
    
    if(typeof this.current !="string"){
        this.current = data;
    }else{
        this.current += "\r\n" + data;
    }
};

QPStream.prototype.flush = function(){
    var buffer = mimelib.decodeQuotedPrintable(this.current, false, this.charset);

    if(this.charset.toLowerCase() == "binary"){
        // do nothing
    }else if(this.charset.toLowerCase() != "utf-8"){
        buffer = encodinglib.convert(buffer, "utf-8", this.charset);
    }else{
        buffer = new Buffer(buffer, "utf-8");
    }

    this.length += buffer.length;
    this.checksum.update(buffer);
    
    this.emit("data", buffer);
};

function BinaryStream(charset){
    Stream.call(this);
    this.writable = true;
    
    this.checksum = crypto.createHash("md5");
    this.length = 0;
    
    this.charset = charset || "UTF-8";
    this.current = "";
}
utillib.inherits(BinaryStream, Stream);

BinaryStream.prototype.write = function(data){
    if(data && data.length){
        this.length += data.length;
        this.checksum.update(data);
        this.emit("data", data);
    }
    return true;
};

BinaryStream.prototype.end = function(data){
    if(data && data.length){
        this.emit("data", data);
    }
    this.emit("end");
    return {
        length: this.length,
        checksum: this.checksum.digest("hex")
    };
};
});
define('mailparser/mailparser',['require','exports','module','stream','util','mimelib','./datetime','encoding','./streams','crypto'],function (require, exports, module) {

/**
 * @fileOverview This is the main file for the MailParser library to parse raw e-mail data
 * @author <a href="mailto:andris@node.ee">Andris Reinman</a>
 * @version 0.2.23
 */

var Stream = require('stream').Stream,
    utillib = require('util'),
    mimelib = require('mimelib'),
    datetime = require('./datetime'),
    encodinglib = require('encoding'),
    Streams = require('./streams'),
    crypto = require('crypto');

// Expose to the world
module.exports.MailParser = MailParser;

// MailParser is a FSM - it is always in one of the possible states
var STATES = {
    header:   0x1,
    body:     0x2,
    finished: 0x3
};

/**
 * <p>Creates instance of MailParser which in turn extends Stream</p>
 *
 * <p>Options object has the following properties:</p>
 *
 * <ul>
 *   <li><b>debug</b> - if set to true print all incoming lines to decodeq</li>
 *   <li><b>streamAttachments</b> - if set to true, stream attachments instead of including them</li>
 *   <li><b>unescapeSMTP</b> - if set to true replace double dots in the beginning of the file</li>
 *   <li><b>defaultCharset</b> - the default charset for text/plain, text/html content, if not set reverts to Latin-1
 *   <li><b>showAttachmentLinks</b></li> - if set to true, show inlined attachment links
 * </ul>
 *
 * @constructor
 * @param {Object} [options] Optional options object
 */
function MailParser(options){

    // Make MailParser a Stream object
    Stream.call(this);
    this.writable = true;

    /**
     * Options object
     * @public  */ this.options = options || {};

    /**
     * Indicates current state the parser is in
     * @private */ this._state         = STATES.header;

    /**
     * The remaining data from the previos chunk which is waiting to be processed
     * @private */ this._remainder     = "";

    /**
     * The complete tree structure of the e-mail
     * @public  */ this.mimeTree       = this._createMimeNode();

    /**
     * Current node of the multipart mime tree that is being processed
     * @private */ this._currentNode   = this.mimeTree;

    // default values for the root node
    this._currentNode.priority = "normal";

    /**
     * An object of already used attachment filenames
     * @private */ this._fileNames     = {};

    /**
     * An array of multipart nodes
     * @private */ this._multipartTree = [];


    /**
     * This is the final mail structure object that is returned to the client
     * @public  */ this.mailData       = {};

    /**
     * Line counter for debugging
     * @private */ this._lineCounter   = 0;

    /**
     * Did the last chunk end with \r
     * @private */ this._lineFeed      = false;

   /**
     * Is the "headers" event already emitted
     * @private */ this._headersSent   = false;
}
// inherit methods and properties of Stream
utillib.inherits(MailParser, Stream);

/**
 * <p>Writes a value to the MailParser stream<p>
 *
 * @param {Buffer|String} chunk The data to be written to the MailParser stream
 * @param {String} [encoding] The encoding to be used when "chunk" is a string
 * @returns {Boolean} Returns true
 */
MailParser.prototype.write = function(chunk, encoding){
    if( this._write(chunk, encoding) ){
        process.nextTick(this._process.bind(this));
    }
    return true;
};

/**
 * <p>Terminates the MailParser stream</p>
 *
 * <p>If "chunk" is set, writes it to the Stream before terminating.</p>
 *
 * @param {Buffer|String} chunk The data to be written to the MailParser stream
 * @param {String} [encoding] The encoding to be used when "chunk" is a string
 */
MailParser.prototype.end = function(chunk, encoding){
    this._write(chunk, encoding);

    if(this.options.debug && this._remainder){
        console.log("REMAINDER: "+this._remainder);
    }

    process.nextTick(this._process.bind(this, true));
};

/**
 * <p>Normalizes CRLF's before writing to the Mailparser stream, does <i>not</i> call `_process`<p>
 *
 * @param {Buffer|String} chunk The data to be written to the MailParser stream
 * @param {String} [encoding] The encoding to be used when "chunk" is a string
 * @returns {Boolean} Returns true if writing the chunk was successful
 */
MailParser.prototype._write = function(chunk, encoding){
    if(typeof chunk == "string"){
        chunk = new Buffer(chunk, encoding);
    }

    chunk = chunk && chunk.toString("binary") || "";

    // if the last chunk ended with \r and this one begins
    // with \n, it's a split line ending. Since the last \r
    // was already used, skip the \n
    if(this._lineFeed && chunk.charAt(0) === "\n"){
        chunk = chunk.substr(1);
    }
    this._lineFeed = chunk.substr(-1) === "\r";

    if(chunk && chunk.length){
        this._remainder += chunk;
        return true;
    }
    return false;
};


/**
 * <p>Processes the data written to the MailParser stream</p>
 *
 * <p>The data is split into lines and each line is processed individually. Last
 * line in the batch is preserved as a remainder since it is probably not a
 * complete line but just the beginning of it. The remainder is later prepended
 * to the next batch of data.</p>
 *
 * @param {Boolean} [finalPart=false] if set to true indicates that this is the last part of the stream
 */
MailParser.prototype._process = function(finalPart){

    finalPart = !!finalPart;

    var lines = this._remainder.split(/\r?\n|\r/),
        line, i, len;

    if(!finalPart){
        this._remainder = lines.pop();
        // force line to 1MB chunks if needed
        if(this._remainder.length>1048576){
            this._remainder = this._remainder.replace(/(.{1048576}(?!\r?\n|\r))/g,"$&\n");
        }
    }

    for(i=0, len=lines.length; i < len; i++){
        line = lines[i];

        if(this.options.unescapeSMTP && line.substr(0,2)==".."){
            line = line.substr(1);
        }

        if(this.options.debug){
            console.log("LINE " + (++this._lineCounter) + " ("+this._state+"): "+line);
        }

        if(this._state == STATES.header){
            if(this._processStateHeader(line) === true){
                continue;
            }
        }

        if(this._state == STATES.body){

            if(this._processStateBody(line) === true){
                continue;
            }

        }
    }

    if(finalPart){
        if(this._state == STATES.header && this._remainder){
            this._processStateHeader(this._remainder);
            if(!this._headersSent){
                this.emit("headers", this._currentNode.parsedHeaders);
                this._headersSent = true;
            }
        }
        if(this._currentNode.content || this._currentNode.stream){
            this._finalizeContents();
        }
        this._state = STATES.finished;
        process.nextTick(this._processMimeTree.bind(this));
    }


};

/**
 * <p>Processes a line while in header state</p>
 *
 * <p>If header state ends and body starts, detect if the contents is an attachment
 * and create a stream for it if needed</p>
 *
 * @param {String} line The contents of a line to be processed
 * @returns {Boolean} If state changes to body retuns true
 */
MailParser.prototype._processStateHeader = function(line){
    var boundary, i, len, attachment,
        lastPos = this._currentNode.headers.length - 1,
        textContent = false, extension;

    // Check if the header ends and body starts
    if(!line.length){
        if(lastPos>=0){
            this._processHeaderLine(lastPos);
        }
        if(!this._headersSent){
            this.emit("headers", this._currentNode.parsedHeaders);
            this._headersSent = true;
        }

        this._state = STATES.body;

        // if there's unprocessed header data, do it now
        if(lastPos >= 0){
            this._processHeaderLine(lastPos);
        }

        // this is a very simple e-mail, no content type set
        if(!this._currentNode.parentNode && !this._currentNode.meta.contentType){
            this._currentNode.meta.contentType = "text/plain";
        }

        textContent = ["text/plain", "text/html"].indexOf(this._currentNode.meta.contentType || "") >= 0;

        // detect if this is an attachment or a text node (some agents use inline dispositions for text)
        if(textContent && (!this._currentNode.meta.contentDisposition || this._currentNode.meta.contentDisposition == "inline")){
            this._currentNode.attachment = false;
        }else if((!textContent || ["attachment", "inline"].indexOf(this._currentNode.meta.contentDisposition)>=0) &&
          !this._currentNode.meta.mimeMultipart){
            this._currentNode.attachment = true;
        }

        // handle attachment start
        if(this._currentNode.attachment){

            this._currentNode.checksum = crypto.createHash("md5");

            this._currentNode.meta.generatedFileName = this._generateFileName(this._currentNode.meta.fileName, this._currentNode.meta.contentType);

            extension = this._currentNode.meta.generatedFileName.split(".").pop().toLowerCase();

            // Update content-type if it's an application/octet-stream and file extension is available
            if(this._currentNode.meta.contentType == "application/octet-stream" && mimelib.contentTypes[extension]){
                this._currentNode.meta.contentType = mimelib.contentTypes[extension];
            }

            attachment = this._currentNode.meta;
            if(this.options.streamAttachments){
                if(this._currentNode.meta.transferEncoding == "base64"){
                    this._currentNode.stream = new Streams.Base64Stream();
                }else if(this._currentNode.meta.transferEncoding == "quoted-printable"){
                    this._currentNode.stream = new Streams.QPStream("binary");
                }else{
                    this._currentNode.stream = new Streams.BinaryStream();
                }
                attachment.stream = this._currentNode.stream;

                this.emit("attachment", attachment);
            }else{
                this._currentNode.content = undefined;
            }
        }

        return true;
    }

    // unfold header lines if needed
    if(line.match(/^\s+/) && lastPos>=0){
        this._currentNode.headers[lastPos] += " " + line.trim();
    }else{
        this._currentNode.headers.push(line.trim());
        if(lastPos>=0){
            // if a complete header line is received, process it
            this._processHeaderLine(lastPos);
        }
    }

    return false;
};

/**
 * <p>Processes a line while in body state</p>
 *
 * @param {String} line The contents of a line to be processed
 * @returns {Boolean} If body ends return true
 */
MailParser.prototype._processStateBody = function(line){
    var i, len, node,
        nodeReady = false;

    // Handle multipart boundaries
    if(line.substr(0, 2) == "--"){
        for(i=0, len = this._multipartTree.length; i<len; i++){

            // check if a new element block starts
            if(line == "--" + this._multipartTree[i].boundary){

                if(this._currentNode.content || this._currentNode.stream){
                    this._finalizeContents();
                }

                node = this._createMimeNode(this._multipartTree[i].node);
                this._multipartTree[i].node.childNodes.push(node);
                this._currentNode = node;
                this._state = STATES.header;
                nodeReady = true;
                break;
            }else
            // check if a multipart block ends
              if(line == "--" + this._multipartTree[i].boundary + "--"){

                if(this._currentNode.content || this._currentNode.stream){
                    this._finalizeContents();
                }

                if(this._multipartTree[i].node.parentNode){
                    this._currentNode = this._multipartTree[i].node.parentNode;
                }else{
                    this._currentNode = this._multipartTree[i].node;
                }
                this._state = STATES.body;
                nodeReady = true;
                break;
            }
        }
    }
    if(nodeReady){
        return true;
    }

    // handle text or attachment line
    if(["text/plain", "text/html"].indexOf(this._currentNode.meta.contentType || "")>=0 &&
      !this._currentNode.attachment){
        this._handleTextLine(line);
    }else if(this._currentNode.attachment){
        this._handleAttachmentLine(line);
    }

    return false;
};

/**
 * <p>Processes a complete unfolded header line</p>
 *
 * <p>Processes a line from current node headers array and replaces its value.
 * Input string is in the form of "X-Mailer: PHP" and its replacement would be
 * an object <code>{key: "x-mailer", value: "PHP"}</code></p>
 *
 * <p>Additionally node meta object will be filled also, for example with data from
 * To: From: Cc: etc fields.</p>
 *
 * @param {Number} pos Which header element (from an header lines array) should be processed
 */
MailParser.prototype._processHeaderLine = function(pos){
    var key, value, parts, line;

    pos = pos || 0;

    if(!(line = this._currentNode.headers[pos]) || typeof line != "string"){
        return;
    }

    parts = line.split(":");

    key = parts.shift().toLowerCase().trim();
    value = parts.join(":").trim();

    switch(key){
        case "content-type":
            this._parseContentType(value);
            break;
        case "mime-version":
            this._currentNode.useMIME = true;
            break;
        case "date":
            this._currentNode.meta.date = new Date(datetime.strtotime(value)*1000 || Date.now());
            break;
        case "to":
            if(this._currentNode.to && this._currentNode.to.length){
                this._currentNode.to = this._currentNode.to.concat(mimelib.parseAddresses(value));
            }else{
                this._currentNode.to = mimelib.parseAddresses(value);
            }
            break;
        case "from":
            if(this._currentNode.from && this._currentNode.from.length){
                this._currentNode.from = this._currentNode.from.concat(mimelib.parseAddresses(value));
            }else{
                this._currentNode.from = mimelib.parseAddresses(value);
            }
            break;
        case "cc":
            if(this._currentNode.cc && this._currentNode.cc.length){
                this._currentNode.cc = this._currentNode.cc.concat(mimelib.parseAddresses(value));
            }else{
                this._currentNode.cc = mimelib.parseAddresses(value);
            }
            break;
        case "bcc":
            if(this._currentNode.bcc && this._currentNode.bcc.length){
                this._currentNode.bcc = this._currentNode.bcc.concat(mimelib.parseAddresses(value));
            }else{
                this._currentNode.bcc = mimelib.parseAddresses(value);
            }
            break;
        case "x-priority":
        case "x-msmail-priority":
        case "importance":
            value = this._parsePriority(value);
            this._currentNode.priority = value;
            break;
        case "message-id":
            this._currentNode.meta.messageId = this._trimQuotes(value);
            break;
        case "references":
            this._parseReferences(value);
            break;
        case "in-reply-to":
            this._parseInReplyTo(value);
            break;
        case "thread-index":
            this._currentNode.meta.threadIndex = value;
            break;
        case "content-transfer-encoding":
            this._currentNode.meta.transferEncoding = value.toLowerCase();
            break;
        case "subject":
            this._currentNode.subject = this._encodeString(value);
            break;
        case "content-disposition":
            this._parseContentDisposition(value);
            break;
        case "content-id":
            this._currentNode.meta.contentId = this._trimQuotes(value);
            break;
    }

    if(this._currentNode.parsedHeaders[key]){
        if(!Array.isArray(this._currentNode.parsedHeaders[key])){
            this._currentNode.parsedHeaders[key] = [this._currentNode.parsedHeaders[key]];
        }
        this._currentNode.parsedHeaders[key].push(this._replaceMimeWords(value));
    }else{
        this._currentNode.parsedHeaders[key] = this._replaceMimeWords(value);
    }

    this._currentNode.headers[pos] = {key: key, value: value};
};

/**
 * <p>Creates an empty node element for the mime tree</p>
 *
 * <p>Created element includes parentNode property and a childNodes array. This is
 * needed to later walk the whole mime tree</p>
 *
 * @param {Object} [parentNode] the parent object for the created node
 * @returns {Object} node element for the mime tree
 */
MailParser.prototype._createMimeNode = function(parentNode){
    var node = {
        parentNode: parentNode || this._currentNode || null,
        headers: [],
        parsedHeaders:{},
        meta: {},
        childNodes: []
    };

    return node;
};

/**
 * <p>Splits a header value into key-value pairs</p>
 *
 * <p>Splits on <code>;</code> - the first value will be set as <code>defaultValue</code> property and will
 * not be handled, others will be split on <code>=</code> to key-value pairs</p>
 *
 * <p>For example <code>content-type: text/plain; charset=utf-8</code> will become:</p>
 *
 * <pre>
 * {
 *     defaultValue: "text/plain",
 *     charset: "utf-8"
 * }
 * </pre>
 *
 * @param {String} value A string to be splitted into key-value pairs
 * @returns {Object} a key-value object, with defaultvalue property
 */
MailParser.prototype._parseHeaderLineWithParams = function(value){
    var key, parts, returnValue = {};

    parts = value.split(";");
    returnValue.defaultValue = parts.shift().toLowerCase();

    for(var i=0, len = parts.length; i<len; i++){
        value = parts[i].split("=");
        key = value.shift().trim().toLowerCase();
        value = value.join("=").trim();

        // trim quotes
        value = this._trimQuotes(value);
        returnValue[key] = value;
    }

    return returnValue;
};

/**
 * <p>Parses a Content-Type header field value</p>
 *
 * <p>Fetches additional properties from the content type (charset etc.) and fills
 * current node meta object with this data</p>
 *
 * @param {String} value Content-Type string
 * @returns {Object} parsed contenttype object
 */
MailParser.prototype._parseContentType = function(value){
    var fileName;
    value = this._parseHeaderLineWithParams(value);
    if(value){
        if(value.defaultValue){
            value.defaultValue = value.defaultValue.toLowerCase();
            this._currentNode.meta.contentType = value.defaultValue;
            if(value.defaultValue.substr(0,"multipart/".length)=="multipart/"){
                this._currentNode.meta.mimeMultipart = value.defaultValue.substr("multipart/".length);
            }
        }else{
            this._currentNode.meta.contentType = "application/octet-stream";
        }
        if(value.charset){
            value.charset = value.charset.toLowerCase();
            if(value.charset.substr(0,4)=="win-"){
                value.charset = "windows-"+value.charset.substr(4);
            }else if(value.charset == "ks_c_5601-1987"){
                value.charset = "cp949";
            }else if(value.charset.match(/^utf\d/)){
                value.charset = "utf-"+value.charset.substr(3);
            }else if(value.charset.match(/^latin[\-_]?\d/)){
                value.charset = "iso-8859-"+value.charset.replace(/\D/g,"");
            }else if(value.charset.match(/^(us\-)?ascii$/)){
                value.charset = "utf-8";
            }
            this._currentNode.meta.charset = value.charset;
        }
        if(value.format){
            this._currentNode.meta.textFormat = value.format.toLowerCase();
        }
        if(value.delsp){
            this._currentNode.meta.textDelSp = value.delsp.toLowerCase();
        }
        if(value.boundary){
            this._currentNode.meta.mimeBoundary = value.boundary;
        }

        if(!this._currentNode.meta.fileName && (fileName = this._detectFilename(value))){
            this._currentNode.meta.fileName = fileName;
        }

        if(value.boundary){
            this._currentNode.meta.mimeBoundary = value.boundary;
            this._multipartTree.push({
                boundary: value.boundary,
                node: this._currentNode
            });
        }
    }
    return value;
};

/**
 * <p>Parses file name from a Content-Type or Content-Disposition field</p>
 *
 * <p>Supports <a href="http://tools.ietf.org/html/rfc2231">RFC2231</a> for
 * folded filenames</p>
 *
 * @param {Object} value Parsed Content-(Type|Disposition) object
 * @return {String} filename
 */
MailParser.prototype._detectFilename = function(value){
    var fileName="", i=0, parts, encoding, name;

    if(value.name){
        return this._replaceMimeWords(value.name);
    }

    if(value.filename){
        return this._replaceMimeWords(value.filename);
    }

    // RFC2231
    if(value["name*"]){
        fileName = value["name*"];
    }else if(value["filename*"]){
        fileName = value["filename*"];
    }else if(value["name*0*"]){
        while(value["name*"+(i)+"*"]){
            fileName += value["name*"+(i++)+"*"];
        }
    }else if(value["filename*0*"]){
        while(value["filename*"+(i)+"*"]){
            fileName += value["filename*"+(i++)+"*"];
        }
    }

    if(fileName){
        parts = fileName.split("'");
        encoding = parts.shift();
        name = parts.pop();
        if(name){
            return this._replaceMimeWords(this._replaceMimeWords("=?"+(encoding || "us-ascii")+"?Q?" + name.replace(/%/g,"=")+"?="));
        }
    }
    return "";
};

/**
 * <p>Parses Content-Disposition header field value</p>
 *
 * <p>Fetches filename to current node meta object</p>
 *
 * @param {String} value A Content-Disposition header field
 */
MailParser.prototype._parseContentDisposition = function(value){
    var returnValue = {},
        fileName;

    value = this._parseHeaderLineWithParams(value);

    if(value){
        if(value.defaultValue){
            this._currentNode.meta.contentDisposition = value.defaultValue.trim().toLowerCase();
        }
        if((fileName = this._detectFilename(value))){
            this._currentNode.meta.fileName = fileName;
        }
    }
};

/**
 * <p>Parses "References" header</p>
 *
 * @param {String} value References header field
 */
MailParser.prototype._parseReferences = function(value){
    this._currentNode.references = (this._currentNode.references || []).concat(
            (value || "").toString().
                trim().
                split(/\s+/).
                map(this._trimQuotes.bind(this))
        );
}

/**
 * <p>Parses "In-Reply-To" header</p>
 *
 * @param {String} value In-Reply-To header field
 */
MailParser.prototype._parseInReplyTo = function(value){
    this._currentNode.inReplyTo = (this._currentNode.inReplyTo || []).concat(
            (value || "").toString().
                trim().
                split(/\s+/).
                map(this._trimQuotes.bind(this))
        );
}

/**
 * <p>Parses the priority of the e-mail</p>
 *
 * @param {String} value The priority value
 * @returns {String} priority string low|normal|high
 */
MailParser.prototype._parsePriority = function(value){
    value = value.toLowerCase().trim();
    if(!isNaN(parseInt(value,10))){ // support "X-Priority: 1 (Highest)"
        value = parseInt(value, 10) || 0;
        if(value == 3){
            return "normal";
        }else if(value > 3){
            return "low";
        }else{
            return "high";
        }
    }else{
        switch(value){
            case "non-urgent":
            case "low":
                return "low";
            case "urgent":
            case "hight":
                return "high";
        }
    }
    return "normal";
};

/**
 * <p>Processes a line in text/html or text/plain node</p>
 *
 * <p>Append the line to the content property</p>
 *
 * @param {String} line A line to be processed
 */
MailParser.prototype._handleTextLine = function(line){
    var encoding = this._currentNode.meta.transferEncoding;
    if(encoding === "base64"){
        if(typeof this._currentNode.content != "string"){
            this._currentNode.content = line.trim();
        }else{
            this._currentNode.content += line.trim();
        }
    }
    else if(encoding === "quoted-printable" || this._currentNode.meta.textFormat != "flowed"){
        if(typeof this._currentNode.content != "string"){
            this._currentNode.content = line;
        }else{
            this._currentNode.content += "\n"+line;
        }
    }else{
        if(typeof this._currentNode.content != "string"){
            this._currentNode.content = line;
        }else if(this._currentNode.content.match(/[ ]{1,}$/)){
            if(this._currentNode.meta.textDelSp == "yes"){
                this._currentNode.content = this._currentNode.content.replace(/\s+$/,"");
            }
            this._currentNode.content += line;
        }else{
            this._currentNode.content += "\n"+line;
        }
    }
};

/**
 * <p>Processes a line in an attachment node</p>
 *
 * <p>If a stream is set up for the attachment write the line to the
 * stream as a Buffer object, otherwise append it to the content property</p>
 *
 * @param {String} line A line to be processed
 */
MailParser.prototype._handleAttachmentLine = function(line){
    if(!this._currentNode.attachment){
        return;
    }
    if(this._currentNode.stream){
        if(!this._currentNode.streamStarted){
            this._currentNode.streamStarted = true;
            this._currentNode.stream.write(new Buffer(line, "binary"));
        }else{
            this._currentNode.stream.write(new Buffer("\r\n"+line, "binary"));
        }
    }else if("content" in this._currentNode){
        if(typeof this._currentNode.content!="string"){
            this._currentNode.content = line;
        }else{
            this._currentNode.content += "\r\n" + line;
        }
    }
};

/**
 * <p>Finalizes a node processing</p>
 *
 * <p>If the node is a text/plain or text/html, convert it to UTF-8 encoded string
 * If it is an attachment, convert it to a Buffer or if an attachment stream is
 * set up, close the stream</p>
 */
MailParser.prototype._finalizeContents = function(){
    var streamInfo;

    if(this._currentNode.content){

        if(!this._currentNode.attachment){

            if(this._currentNode.meta.contentType == "text/html"){
                 this._currentNode.meta.charset = this._detectHTMLCharset(this._currentNode.content) || this._currentNode.meta.charset || this.options.defaultCharset || "iso-8859-1";
            }

            if(this._currentNode.meta.transferEncoding == "quoted-printable"){
                this._currentNode.content = mimelib.decodeQuotedPrintable(this._currentNode.content, false, this._currentNode.meta.charset || this.options.defaultCharset || "iso-8859-1");
              if (this._currentNode.meta.textFormat === "flowed") {
                if (this._currentNode.meta.textDelSp === "yes")
                  this._currentNode.content = this._currentNode.content.replace(/ \n/g, '');
                else
                  this._currentNode.content = this._currentNode.content.replace(/ \n/g, ' ');
                }
            }else if(this._currentNode.meta.transferEncoding == "base64"){
                this._currentNode.content = mimelib.decodeBase64(this._currentNode.content, this._currentNode.meta.charset || this.options.defaultCharset || "iso-8859-1");
            }else{
                this._currentNode.content = this._convertStringToUTF8(this._currentNode.content);
            }
        }else{
            if(this._currentNode.meta.transferEncoding == "quoted-printable"){
                this._currentNode.content = mimelib.decodeQuotedPrintable(this._currentNode.content, false, "binary");
            }else if(this._currentNode.meta.transferEncoding == "base64"){
                this._currentNode.content = new Buffer(this._currentNode.content.replace(/[^\w\+\/=]/g,''), "base64");
            }else{
                this._currentNode.content = new Buffer(this._currentNode.content, "binary");
            }
            this._currentNode.checksum.update(this._currentNode.content);
            this._currentNode.meta.checksum = this._currentNode.checksum.digest("hex");
            this._currentNode.meta.length = this._currentNode.content.length;
        }

    }

    if(this._currentNode.stream){
        streamInfo = this._currentNode.stream.end() || {};
        if(streamInfo.checksum){
            this._currentNode.meta.checksum = streamInfo.checksum;
        }
        if(streamInfo.length){
            this._currentNode.meta.length = streamInfo.length;
        }
    }
};

/**
 * <p>Processes the mime tree</p>
 *
 * <p>Finds text parts and attachments from the tree. If there's several text/plain
 * or text/html parts, push the ones from the lower parts of the tree to the
 * alternatives array</p>
 *
 * <p>Emits "end" when finished</p>
 */
MailParser.prototype._processMimeTree = function(){
    var level = 0, htmlLevel, textLevel,
        returnValue = {}, i, len;

    this.mailData = {html:[], text:[], alternatives:[], attachments:[]};

    if(!this.mimeTree.meta.mimeMultipart){
        this._processMimeNode(this.mimeTree, 0);
    }else{
        this._walkMimeTree(this.mimeTree);
    }

    if(this.mailData.html.length){
        for(i=0, len=this.mailData.html.length; i<len; i++){
            if(!returnValue.html || this.mailData.html[i].level < htmlLevel){
                if(returnValue.html){
                    if(!returnValue.alternatives){
                        returnValue.alternatives = [];
                    }
                    returnValue.alternatives.push({
                        contentType: "text/html",
                        content: returnValue.html
                    });
                }
                htmlLevel = this.mailData.html[i].level;
                returnValue.html = this.mailData.html[i].content;
            }else{
                if(!returnValue.alternatives){
                    returnValue.alternatives = [];
                }
                returnValue.alternatives.push({
                    contentType: "text/html",
                    content: this.mailData.html[i].content
                });
            }
        }
    }

    if(this.mailData.text.length){
        for(i=0, len=this.mailData.text.length; i<len; i++){
            if(!returnValue.text || this.mailData.text[i].level < textLevel){
                if(returnValue.text){
                    if(!returnValue.alternatives){
                        returnValue.alternatives = [];
                    }
                    returnValue.alternatives.push({
                        contentType: "text/plain",
                        content: returnValue.text
                    });
                }
                textLevel = this.mailData.text[i].level;
                returnValue.text = this.mailData.text[i].content;
            }else{
                if(!returnValue.alternatives){
                    returnValue.alternatives = [];
                }
                returnValue.alternatives.push({
                    contentType: "text/plain",
                    content: this.mailData.text[i].content
                });
            }
        }
    }

    returnValue.headers = this.mimeTree.parsedHeaders;

    if(this.mimeTree.subject){
        returnValue.subject = this.mimeTree.subject;
    }

    if(this.mimeTree.references){
        returnValue.references = this.mimeTree.references;
    }

    if(this.mimeTree.inReplyTo){
        returnValue.inReplyTo = this.mimeTree.inReplyTo;
    }

    if(this.mimeTree.priority){
        returnValue.priority = this.mimeTree.priority;
    }

    if(this.mimeTree.from){
        returnValue.from = this.mimeTree.from;
    }

    if(this.mimeTree.to){
        returnValue.to = this.mimeTree.to;
    }

    if(this.mimeTree.cc){
        returnValue.cc = this.mimeTree.cc;
    }

    if(this.mimeTree.bcc){
        returnValue.bcc = this.mimeTree.bcc;
    }

    if(this.mailData.attachments.length){
        returnValue.attachments = [];
        for(i=0, len=this.mailData.attachments.length; i<len; i++){
            returnValue.attachments.push(this.mailData.attachments[i].content);
        }
    }

    process.nextTick(this.emit.bind(this, "end", returnValue));
};

/**
 * <p>Walks the mime tree and runs processMimeNode on each node of the tree</p>
 *
 * @param {Object} node A mime tree node
 * @param {Number} [level=0] current depth
 */
MailParser.prototype._walkMimeTree = function(node, level){
    level = level || 1;
    for(var i=0, len = node.childNodes.length; i<len; i++){
        this._processMimeNode(node.childNodes[i], level, node.meta.mimeMultipart);
        this._walkMimeTree(node.childNodes[i], level+1);
    }
};

/**
 * <p>Processes of a node in the mime tree</p>
 *
 * <p>Pushes the node into appropriate <code>this.mailData</code> array (<code>text/html</code> to <code>this.mailData.html</code> array etc)</p>
 *
 * @param {Object} node A mime tree node
 * @param {Number} [level=0] current depth
 * @param {String} mimeMultipart Type of multipart we are dealing with (if any)
 */
MailParser.prototype._processMimeNode = function(node, level, mimeMultipart){
    var i, len;

    level = level || 0;

    if(!node.attachment){
        switch(node.meta.contentType){
            case "text/html":
                if(mimeMultipart == "mixed" && this.mailData.html.length){
                    for(i=0, len = this.mailData.html.length; i<len; i++){
                        if(this.mailData.html[i].level == level){
                            this._joinHTMLNodes(this.mailData.html[i], node.content);
                            return;
                        }
                    }
                }
                this.mailData.html.push({content: this._updateHTMLCharset(node.content || ""), level: level});
                return;
            case "text/plain":
                this.mailData.text.push({content: node.content || "", level: level});
                return;
        }
    }else{
        node.meta = node.meta || {};
        if(node.content){
            node.meta.content = node.content;
        }
        this.mailData.attachments.push({content: node.meta || {}, level: level});

        if(this.options.showAttachmentLinks && mimeMultipart == "mixed" && this.mailData.html.length){
            for(i=0, len = this.mailData.html.length; i<len; i++){
                if(this.mailData.html[i].level == level){
                    this._joinHTMLAttachment(this.mailData.html[i], node.meta);
                    return;
                }
            }
        }
    }
};

/**
 * <p>Joins two HTML blocks by removing the header of the added element<p>
 *
 * @param {Object} htmlNode Original HTML contents node object
 * @param {String} newHTML HTML text to add to the original object node
 */
MailParser.prototype._joinHTMLNodes = function(htmlNode, newHTML){
    var inserted = false;

    // process new HTML
    newHTML = (newHTML || "").toString("utf-8").trim();

    // remove doctype from the beginning
    newHTML = newHTML.replace(/^\s*<\!doctype( [^>]*)?>/gi, "");

    // remove <head> and <html> blocks
    newHTML = newHTML.replace(/<head( [^>]*)?>(.*)<\/head( [^>]*)?>/gi, "").
                    replace(/<\/?html( [^>]*)?>/gi, "").
                    trim();

    // keep only text between <body> tags (if <body exists)
    newHTML.replace(/<body(?: [^>]*)?>(.*)<\/body( [^>]*)?>/gi, function(match, body){
        newHTML = body.trim();
    });

    htmlNode.content = (htmlNode.content || "").toString("utf-8").trim();

    htmlNode.content = htmlNode.content.replace(/<\/body( [^>]*)?>/i, function(match){
        inserted = true;
        return "<br/>\n" + newHTML + match;
    });

    if(!inserted){
        htmlNode.content += "<br/>\n" + newHTML;
    }
};

/**
 * <p>Adds filename placeholder to the HTML if needed</p>
 *
 * @param {Object} htmlNode Original HTML contents node object
 * @param {String} attachment Attachment meta object
 */
MailParser.prototype._joinHTMLAttachment = function(htmlNode, attachment){
    var inserted = false,
        fname = attachment.generatedFileName.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
        cid, newHTML;

    cid = attachment.cid || (attachment.cid = attachment.generatedFileName+"@node");
    newHTML = "\n<div class=\"mailparser-attachment\"><a href=\"cid:"+cid+"\">&lt;" + fname + "&gt;</a></div>";

    htmlNode.content = (htmlNode.content || "").toString("utf-8").trim();

    htmlNode.content = htmlNode.content.replace(/<\/body( [^>]*)?>/i, function(match){
        inserted = true;
        return "<br/>\n" + newHTML + match;
    });

    if(!inserted){
        htmlNode.content += "<br/>\n" + newHTML;
    }
};

/**
 * <p>Converts a string from one charset to another</p>
 *
 * @param {Buffer|String} value A String to be converted
 * @param {String} fromCharset source charset
 * @param {String} [toCharset="UTF-8"] destination charset
 * @returns {Buffer} Converted string as a Buffer (or SlowBuffer)
 */
MailParser.prototype._convertString = function(value, fromCharset, toCharset){
    toCharset = (toCharset || "utf-8").toUpperCase();
    fromCharset = (fromCharset || "utf-8").toUpperCase();

    value = typeof value=="string"?new Buffer(value, "binary"):value;

    if(toCharset == fromCharset){
        return value;
    }

    value = encodinglib.convert(value, toCharset, fromCharset);

    return value;
};

/**
 * <p>Converts a string to UTF-8</p>
 *
 * @param {String} value String to be encoded
 * @returns {String} UTF-8 encoded string
 */
MailParser.prototype._convertStringToUTF8 = function(value){
    value = this._convertString(value, this._currentNode.meta.charset || this.options.defaultCharset || "iso-8859-1").toString("utf-8");
    return value;
};

/**
 * <p>Encodes a header string to UTF-8</p>
 *
 * @param {String} value String to be encoded
 * @returns {String} UTF-8 encoded string
 */
MailParser.prototype._encodeString = function(value){
    value = this._replaceMimeWords(this._convertStringToUTF8(value));
    return value;
};

/**
 * <p>Replaces mime words in a string with UTF-8 encoded strings</p>
 *
 * @param {String} value String to be converted
 * @returns {String} converted string
 */
MailParser.prototype._replaceMimeWords = function(value){
    return value.
        replace(/(=\?[^?]+\?[QqBb]\?[^?]+\?=)\s+(?==\?[^?]+\?[QqBb]\?[^?]+\?=)/g, "$1"). // join mimeWords
        replace(/\=\?[^?]+\?[QqBb]\?[^?]+\?=/g, (function(a){
            return mimelib.decodeMimeWord(a.replace(/\s/g,''));
        }).bind(this));
};

/**
 * <p>Removes enclosing quotes ("", '', &lt;&gt;) from a string</p>
 *
 * @param {String} value String to be converted
 * @returns {String} converted string
 */
MailParser.prototype._trimQuotes = function(value){
    value = (value || "").trim();
    if((value.charAt(0)=='"' && value.charAt(value.length-1)=='"') ||
      (value.charAt(0)=="'" && value.charAt(value.length-1)=="'") ||
      (value.charAt(0)=="<" && value.charAt(value.length-1)==">")){
        value = value.substr(1,value.length-2);
    }
    return value;
};

/**
 * <p>Generates a context unique filename for an attachment</p>
 *
 * <p>If a filename already exists, append a number to it</p>
 *
 * <ul>
 *     <li>file.txt</li>
 *     <li>file-1.txt</li>
 *     <li>file-2.txt</li>
 * </ul>
 *
 * @param {String} fileName source filename
 * @param {String} contentType source content type
 * @returns {String} generated filename
 */
MailParser.prototype._generateFileName = function(fileName, contentType){
    var ext, defaultExt = "";

    if(contentType){
        defaultExt = mimelib.contentTypesReversed[contentType];
        defaultExt = defaultExt?"."+defaultExt:"";
    }

    fileName = fileName || "attachment"+defaultExt;

    // remove path if it is included in the filename
    fileName = fileName.toString().split(/[\/\\]+/).pop().replace(/^\.+/,"") || "attachment";

    if(fileName in this._fileNames){
        this._fileNames[fileName]++;
        ext = fileName.substr((fileName.lastIndexOf(".") || 0)+1);
        if(ext == fileName){
            fileName += "-" +  this._fileNames[fileName];
        }else{
            fileName = fileName.substr(0, fileName.length - ext.length - 1) + "-" + this._fileNames[fileName] + "." + ext;
        }
    }else{
        this._fileNames[fileName] = 0;
    }
    return fileName;
};


/**
 * <p>Replaces character set to UTF-8 in HTML &lt;meta&gt; tags</p>
 *
 * @param {String} HTML html contents
 * @returns {String} updated HTML
 */
MailParser.prototype._updateHTMLCharset = function(html){

    html = html.replace(/\n/g,"\u0000").
        replace(/<meta[^>]*>/gi, function(meta){
            if(meta.match(/http\-equiv\s*=\s*"?content\-type/i)){
                return '<meta http-equiv="content-type" content="text/html; charset=utf-8" />';
            }
            if(meta.match(/\scharset\s*=\s*['"]?[\w\-]+["'\s>\/]/i)){
                return '<meta charset="utf-8"/>';
            }
            return meta;
        }).
        replace(/\u0000/g,"\n");

    return html;
};

/**
 * <p>Detects the charset of an HTML file</p>
 *
 * @param {String} HTML html contents
 * @returns {String} Charset for the HTML
 */
MailParser.prototype._detectHTMLCharset = function(html){
    var charset, input, meta;

    if(typeof html !=" string"){
        html = html.toString("ascii");
    }

    if((meta = html.match(/<meta\s+http-equiv=["']content-type["'][^>]*?>/i))){
        input = meta[0];
    }

    if(input){
        charset = input.match(/charset\s?=\s?([a-zA-Z\-_:0-9]*);?/);
        if(charset){
            charset = (charset[1] || "").trim().toLowerCase();
        }
    }

    if(!charset && (meta = html.match(/<meta\s+charset=["']([^'"<\/]*?)["']/i))){
        charset = (meta[1] || "").trim().toLowerCase();
    }

    return charset;
};

});
define('imap',['require','exports','module','util','rdcommon/log','net','tls','events','mailparser/mailparser'],function(require, exports, module) {
var util = require('util'), $log = require('rdcommon/log'),
    net = require('net'), tls = require('tls'),
    EventEmitter = require('events').EventEmitter,
    mailparser = require('mailparser/mailparser');

var emptyFn = function() {}, CRLF = '\r\n',
    CRLF_BUFFER = Buffer(CRLF),
    STATES = {
      NOCONNECT: 0,
      NOAUTH: 1,
      AUTH: 2,
      BOXSELECTING: 3,
      BOXSELECTED: 4
    }, BOX_ATTRIBS = ['NOINFERIORS', 'NOSELECT', 'MARKED', 'UNMARKED'],
    MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'],
    reFetch = /^\* (\d+) FETCH [\s\S]+? \{(\d+)\}$/,
    reDate = /^(\d{2})-(.{3})-(\d{4})$/,
    reDateTime = /^(\d{2})-(.{3})-(\d{4}) (\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})$/,
    HOUR_MILLIS = 60 * 60 * 1000, MINUTE_MILLIS = 60 * 1000;

const CHARCODE_RBRACE = ('}').charCodeAt(0),
      CHARCODE_ASTERISK = ('*').charCodeAt(0),
      CHARCODE_RPAREN = (')').charCodeAt(0);

var setTimeoutFunc = window.setTimeout.bind(window),
    clearTimeoutFunc = window.clearTimeout.bind(window);

exports.TEST_useTimeoutFuncs = function(setFunc, clearFunc) {
  setTimeoutFunc = setFunc;
  clearTimeoutFunc = clearFunc;
};

/**
 * A buffer for us to assemble buffers so the back-end doesn't fragment them.
 * This is safe for mozTCPSocket's buffer usage because the buffer is always
 * consumed synchronously.  This is not necessarily safe under other semantics.
 */
var gSendBuf = new Uint8Array(2000);

function singleArgParseInt(x) {
  return parseInt(x, 10);
}

/**
 * Parses (UTC) IMAP dates into UTC timestamps. IMAP dates are DD-Mon-YYYY.
 */
function parseImapDate(dstr) {
  var match = reDate.exec(dstr);
  if (!match)
    throw new Error("Not a good IMAP date: " + dstr);
  var day = parseInt(match[1], 10),
      zeroMonth = MONTHS.indexOf(match[2]),
      year = parseInt(match[3], 10);
  return Date.UTC(year, zeroMonth, day);
}

/**
 * Modified utf-7 detecting regexp for use by `decodeModifiedUtf7`.
 */
const RE_MUTF7 = /&([^-]*)-/g,
      RE_COMMA = /,/g;
/**
 * Decode the modified utf-7 representation used to encode mailbox names to
 * lovely unicode.
 *
 * Notes:
 * - '&' enters mutf-7 mode, '-' exits it (and exiting is required!), but '&-'
 *    encodes a '&' rather than * a zero-length string.
 * - ',' is used instead of '/' for the base64 encoding
 *
 * Learn all about it at:
 * https://tools.ietf.org/html/rfc3501#section-5.1.3
 */
function decodeModifiedUtf7(encoded) {
  return encoded.replace(
    RE_MUTF7,
    function replacer(fullMatch, b64data) {
      // &- encodes &
      if (!b64data.length)
        return '&';
      // we use a funky base64 where ',' is used instead of '/'...
      b64data = b64data.replace(RE_COMMA, '/');
      // The base-64 encoded utf-16 gets converted into a buffer holding the
      // utf-16 encoded bits.
      var u16data = new Buffer(b64data, 'base64');
      // and this actually decodes the utf-16 into a JS string.
      return u16data.toString('utf-16be');
    });
}
exports.decodeModifiedUtf7 = decodeModifiedUtf7;

/**
 * Parses IMAP date-times into UTC timestamps.  IMAP date-times are
 * "DD-Mon-YYYY HH:MM:SS +ZZZZ"
 */
function parseImapDateTime(dstr) {
  var match = reDateTime.exec(dstr);
  if (!match)
    throw new Error("Not a good IMAP date-time: " + dstr);
  var day = parseInt(match[1], 10),
      zeroMonth = MONTHS.indexOf(match[2]),
      year = parseInt(match[3], 10),
      hours = parseInt(match[4], 10),
      minutes = parseInt(match[5], 10),
      seconds = parseInt(match[6], 10),
      // figure the timestamp before the zone stuff.  We don't
      timestamp = Date.UTC(year, zeroMonth, day, hours, minutes, seconds),
      // to reduce string garbage creation, we use one string. (we have to
      // play math games no matter what, anyways.)
      zoneDelta = parseInt(match[7], 10),
      zoneHourDelta = Math.floor(zoneDelta / 100),
      // (the negative sign sticks around through the mod operation)
      zoneMinuteDelta = zoneDelta % 100;

  // ex: GMT-0700 means 7 hours behind, so we need to add 7 hours, aka
  // subtract negative 7 hours.
  timestamp -= zoneHourDelta * HOUR_MILLIS + zoneMinuteDelta * MINUTE_MILLIS;

  return timestamp;
}

function formatImapDateTime(date) {
  var s;
  s = ((date.getDate() < 10) ? ' ' : '') + date.getDate() + '-' +
       MONTHS[date.getMonth()] + '-' +
       date.getFullYear() + ' ' +
       ('0'+date.getHours()).slice(-2) + ':' +
       ('0'+date.getMinutes()).slice(-2) + ':' +
       ('0'+date.getSeconds()).slice(-2) +
       ((date.getTimezoneOffset() > 0) ? ' -' : ' +' ) +
       ('0'+(Math.abs(date.getTimezoneOffset()) / 60)).slice(-2) +
       ('0'+(Math.abs(date.getTimezoneOffset()) % 60)).slice(-2);
  return s;
}

var IDLE_NONE = 1,
    IDLE_WAIT = 2,
    IDLE_READY = 3,
    DONE_WAIT = 4;

function ImapConnection (options) {
  if (!(this instanceof ImapConnection))
    return new ImapConnection(options);
  EventEmitter.call(this);

  this._options = {
    username: '',
    password: '',
    host: 'localhost',
    port: 143,
    secure: false,
    connTimeout: 10000, // connection timeout in msecs
    _logParent: null
  };
  this._state = {
    status: STATES.NOCONNECT,
    conn: null,
    curId: 0,
    requests: [],
    numCapRecvs: 0,
    isReady: false,
    isIdle: true,
    tmrKeepalive: null,
    tmoKeepalive: 10000,
    tmrConn: null,
    curData: null,
    // Because 0-length literals are a possibility, use null to represent no
    // expected data.
    curExpected: null,
    curXferred: 0,
    box: {
      _uidnext: 0,
      _flags: [],
      _newKeywords: false,
      validity: 0,
      // undefined when unknown, null is nomodseq, string of the actual
      // highestmodseq once retrieved.
      highestModSeq: undefined,
      keywords: [],
      permFlags: [],
      name: null,
      messages: { total: 0, new: 0 }
    },
    ext: {
      // Capability-specific state info
      idle: {
        MAX_WAIT: 1740000, // 29 mins in ms
        state: IDLE_NONE,
        timeWaited: 0 // ms
      }
    }
  };
  this._options = extend(true, this._options, options);
  // The Date.now thing is to assign a random/unique value as a logging stop-gap
  this._LOG = (this._options._logParent ? LOGFAB.ImapProtoConn(this, this._options._logParent, Date.now() % 1000) : null);
  if (this._LOG) this._LOG.created();
  this.delim = null;
  this.namespaces = { personal: [], other: [], shared: [] };
  this.capabilities = [];
  this.enabledCapabilities = [];
};
util.inherits(ImapConnection, EventEmitter);
exports.ImapConnection = ImapConnection;

ImapConnection.prototype.hasCapability = function(name) {
  return this.capabilities.indexOf(name) !== -1;
};

ImapConnection.prototype.connect = function(loginCb) {
  var self = this,
      fnInit = function() {
        // First get pre-auth capabilities, including server-supported auth
        // mechanisms
        self._send('CAPABILITY', null, function() {
          // Next, attempt to login
          var checkedNS = false;
          var redo = function(err, reentry) {
            if (err) {
              loginCb(err);
              return;
            }
            // Next, get the list of available namespaces if supported
            if (!checkedNS && self.capabilities.indexOf('NAMESPACE') > -1) {
              // Re-enter this function after we've obtained the available
              // namespaces
              checkedNS = true;
              self._send('NAMESPACE', null, redo);
              return;
            }
            // Lastly, get the top-level mailbox hierarchy delimiter used by the
            // server
            self._send('LIST "" ""', null, loginCb);
          };
          self._login(redo);
        });
      };
  loginCb = loginCb || emptyFn;
  this._reset();

  if (this._LOG) this._LOG.connect(this._options.host, this._options.port);

  this._state.conn = (this._options.crypto ? tls : net).connect(
                       this._options.port, this._options.host);
  this._state.tmrConn = setTimeoutFunc(this._fnTmrConn.bind(this, loginCb),
                                       this._options.connTimeout);

  this._state.conn.on('connect', function() {
    if (self._LOG) self._LOG.connected();
    clearTimeoutFunc(self._state.tmrConn);
    self._state.status = STATES.NOAUTH;
    /*
    We will need to add support for node-like starttls emulation on top of TCPSocket
    once TCPSocket supports starttls (see also bug 784816).

    if (self._options.crypto === 'starttls') {
      self._send('STARTTLS', function() {
        starttls(self, function() {
	  if (!self.authorized)
	    throw new Error("starttls failed");
	  fnInit();
        });
      });
      return;
    }
    */
    fnInit();
  });
  this._state.conn.on('data', function(buffer) {
    try {
      processData(buffer);
    }
    catch (ex) {
      console.error('Explosion while processing data', ex);
      if ('stack' in ex)
        console.error('Stack:', ex.stack);
      throw ex;
    }
  });
  /**
   * Process up to one thing.  Generally:
   * - If we are processing a literal, we make sure we have the data for the
   *   whole literal, then we process it.
   * - If we are not in a literal, we buffer until we have one newline.
   * - If we have leftover data, we invoke ourselves in a quasi-tail-recursive
   *   fashion or in subsequent ticks.  It's not clear that the logic that
   *   defers to future ticks is sound.
   */
  function processData(data) {
    if (data.length === 0) return;
    var idxCRLF = null, literalInfo;

    // - Accumulate data until newlines when not in a literal
    if (self._state.curExpected === null) {
      // no newline, append and bail
      if ((idxCRLF = bufferIndexOfCRLF(data, 0)) === -1) {
        if (self._state.curData)
          self._state.curData = bufferAppend(self._state.curData, data);
        else
          self._state.curData = data;
        return;
      }
      // yes newline, use the buffered up data and new data
      // (note: data may now contain more than one line's worth of data!)
      if (self._state.curData && self._state.curData.length) {
        data = bufferAppend(self._state.curData, data);
        self._state.curData = null;
      }
    }

    // -- Literal
    // Don't mess with incoming data if it's part of a literal
    if (self._state.curExpected !== null) {
      var curReq = self._state.requests[0];
      if (!curReq._done) {
        var chunk = data;
        self._state.curXferred += data.length;
        if (self._state.curXferred > self._state.curExpected) {
          var pos = data.length
                    - (self._state.curXferred - self._state.curExpected),
              extra = data.slice(pos);
          if (pos > 0)
            chunk = data.slice(0, pos);
          else
            chunk = undefined;
          data = extra;
          curReq._done = 1;
        }

        if (chunk && chunk.length) {
          if (self._LOG) self._LOG.data(chunk.length, chunk);
          if (curReq._msgtype === 'headers') {
            chunk.copy(self._state.curData, curReq.curPos, 0);
            curReq.curPos += chunk.length;
          }
          else
            curReq._msg.emit('data', chunk);
        }
      }

      if (curReq._done) {
        var restDesc;
        if (curReq._done === 1) {
          if (curReq._msgtype === 'headers')
            curReq._headers = self._state.curData.toString('ascii');
          self._state.curData = null;
          curReq._done = true;
        }

        if (self._state.curData)
          self._state.curData = bufferAppend(self._state.curData, data);
        else
          self._state.curData = data;

        idxCRLF = bufferIndexOfCRLF(self._state.curData);
        if (idxCRLF && self._state.curData[idxCRLF - 1] === CHARCODE_RPAREN) {
          if (idxCRLF > 1) {
            // eat up to, but not including, the right paren
            restDesc = self._state.curData.toString('ascii', 0, idxCRLF - 1)
                         .trim();
            if (restDesc.length)
              curReq._desc += ' ' + restDesc;
          }
          parseFetch(curReq._desc, curReq._headers, curReq._msg);
          data = self._state.curData.slice(idxCRLF + 2);
          curReq._done = false;
          self._state.curXferred = 0;
          self._state.curExpected = null;
          self._state.curData = null;
          curReq._msg.emit('end', curReq._msg);
          // XXX we could just change the next else to not be an else, and then
          // this conditional is not required and we can just fall out.  (The
          // expected check === 0 may need to be reinstated, however.)
          if (data.length && data[0] === CHARCODE_ASTERISK) {
            processData(data);
            return;
          }
        } else // ??? no right-paren, keep accumulating data? this seems wrong.
          return;
      } else // not done, keep accumulating data
        return;
    }
    // -- Fetch w/literal
    // (More specifically, we were not in a literal, let's see if this line is
    // a fetch result line that starts a literal.  We want to minimize
    // conversion to a string, as there used to be a naive conversion here that
    // chewed up a lot of processor by converting all of data rather than
    // just the current line.)
    else if (data[0] === CHARCODE_ASTERISK) {
      var strdata;
      idxCRLF = bufferIndexOfCRLF(data, 0);
      if (data[idxCRLF - 1] === CHARCODE_RBRACE &&
          (literalInfo =
             (strdata = data.toString('ascii', 0, idxCRLF)).match(reFetch))) {
        self._state.curExpected = parseInt(literalInfo[2], 10);

        var curReq = self._state.requests[0],
            type = /BODY\[(.*)\](?:\<\d+\>)?/.exec(strdata),
            msg = new ImapMessage(),
            desc = strdata.substring(strdata.indexOf('(')+1).trim();
        msg.seqno = parseInt(literalInfo[1], 10);
        type = type[1];
        curReq._desc = desc;
        curReq._msg = msg;
        msg.size = self._state.curExpected;

        curReq._fetcher.emit('message', msg);

        curReq._msgtype = (type.indexOf('HEADER') === 0 ? 'headers' : 'body');
        // This library buffers headers, so allocate a buffer to hold the literal.
        if (curReq._msgtype === 'headers') {
          self._state.curData = new Buffer(self._state.curExpected);
          curReq.curPos = 0;
        }
        if (self._LOG) self._LOG.data(strdata.length, strdata);
        // (If it's not headers, then it's body, and we generate 'data' events.)
        processData(data.slice(idxCRLF + 2));
        return;
      }
    }

    if (data.length === 0)
      return;
    data = customBufferSplitCRLF(data);
    // Defer any extra server responses found in the incoming data
    for (var i=1,len=data.length; i<len; ++i) {
      process.nextTick(processData.bind(null, data[i]));
    }

    data = data[0].toString('ascii');
    if (self._LOG) self._LOG.data(data.length, data);
    data = stringExplode(data, ' ', 3);

    // -- Untagged server responses
    if (data[0] === '*') {
      if (self._state.status === STATES.NOAUTH) {
        if (data[1] === 'PREAUTH') { // the server pre-authenticated us
          self._state.status = STATES.AUTH;
          if (self._state.numCapRecvs === 0)
            self._state.numCapRecvs = 1;
        } else if (data[1] === 'NO' || data[1] === 'BAD' || data[1] === 'BYE') {
          if (self._LOG && data[1] === 'BAD')
            self._LOG.bad(data[2]);
          self._state.conn.end();
          return;
        }
        if (!self._state.isReady)
          self._state.isReady = true;
        // Restrict the type of server responses when unauthenticated
        if (data[1] !== 'CAPABILITY' && data[1] !== 'ALERT')
          return;
      }
      switch (data[1]) {
        case 'CAPABILITY':
          if (self._state.numCapRecvs < 2)
            self._state.numCapRecvs++;
          self.capabilities = data[2].split(' ').map(up);
        break;
        // Feedback from the ENABLE command.
        case 'ENABLED':
          self.enabledCapabilities = self.enabledCapabilities.concat(
                                       data[2].split(' '));
          self.enabledCapabilities.sort();
        break;
        // The system-defined flags for this mailbox; during SELECT/EXAMINE
        case 'FLAGS':
          if (self._state.status === STATES.BOXSELECTING) {
            self._state.box._flags = data[2].substr(1, data[2].length-2)
                                            .split(' ').map(function(flag) {
                                              return flag.substr(1);
                                            });
          }
        break;
        case 'OK':
          if ((result = /^\[ALERT\] (.*)$/i.exec(data[2])))
            self.emit('alert', result[1]);
          else if (self._state.status === STATES.BOXSELECTING) {
            var result;
            if ((result = /^\[UIDVALIDITY (\d+)\]/i.exec(data[2])))
              self._state.box.validity = result[1];
            else if ((result = /^\[UIDNEXT (\d+)\]/i.exec(data[2])))
              self._state.box._uidnext = parseInt(result[1]);
            // Flags the client can change permanently.  If \* is included, it
            // means we can make up new keywords.
            else if ((result = /^\[PERMANENTFLAGS \((.*)\)\]/i.exec(data[2]))) {
              self._state.box.permFlags = result[1].split(' ');
              var idx;
              if ((idx = self._state.box.permFlags.indexOf('\\*')) > -1) {
                self._state.box._newKeywords = true;
                self._state.box.permFlags.splice(idx, 1);
              }
              self._state.box.keywords = self._state.box.permFlags
                                             .filter(function(flag) {
                                               return (flag[0] !== '\\');
                                             });
              for (var i=0; i<self._state.box.keywords.length; i++)
                self._state.box.permFlags.splice(self._state.box.permFlags.indexOf(self._state.box.keywords[i]), 1);
              self._state.box.permFlags = self._state.box.permFlags
                                              .map(function(flag) {
                                                return flag.substr(1);
                                              });
            }
            else if ((result = /^\[HIGHESTMODSEQ (\d+)\]/i.exec(data[2]))) {
              // Kept as a string since it may be a full 64-bit value.
              self._state.box.highestModSeq = result[1];
            }
            // The server does not support mod sequences for the folder.
            else if ((result = /^\[NOMODSEQ\]/i.exec(data[2]))) {
              self._state.box.highestModSeq = null;
            }
          }
        break;
        case 'NAMESPACE':
          parseNamespaces(data[2], self.namespaces);
        break;
        case 'SEARCH':
          self._state.requests[0].args.push(
            (data[2] === undefined || data[2].length === 0)
              ? [] : data[2].trim().split(' ').map(singleArgParseInt));
        break;
        case 'LIST':
        case 'XLIST':
          var result;
          if (self.delim === null &&
              (result = /^\(\\No[sS]elect(?:[^)]*)\) (.+?) .*$/.exec(data[2])))
            self.delim = (result[1] === 'NIL'
                          ? false
                          : result[1].substring(1, result[1].length - 1));
          else if (self.delim !== null) {
            if (self._state.requests[0].args.length === 0)
              self._state.requests[0].args.push({});
            result = /^\((.*)\) (.+?) "?([^"]+)"?$/.exec(data[2]);

            var box = {
                  displayName: null,
                  attribs: result[1].split(' ').map(function(attrib) {
                             return attrib.substr(1).toUpperCase();
                           }),
                  delim: (result[2] === 'NIL'
                          ? false : result[2].substring(1, result[2].length-1)),
                  children: null,
                  parent: null
                },
                name = result[3],
                curChildren = self._state.requests[0].args[0];
            if (name[0] === '"' && name[name.length-1] === '"')
              name = name.substring(1, name.length - 1);

            if (box.delim) {
              var path = name.split(box.delim).filter(isNotEmpty),
                  parent = null;
              name = path.pop();
              for (var i=0,len=path.length; i<len; i++) {
                if (!curChildren[path[i]])
                  curChildren[path[i]] = { delim: box.delim };
                if (!curChildren[path[i]].children)
                  curChildren[path[i]].children = {};
                parent = curChildren[path[i]];
                curChildren = curChildren[path[i]].children;
              }

              box.parent = parent;
            }
            box.displayName = decodeModifiedUtf7(name);
            if (curChildren[name])
              box.children = curChildren[name].children;
            curChildren[name] = box;
          }
        break;
        // QRESYNC (when successful) generates a "VANISHED (EARLIER) uids"
        // payload to tell us about deleted/expunged messages when selecting
        // a folder.
        // It will also generate untagged VANISHED updates as the result of an
        // expunge on this connection or other connections (for this folder).
        case 'VANISHED':
          var earlier = false;
          if (data[2].lastIndexOf('(EARLIER) ', 0) === 0) {
            earlier = true;
            data[2] = data[2].substring(10);
          }
          // Using vanished because the existing 'deleted' event uses sequence
          // numbers.
          self.emit('vanished', parseUIDListString(data[2]), earlier);
        break;
        default:
          if (/^\d+$/.test(data[1])) {
            var isUnsolicited = (self._state.requests[0] &&
                      self._state.requests[0].command.indexOf('NOOP') > -1) ||
                      (self._state.isIdle && self._state.ext.idle.state === IDLE_READY);
            switch (data[2]) {
              case 'EXISTS':
                // mailbox total message count
                var prev = self._state.box.messages.total,
                    now = parseInt(data[1]);
                self._state.box.messages.total = now;
                if (self._state.status !== STATES.BOXSELECTING && now > prev) {
                  self._state.box.messages.new = now-prev;
                  self.emit('mail', self._state.box.messages.new); // new mail
                }
              break;
              case 'RECENT':
                // messages marked with the \Recent flag (i.e. new messages)
                self._state.box.messages.new = parseInt(data[1]);
              break;
              case 'EXPUNGE':
                // confirms permanent deletion of a single message
                if (self._state.box.messages.total > 0)
                  self._state.box.messages.total--;
                if (isUnsolicited)
                  self.emit('deleted', parseInt(data[1], 10));
              break;
              default:
                // fetches without header or body (part) retrievals
                if (/^FETCH/.test(data[2])) {
                  var msg = new ImapMessage();
                  parseFetch(data[2].substring(data[2].indexOf("(")+1,
                                               data[2].lastIndexOf(")")),
                             "", msg);
                  msg.seqno = parseInt(data[1], 10);
                  if (self._state.requests.length &&
                      self._state.requests[0].command.indexOf('FETCH') > -1) {
                    var curReq = self._state.requests[0];
                    curReq._fetcher.emit('message', msg);
                    msg.emit('end');
                  } else if (isUnsolicited)
                    self.emit('msgupdate', msg);
                }
            }
          }
      }
    } else if (data[0][0] === 'A' || data[0] === '+') {
      // Tagged server response or continuation response

      if (data[0] === '+' && self._state.ext.idle.state === IDLE_WAIT) {
        self._state.ext.idle.state = IDLE_READY;
        return process.nextTick(function() { self._send(); });
      }

      var sendBox = false;
      clearTimeoutFunc(self._state.tmrKeepalive);
      if (self._state.status === STATES.BOXSELECTING) {
        if (data[1] === 'OK') {
          sendBox = true;
          self._state.status = STATES.BOXSELECTED;
        } else {
          self._state.status = STATES.AUTH;
          self._resetBox();
        }
      }

      // XXX there is an edge case here where we LOGOUT and the server sends
      // "* BYE" "AXX LOGOUT OK" and the close event gets processed (probably
      // because of the BYE and the fact that we don't nextTick a lot for the
      // moz logic) and _reset() nukes the requests before we see the LOGOUT,
      // which we do end up seeing.  So just bail in that case.
      if (self._state.requests.length === 0) {
        return;
      }

      if (self._state.requests[0].command.indexOf('RENAME') > -1) {
        self._state.box.name = self._state.box._newName;
        delete self._state.box._newName;
        sendBox = true;
      }

      if (typeof self._state.requests[0].callback === 'function') {
        var err = null;
        var args = self._state.requests[0].args,
            cmd = self._state.requests[0].command;
        if (data[0] === '+') {
          if (cmd.indexOf('APPEND') !== 0) {
            err = new Error('Unexpected continuation');
            err.type = 'continuation';
            err.serverResponse = '';
            err.request = cmd;
          } else
            return self._state.requests[0].callback();
        } else if (data[1] !== 'OK') {
          err = new Error('Error while executing request: ' + data[2]);
          err.type = data[1];
          err.serverResponse = data[2];
          err.request = cmd;
        } else if (self._state.status === STATES.BOXSELECTED) {
          if (sendBox) // SELECT, EXAMINE, RENAME
            args.unshift(self._state.box);
          // According to RFC 3501, UID commands do not give errors for
          // non-existant user-supplied UIDs, so give the callback empty results
          // if we unexpectedly received no untagged responses.
          else if ((cmd.indexOf('UID FETCH') === 0
                    || cmd.indexOf('UID SEARCH') === 0
                   ) && args.length === 0)
            args.unshift([]);
        }
        args.unshift(err);
        self._state.requests[0].callback.apply({}, args);
      }


      var recentReq = self._state.requests.shift();
      if (!recentReq) {
        // We expect this to happen in the case where our callback above
        // resulted in our connection being killed.  So just bail in that case.
        if (self._state.status === STATES.NOCONNECT)
          return;
        // This is unexpected and bad.  Log a poor man's error for now.
        console.error('IMAP: Somehow no recentReq for data:', data);
        return;
      }
      var recentCmd = recentReq.command;
      if (self._LOG) self._LOG.cmd_end(recentReq.prefix, recentCmd, /^LOGIN$/.test(recentCmd) ? '***BLEEPING OUT LOGON***' : recentReq.cmddata);
      if (self._state.requests.length === 0
          && recentCmd !== 'LOGOUT') {
        if (self._state.status === STATES.BOXSELECTED &&
            self.capabilities.indexOf('IDLE') > -1) {
          // According to RFC 2177, we should re-IDLE at least every 29
          // minutes to avoid disconnection by the server
          self._send('IDLE', null, undefined, undefined, true);
        }
        self._state.tmrKeepalive = setTimeoutFunc(function() {
          if (self._state.isIdle) {
            if (self._state.ext.idle.state === IDLE_READY) {
              self._state.ext.idle.timeWaited += self._state.tmoKeepalive;
              if (self._state.ext.idle.timeWaited >= self._state.ext.idle.MAX_WAIT)
                // restart IDLE
                self._send('IDLE', null, undefined, undefined, true);
            } else if (self.capabilities.indexOf('IDLE') === -1)
              self._noop();
          }
        }, self._state.tmoKeepalive);
      } else
        process.nextTick(function() { self._send(); });

      self._state.isIdle = true;
    } else if (data[0] === 'IDLE') {
      if (self._state.requests.length)
        process.nextTick(function() { self._send(); });
      self._state.isIdle = false;
      self._state.ext.idle.state = IDLE_NONE;
      self._state.ext.idle.timeWaited = 0;
    } else {
      if (self._LOG)
        self._LOG.unknownResponse(data[0], data[1], data[2]);
      // unknown response
    }
  };

  this._state.conn.on('close', function onClose() {
    self._reset();
    if (this._LOG) this._LOG.closed();
    self.emit('close');
  });
  this._state.conn.on('error', function(err) {
    try {
      var errType;
      // (only do error probing on things we can safely use 'in' on)
      if (err && typeof(err) === 'object') {
        // detect an nsISSLStatus instance by an unusual property.
        if ('isNotValidAtThisTime' in err) {
          err = new Error('SSL error');
          errType = err.type = 'bad-security';
        }
      }
      clearTimeoutFunc(self._state.tmrConn);
      if (self._state.status === STATES.NOCONNECT) {
        var connErr = new Error('Unable to connect. Reason: ' + err);
        connErr.type = errType || 'unresponsive-server';
        connErr.serverResponse = '';
        loginCb(connErr);
      }
      self.emit('error', err);
      if (this._LOG) this._LOG.connError(err);
    }
    catch(ex) {
      console.error("Error in imap onerror:", ex);
      throw ex;
    }
  });
};

/**
 * Aggressively shutdown the connection, ideally so that no further callbacks
 * are invoked.
 */
ImapConnection.prototype.die = function() {
  // NB: there's still a lot of events that could happen, but this is only
  // being used by unit tests right now.
  if (this._state.conn) {
    this._state.conn.removeAllListeners();
    this._state.conn.end();
  }
  this._reset();
  this._LOG.__die();
};

ImapConnection.prototype.isAuthenticated = function() {
  return this._state.status >= STATES.AUTH;
};

ImapConnection.prototype.logout = function(cb) {
  if (this._state.status >= STATES.NOAUTH)
    this._send('LOGOUT', null, cb);
  else
    throw new Error('Not connected');
};

/**
 * Enable one or more optional capabilities.  This is additive and there's no
 * way to un-enable things once enabled.  So enable(["a", "b"]), followed by
 * enable(["c"]) is the same as enable(["a", "b", "c"]).
 *
 * http://tools.ietf.org/html/rfc5161
 */
ImapConnection.prototype.enable = function(capabilities, cb) {
  if (this._state.status < STATES.AUTH)
    throw new Error('Not connected or authenticated');
  this._send('ENABLE ' + capabilities.join(' '), cb || emptyFn);
};

ImapConnection.prototype.openBox = function(name, readOnly, cb) {
  if (this._state.status < STATES.AUTH)
    throw new Error('Not connected or authenticated');
  if (this._state.status === STATES.BOXSELECTED)
    this._resetBox();
  if (cb === undefined) {
    if (readOnly === undefined)
      cb = emptyFn;
    else
      cb = readOnly;
    readOnly = false;
  }
  var self = this;
  function dispatchFunc() {
    self._state.status = STATES.BOXSELECTING;
    self._state.box.name = name;
  }

  this._send((readOnly ? 'EXAMINE' : 'SELECT'), ' "' + escape(name) + '"', cb,
             dispatchFunc);
};

/**
 * SELECT/EXAMINE a box using the QRESYNC extension.  The last known UID
 * validity and last known modification sequence are required.  The set of
 * known UIDs is optional.
 */
ImapConnection.prototype.qresyncBox = function(name, readOnly,
                                               uidValidity, modSeq,
                                               knownUids,
                                               cb) {
  if (this._state.status < STATES.AUTH)
    throw new Error('Not connected or authenticated');
  if (this.enabledCapabilities.indexOf('QRESYNC') === -1)
    throw new Error('QRESYNC is not enabled');
  if (this._state.status === STATES.BOXSELECTED)
    this._resetBox();
  if (cb === undefined) {
    if (readOnly === undefined)
      cb = emptyFn;
    else
      cb = readOnly;
    readOnly = false;
  }
  var self = this;
  function dispatchFunc() {
    self._state.status = STATES.BOXSELECTING;
    self._state.box.name = name;
  }

  this._send((readOnly ? 'EXAMINE' : 'SELECT') + ' "' + escape(name) + '"' +
             ' (QRESYNC (' + uidValidity + ' ' + modSeq +
             (knownUids ? (' ' + knownUids) : '') + '))', cb, dispatchFunc);
};



// also deletes any messages in this box marked with \Deleted
ImapConnection.prototype.closeBox = function(cb) {
  var self = this;
  if (this._state.status !== STATES.BOXSELECTED)
    throw new Error('No mailbox is currently selected');
  this._send('CLOSE', null, function(err) {
    if (!err) {
      self._state.status = STATES.AUTH;
      self._resetBox();
    }
    cb(err);
  });
};

ImapConnection.prototype.removeDeleted = function(cb) {
  if (this._state.status !== STATES.BOXSELECTED)
    throw new Error('No mailbox is currently selected');
  cb = arguments[arguments.length-1];

  this._send('EXPUNGE', null, cb);
};

ImapConnection.prototype.getBoxes = function(namespace, searchSpec, cb) {
  cb = arguments[arguments.length-1];
  if (arguments.length < 2)
    namespace = '';
  if (arguments.length < 3)
    searchSpec = '*';

  var cmd, cmddata = ' "' + escape(namespace) + '" "' +
                       escape(searchSpec) + '"';
  // Favor special-use over XLIST
  if (this.capabilities.indexOf('SPECIAL-USE') !== -1) {
    cmd = 'LIST';
    cmddata += ' RETURN (SPECIAL-USE)';
  }
  else if (this.capabilities.indexOf('XLIST') !== -1) {
    cmd = 'XLIST';
  }
  else {
    cmd = 'LIST';
  }
  this._send(cmd, cmddata, cb);
};

ImapConnection.prototype.addBox = function(name, cb) {
  cb = arguments[arguments.length-1];
  if (typeof name !== 'string' || name.length === 0)
    throw new Error('Mailbox name must be a string describing the full path'
                    + ' of a new mailbox to be created');
  this._send('CREATE', ' "' + escape(name) + '"', cb);
};

ImapConnection.prototype.delBox = function(name, cb) {
  cb = arguments[arguments.length-1];
  if (typeof name !== 'string' || name.length === 0)
    throw new Error('Mailbox name must be a string describing the full path'
                    + ' of an existing mailbox to be deleted');
  this._send('DELETE', ' "' + escape(name) + '"', cb);
};

ImapConnection.prototype.renameBox = function(oldname, newname, cb) {
  cb = arguments[arguments.length-1];
  if (typeof oldname !== 'string' || oldname.length === 0)
    throw new Error('Old mailbox name must be a string describing the full path'
                    + ' of an existing mailbox to be renamed');
  else if (typeof newname !== 'string' || newname.length === 0)
    throw new Error('New mailbox name must be a string describing the full path'
                    + ' of a new mailbox to be renamed to');
  if (this._state.status === STATES.BOXSELECTED
      && oldname === this._state.box.name && oldname !== 'INBOX')
    this._state.box._newName = oldname;

  this._send('RENAME', ' "' + escape(oldname) + '" "' + escape(newname) + '"', cb);
};

ImapConnection.prototype.search = function(options, cb) {
  this._search('UID ', options, cb);
};
ImapConnection.prototype._search = function(which, options, cb) {
  if (this._state.status !== STATES.BOXSELECTED)
    throw new Error('No mailbox is currently selected');
  if (!Array.isArray(options))
    throw new Error('Expected array for search options');
  this._send(which + 'SEARCH',
             buildSearchQuery(options, this.capabilities), cb);
};

ImapConnection.prototype.append = function(data, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }
  options = options || {};
  if (!('mailbox' in options)) {
    if (this._state.status !== STATES.BOXSELECTED)
      throw new Error('No mailbox specified or currently selected');
    else
      options.mailbox = this._state.box.name;
  }
  var cmd = ' "'+escape(options.mailbox)+'"';
  if ('flags' in options) {
    if (!Array.isArray(options.flags))
      options.flags = Array(options.flags);
    if (options.flags.length)
      cmd += " (\\"+options.flags.join(' \\')+")";
  }
  if ('date' in options) {
    if (!(options.date instanceof Date))
      throw new Error('Expected null or Date object for date');
    cmd += ' "' + formatImapDateTime(options.date) + '"';
  }
  cmd += ' {';
  cmd += (Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data));
  cmd += '}';
  var self = this, step = 1;
  this._send('APPEND', cmd, function(err) {
    if (err || step++ === 2)
      return cb(err);
    if (typeof(data) === 'string') {
      self._state.conn.write(Buffer(data + CRLF));
    }
    else {
      self._state.conn.write(data);
      self._state.conn.write(CRLF_BUFFER);
    }
    if (this._LOG) this._LOG.sendData(data.length, data);
  });
}

ImapConnection.prototype.multiappend = function(messages, cb) {
  if (this._state.status !== STATES.BOXSELECTED)
    throw new Error('No mailbox specified or currently selected');
  var cmd = ' "'+escape(this._state.box.name)+'"';

  function buildAppendClause(options) {
    if ('flags' in options) {
      if (!Array.isArray(options.flags))
        options.flags = Array(options.flags);
      if (options.flags.length)
        cmd += " (\\"+options.flags.join(' \\')+")";
    }
    if ('date' in options) {
      if (!(options.date instanceof Date))
        throw new Error('Expected null or Date object for date');
      cmd += ' "' + formatImapDateTime(options.date) + '"';
    }
    cmd += ' {';
    cmd += (Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data));
    cmd += '}';
  }

  var self = this, iNextMessage = 1, done = false,
      message = messages[0], data = message.messageText;
  buildAppendClause(message);
  this._send('APPEND', cmd, function(err) {
    if (err || done)
      return cb(err, iNextMessage - 1);

    self._state.conn.write(typeof(data) === 'string' ? Buffer(data) : data);
    // The message literal itself should end with a newline.  We don't want to
    // send an extra one because then that terminates the command.
    if (self._LOG) self._LOG.sendData(data.length, data);

    if (iNextMessage < messages.length) {
      cmd = '';
      message = messages[iNextMessage++];
      data = message.messageText;
      buildAppendClause(message);
      cmd += CRLF;
      self._state.conn.write(Buffer(cmd));
      if (self._LOG) self._LOG.sendData(cmd.length, cmd);
    }
    else {
      // This terminates the command.
      self._state.conn.write(CRLF_BUFFER);
      if (self._LOG) self._LOG.sendData(2, CRLF);
      done = true;
    }
  });
}


ImapConnection.prototype.fetch = function(uids, options) {
  return this._fetch('UID ', uids, options);
};
ImapConnection.prototype._fetch = function(which, uids, options) {
  if (this._state.status !== STATES.BOXSELECTED)
    throw new Error('No mailbox is currently selected');

  if (uids === undefined || uids === null
      || (Array.isArray(uids) && uids.length === 0))
    throw new Error('Nothing to fetch');

  if (!Array.isArray(uids))
    uids = [uids];
  validateUIDList(uids);

  var opts = {
    markSeen: false,
    request: {
      struct: true,
      headers: true, // \_______ at most one of these can be used for any given
                    //   _______ fetch request
      body: false  //   /
    }
  }, toFetch, bodyRange = '', self = this;
  if (typeof options !== 'object')
    options = {};
  extend(true, opts, options);

  if (!Array.isArray(opts.request.headers)) {
    if (Array.isArray(opts.request.body)) {
      var rangeInfo;
      if (opts.request.body.length !== 2)
        throw new Error("Expected Array of length 2 for body byte range");
      else if (typeof opts.request.body[1] !== 'string'
               || !(rangeInfo = /^([\d]+)\-([\d]+)$/.exec(opts.request.body[1]))
               || parseInt(rangeInfo[1]) >= parseInt(rangeInfo[2]))
        throw new Error("Invalid body byte range format");
      bodyRange = '<' + parseInt(rangeInfo[1]) + '.' + parseInt(rangeInfo[2])
                  + '>';
      opts.request.body = opts.request.body[0];
    }
    if (typeof opts.request.headers === 'boolean'
        && opts.request.headers === true) {
      // fetches headers only
      toFetch = 'HEADER';
    } else if (typeof opts.request.body === 'boolean'
               && opts.request.body === true) {
      // fetches the whole entire message text (minus the headers), including
      // all message parts
      toFetch = 'TEXT';
    } else if (typeof opts.request.body === 'string') {
      if (opts.request.body.toUpperCase() === 'FULL') {
        // fetches the whole entire message (including the headers)
        toFetch = '';
      } else if (/^([\d]+[\.]{0,1})*[\d]+$/.test(opts.request.body)) {
        // specific message part identifier, e.g. '1', '2', '1.1', '1.2', etc
        toFetch = opts.request.body;
      } else
        throw new Error("Invalid body partID format");
    }
  } else {
    // fetch specific headers only
    toFetch = 'HEADER.FIELDS (' + opts.request.headers.join(' ').toUpperCase()
              + ')';
  }

  var extensions = '';
  if (this.capabilities.indexOf('X-GM-EXT-1') > -1)
    extensions = 'X-GM-THRID X-GM-MSGID X-GM-LABELS ';
  // google is mutually exclusive with QRESYNC
  else if (this.enabledCapabilities.indexOf('QRESYNC') > -1)
    extensions = 'MODSEQ ';

  this._send(which + 'FETCH', ' ' + uids.join(',') + ' (' + extensions
             + 'UID FLAGS INTERNALDATE'
             + (opts.request.struct ? ' BODYSTRUCTURE' : '')
             + (typeof toFetch === 'string' ? ' BODY'
             + (!opts.markSeen ? '.PEEK' : '')
             + '[' + toFetch + ']' + bodyRange : '') + ')', function(e) {
               var fetcher = self._state.requests[0]._fetcher;
               if (e && fetcher)
                 fetcher.emit('error', e);
               else if (e && !fetcher)
                 self.emit('error', e);
               else if (fetcher)
                 fetcher.emit('end');
             }
  );
  var imapFetcher = new ImapFetch();
  this._state.requests[this._state.requests.length-1]._fetcher = imapFetcher;
  return imapFetcher;
};

ImapConnection.prototype.addFlags = function(uids, flags, cb) {
  this._store('UID ', uids, flags, true, cb);
};

ImapConnection.prototype.delFlags = function(uids, flags, cb) {
  this._store('UID ', uids, flags, false, cb);
};

ImapConnection.prototype.addKeywords = function(uids, flags, cb) {
  return this._addKeywords('UID ', uids, flags, cb);
};
ImapConnection.prototype._addKeywords = function(which, uids, flags, cb) {
  if (!this._state.box._newKeywords)
    throw new Error('This mailbox does not allow new keywords to be added');
  this._store(which, uids, flags, true, cb);
};

ImapConnection.prototype.delKeywords = function(uids, flags, cb) {
  this._store('UID ', uids, flags, false, cb);
};

ImapConnection.prototype.copy = function(uids, boxTo, cb) {
  return this._copy('UID ', uids, boxTo, cb);
};
ImapConnection.prototype._copy = function(which, uids, boxTo, cb) {
  if (this._state.status !== STATES.BOXSELECTED)
    throw new Error('No mailbox is currently selected');

  if (!Array.isArray(uids))
    uids = [uids];

  validateUIDList(uids);

  this._send(which + 'COPY',
             ' ' + uids.join(',') + ' "' + escape(boxTo) + '"', cb);
};

/* Namespace for seqno-based commands */
ImapConnection.prototype.__defineGetter__('seq', function() {
  var self = this;
  return {
    move: function(seqnos, boxTo, cb) {
      return self._move('', seqnos, boxTo, cb);
    },
    copy: function(seqnos, boxTo, cb) {
      return self._copy('', seqnos, boxTo, cb);
    },
    delKeywords: function(seqnos, flags, cb) {
      self._store('', seqnos, flags, false, cb);
    },
    addKeywords: function(seqnos, flags, cb) {
      return self._addKeywords('', seqnos, flags, cb);
    },
    delFlags: function(seqnos, flags, cb) {
      self._store('', seqnos, flags, false, cb);
    },
    addFlags: function(seqnos, flags, cb) {
      self._store('', seqnos, flags, true, cb);
    },
    fetch: function(seqnos, options) {
      return self._fetch('', seqnos, options);
    },
    search: function(options, cb) {
      self._search('', options, cb);
    }
  };
});


/****** Private Functions ******/

ImapConnection.prototype._fnTmrConn = function(loginCb) {
  var err = new Error('Connection timed out');
  err.type = 'timeout';
  loginCb(err);
  this._state.conn.end();
};

ImapConnection.prototype._store = function(which, uids, flags, isAdding, cb) {
  if (this._state.status !== STATES.BOXSELECTED)
    throw new Error('No mailbox is currently selected');
  if (uids === undefined)
    throw new Error('The message ID(s) must be specified');

  if (!Array.isArray(uids))
    uids = [uids];
  validateUIDList(uids);

  if ((!Array.isArray(flags) && typeof flags !== 'string')
      || (Array.isArray(flags) && flags.length === 0))
    throw new Error((isKeywords ? 'Keywords' : 'Flags')
                    + ' argument must be a string or a non-empty Array');
  if (!Array.isArray(flags))
    flags = [flags];
  // Disabling the guard logic right now because it's not needed and we're
  // removing the distinction between keywords and flags.  However, it does
  // seem like a good idea for the protocol layer to check this, so not just
  // actually deleting it right now.
  /*
  for (var i=0; i<flags.length; i++) {
    if (!isKeywords) {
      if (this._state.box.permFlags.indexOf(flags[i]) === -1
          || flags[i] === '\\*' || flags[i] === '*')
        throw new Error('The flag "' + flags[i]
                        + '" is not allowed by the server for this mailbox');
    } else {
      // keyword contains any char except control characters (%x00-1F and %x7F)
      // and: '(', ')', '{', ' ', '%', '*', '\', '"', ']'
      if (/[\(\)\{\\\"\]\%\*\x00-\x20\x7F]/.test(flags[i])) {
        throw new Error('The keyword "' + flags[i]
                        + '" contains invalid characters');
      }
    }
  }
  */
  flags = flags.join(' ');
  cb = arguments[arguments.length-1];

  this._send(which + 'STORE',
             ' ' + uids.join(',') + ' ' + (isAdding ? '+' : '-')
             + 'FLAGS.SILENT (' + flags + ')', cb);
};

ImapConnection.prototype._login = function(cb) {
  var self = this,
      fnReturn = function(err) {
        if (!err) {
          self._state.status = STATES.AUTH;
          if (self._state.numCapRecvs !== 2) {
            // fetch post-auth server capabilities if they were not
            // automatically provided after login
            self._send('CAPABILITY', null, cb);
            return;
          }
        }
        cb(err);
      };
  if (this._state.status === STATES.NOAUTH) {
    var connErr;
    if (this.capabilities.indexOf('LOGINDISABLED') > -1) {
      connErr = new Error('Logging in is disabled on this server');
      connErr.type = 'server-maintenance';
      connErr.serverResponse = 'LOGINDISABLED';
      cb(connErr);
      return;
    }

    if (this.capabilities.indexOf('AUTH=XOAUTH') !== -1 &&
        'xoauth' in this._options) {
      this._send('AUTHENTICATE XOAUTH ' + escape(this._options.xoauth),
                 fnReturn);
    }
    else if (this.capabilities.indexOf('AUTH=XOAUTH2') &&
             'xoauth2' in this._options) {
      this._send('AUTHENTICATE XOAUTH2 ' + escape(this._options.xoauth2),
                 fnReturn);
    }
    else if (this._options.username !== undefined &&
             this._options.password !== undefined) {
      this._send('LOGIN', ' "' + escape(this._options.username) + '" "'
                 + escape(this._options.password) + '"', fnReturn);
    } else {
      connErr = new Error('Unsupported authentication mechanism(s) detected. '
                          + 'Unable to login.');
      connErr.type = 'sucky-imap-server';
      connErr.serverResponse = 'CAPABILITIES: ' + this.capabilities.join(' ');
      cb(connErr);
      return;
    }
  }
};
ImapConnection.prototype._reset = function() {
  if (this._state.tmrKeepalive)
    clearTimeoutFunc(this._state.tmrKeepalive);
  if (this._state.tmrConn)
    clearTimeoutFunc(this._state.tmrConn);
  this._state.status = STATES.NOCONNECT;
  this._state.numCapRecvs = 0;
  this._state.requests = [];
  this._state.isIdle = true;
  this._state.isReady = false;
  this._state.ext.idle.state = IDLE_NONE;
  this._state.ext.idle.timeWaited = 0;

  this.namespaces = { personal: [], other: [], shared: [] };
  this.delim = null;
  this.capabilities = [];
  this._resetBox();
};
ImapConnection.prototype._resetBox = function() {
  this._state.box._uidnext = 0;
  this._state.box.validity = 0;
  this._state.box.highestModSeq = null;
  this._state.box._flags = [];
  this._state.box._newKeywords = false;
  this._state.box.permFlags = [];
  this._state.box.keywords = [];
  this._state.box.name = null;
  this._state.box.messages.total = 0;
  this._state.box.messages.new = 0;
};
ImapConnection.prototype._noop = function() {
  if (this._state.status >= STATES.AUTH)
    this._send('NOOP', null);
};
// bypass=true means to not push a command.  This is used exclusively for the
// auto-idle functionality.  IDLE happens automatically when nothing else is
// going on and automatically refreshes every 29 minutes.
//
// dispatchFunc is a function to invoke when the command is actually dispatched;
// there was at least a potential state maintenance inconsistency with opening
// folders prior to this.
ImapConnection.prototype._send = function(cmdstr, cmddata, cb, dispatchFunc,
                                          bypass) {
  if (cmdstr !== undefined && !bypass)
    this._state.requests.push(
      {
        prefix: null,
        command: cmdstr,
        cmddata: cmddata,
        callback: cb,
        dispatch: dispatchFunc,
        args: []
      });
  // If we are currently transitioning to/from idle, then wait around for the
  // server's response before doing anything more.
  if (this._state.ext.idle.state === IDLE_WAIT ||
      this._state.ext.idle.state === DONE_WAIT)
    return;
  // only do something if this was 1) an attempt to kick us to run the next
  // command, 2) the first/only command (none are pending), or 3) a bypass.
  if ((cmdstr === undefined && this._state.requests.length) ||
      this._state.requests.length === 1 || bypass) {
    var prefix = '', cmd = (bypass ? cmdstr : this._state.requests[0].command),
        data = (bypass ? null : this._state.requests[0].cmddata),
        dispatch = (bypass ? null : this._state.requests[0].dispatch);
    clearTimeoutFunc(this._state.tmrKeepalive);
    // If we are currently in IDLE, we need to exit it before we send the
    // actual command.  We mark it as a bypass so it does't mess with the
    // list of requests.
    if (this._state.ext.idle.state === IDLE_READY && cmd !== 'DONE')
      return this._send('DONE', null, undefined, undefined, true);
    else if (cmd === 'IDLE') {
       // we use a different prefix to differentiate and disregard the tagged
       // response the server will send us when we issue DONE
      prefix = 'IDLE ';
      this._state.ext.idle.state = IDLE_WAIT;
    }
    else if (cmd === 'DONE') {
      this._state.ext.idle.state = DONE_WAIT;
    }
    if (cmd !== 'IDLE' && cmd !== 'DONE') {
      prefix = 'A' + ++this._state.curId + ' ';
      if (!bypass)
        this._state.requests[0].prefix = prefix;
    }

    if (dispatch)
      dispatch();

    // We want our send to happen in a single packet; nagle is disabled by
    // default and at least on desktop-class machines, we are sending out one
    // packet per send call.
    var iWrite = 0, iSrc;
    for (iSrc = 0; iSrc < prefix.length; iSrc++) {
      gSendBuf[iWrite++] = prefix.charCodeAt(iSrc);
    }
    for (iSrc = 0; iSrc < cmd.length; iSrc++) {
      gSendBuf[iWrite++] = cmd.charCodeAt(iSrc);
    }
    if (data) {
      // fits in buffer
      if (data.length < gSendBuf.length - 2) {
        if (typeof(data) === 'string') {
          for (iSrc = 0; iSrc < data.length; iSrc++) {
            gSendBuf[iWrite++] = data.charCodeAt(iSrc);
          }
        }
        else {
          gSendBuf.set(data, iWrite);
          iWrite += data.length;
        }
      }
      // does not fit in buffer, just do separate writes...
      else {
        this._state.conn.write(gSendBuf.subarray(0, iWrite));
        if (typeof(data) === 'string')
          this._state.conn.write(Buffer(data));
        else
          this._state.conn.write(data);
        this._state.conn.write(CRLF_BUFFER);
        // set to zero to tell ourselves we don't need to send...
        iWrite = 0;
      }
    }
    if (iWrite) {
      gSendBuf[iWrite++] = 13;
      gSendBuf[iWrite++] = 10;
      this._state.conn.write(gSendBuf.subarray(0, iWrite));
    }

    if (this._LOG) { if (!bypass) this._LOG.cmd_begin(prefix, cmd, /^LOGIN$/.test(cmd) ? '***BLEEPING OUT LOGON***' : data); else this._LOG.bypassCmd(prefix, cmd);}

  }
};

function ImapMessage() {}
util.inherits(ImapMessage, EventEmitter);
function ImapFetch() {}
util.inherits(ImapFetch, EventEmitter);

/****** Utility Functions ******/

function buildSearchQuery(options, extensions, isOrChild) {
  var searchargs = '';
  for (var i=0,len=options.length; i<len; i++) {
    var criteria = (isOrChild ? options : options[i]),
        args = null,
        modifier = (isOrChild ? '' : ' ');
    if (typeof criteria === 'string')
      criteria = criteria.toUpperCase();
    else if (Array.isArray(criteria)) {
      if (criteria.length > 1)
        args = criteria.slice(1);
      if (criteria.length > 0)
        criteria = criteria[0].toUpperCase();
    } else
      throw new Error('Unexpected search option data type. '
                      + 'Expected string or array. Got: ' + typeof criteria);
    if (criteria === 'OR') {
      if (args.length !== 2)
        throw new Error('OR must have exactly two arguments');
      searchargs += ' OR (' + buildSearchQuery(args[0], extensions, true) + ') ('
                    + buildSearchQuery(args[1], extensions, true) + ')'
    } else {
      if (criteria[0] === '!') {
        modifier += 'NOT ';
        criteria = criteria.substr(1);
      }
      switch(criteria) {
        // -- Standard criteria --
        case 'ALL':
        case 'ANSWERED':
        case 'DELETED':
        case 'DRAFT':
        case 'FLAGGED':
        case 'NEW':
        case 'SEEN':
        case 'RECENT':
        case 'OLD':
        case 'UNANSWERED':
        case 'UNDELETED':
        case 'UNDRAFT':
        case 'UNFLAGGED':
        case 'UNSEEN':
          searchargs += modifier + criteria;
        break;
        case 'BCC':
        case 'BODY':
        case 'CC':
        case 'FROM':
        case 'SUBJECT':
        case 'TEXT':
        case 'TO':
          if (!args || args.length !== 1)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          searchargs += modifier + criteria + ' "' + escape(''+args[0]) + '"';
        break;
        case 'BEFORE':
        case 'ON':
        case 'SENTBEFORE':
        case 'SENTON':
        case 'SENTSINCE':
        case 'SINCE':
          if (!args || args.length !== 1)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          else if (!(args[0] instanceof Date)) {
            // XXX although the timestamp is in UTC time, this conversion is
            // to our local timezone, so daylight savings time can be an issue.
            // There is also the issue of what timezone the server's internal
            // date operates in.  For now we are doing nothing about this,
            // and this might ultimately be a higher level issue...
            if ((args[0] = new Date(args[0])).toString() === 'Invalid Date')
              throw new Error('Search option argument must be a Date object'
                              + ' or a parseable date string');
          }
          // XXX/NB: We are currently providing UTC-quantized date values, so
          // we don't want time-zones to skew this and screw us over.
          searchargs += modifier + criteria + ' ' + args[0].getUTCDate() + '-'
                        + MONTHS[args[0].getUTCMonth()] + '-'
                        + args[0].getUTCFullYear();
        break;
        case 'KEYWORD':
        case 'UNKEYWORD':
          if (!args || args.length !== 1)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          searchargs += modifier + criteria + ' ' + args[0];
        break;
        case 'LARGER':
        case 'SMALLER':
          if (!args || args.length !== 1)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          var num = parseInt(args[0]);
          if (isNaN(num))
            throw new Error('Search option argument must be a number');
          searchargs += modifier + criteria + ' ' + args[0];
        break;
        case 'HEADER':
          if (!args || args.length !== 2)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          searchargs += modifier + criteria + ' "' + escape(''+args[0]) + '" "'
                        + escape(''+args[1]) + '"';
        break;
        case 'UID':
          if (!args)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          validateUIDList(args);
          searchargs += modifier + criteria + ' ' + args.join(',');
        break;
        // -- Extensions criteria --
        case 'X-GM-MSGID': // Gmail unique message ID
        case 'X-GM-THRID': // Gmail thread ID
          if (extensions.indexOf('X-GM-EXT-1') === -1)
            throw new Error('IMAP extension not available: ' + criteria);
          var val;
          if (!args || args.length !== 1)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          else {
            val = ''+args[0];
            if (!(/^\d+$/.test(args[0])))
              throw new Error('Invalid value');
          }
          searchargs += modifier + criteria + ' ' + val;
        break;
        case 'X-GM-RAW': // Gmail search syntax
          if (extensions.indexOf('X-GM-EXT-1') === -1)
            throw new Error('IMAP extension not available: ' + criteria);
          if (!args || args.length !== 1)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          searchargs += modifier + criteria + ' "' + escape(''+args[0]) + '"';
        break;
        case 'X-GM-LABELS': // Gmail labels
          if (extensions.indexOf('X-GM-EXT-1') === -1)
            throw new Error('IMAP extension not available: ' + criteria);
          if (!args || args.length !== 1)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          searchargs += modifier + criteria + ' ' + args[0];
        break;
        default:
          throw new Error('Unexpected search option: ' + criteria);
      }
    }
    if (isOrChild)
      break;
  }
  console.log('searchargs:', searchargs);
  return searchargs;
}

function validateUIDList(uids) {
  for (var i=0,len=uids.length,intval; i<len; i++) {
    if (typeof uids[i] === 'string') {
      if (uids[i] === '*' || uids[i] === '*:*') {
        if (len > 1)
          uids = ['*'];
        break;
      } else if (/^(?:[\d]+|\*):(?:[\d]+|\*)$/.test(uids[i]))
        continue;
    }
    intval = parseInt(''+uids[i]);
    if (isNaN(intval)) {
      throw new Error('Message ID/number must be an integer, "*", or a range: '
                      + uids[i]);
    } else if (typeof uids[i] !== 'number')
      uids[i] = intval;
  }
}

/**
 * Parse a UID list string (which can include ranges) into an array of integers
 * (without ranges).  This should not be used in cases where "*" is allowed.
 */
function parseUIDListString(str) {
  var uids = [];
  if (!str.length)
    return uids;
  // the first character has to be a digit.
  var uidStart = 0, rangeStart = -1, rangeEnd, uid;
  for (var i = 1; i < str.length; i++) {
    var c = str.charCodeAt(i);
    // ':'
    if (c === 48) {
      rangeStart = parseInt(str.substring(uidStart, i));
      uidStart = ++i; // the next char must be a digit
    }
    // ','
    else if (c === '44') {
      if (rangeStart === -1) {
        uids.push(parseInt(str.substring(uidStart, i)));
      }
      else {
        rangeEnd = parseInt(str.substring(uidStart, i));
        for (uid = rangeStart; uid <= rangeEnd; uid++) {
          uids.push(uid);
        }
      }
      rangeStart = -1;
      start = ++i; // the next char must be a digit
    }
    // (digit!)
  }
  // we ran out of characters!  something must still be active
  if (rangeStart === -1) {
    uids.push(parseInt(str.substring(uidStart, i)));
  }
  else {
    rangeEnd = parseInt(str.substring(uidStart, i));
    for (uid = rangeStart; uid <= rangeEnd; uid++) {
      uids.push(uid);
    }
  }
  return uids;
}

function parseNamespaces(str, namespaces) {
  var result = parseExpr(str);
  for (var grp=0; grp<3; ++grp) {
    if (Array.isArray(result[grp])) {
      var vals = [];
      for (var i=0,len=result[grp].length; i<len; ++i) {
        var val = { prefix: result[grp][i][0], delim: result[grp][i][1] };
        if (result[grp][i].length > 2) {
          // extension data
          val.extensions = [];
          for (var j=2,len2=result[grp][i].length; j<len2; j+=2) {
            val.extensions.push({
              name: result[grp][i][j],
              flags: result[grp][i][j+1]
            });
          }
        }
        vals.push(val);
      }
      if (grp === 0)
        namespaces.personal = vals;
      else if (grp === 1)
        namespaces.other = vals;
      else if (grp === 2)
        namespaces.shared = vals;
    }
  }
}

function parseFetch(str, literalData, fetchData) {
  var key, idxNext, result = parseExpr(str);
  for (var i=0,len=result.length; i<len; i+=2) {
    if (result[i] === 'UID')
      fetchData.id = parseInt(result[i+1], 10);
    else if (result[i] === 'INTERNALDATE') {
      fetchData.rawDate = result[i+1];
      fetchData.date = parseImapDateTime(result[i+1]);
    }
    else if (result[i] === 'FLAGS') {
      // filter out empty flags and \Recent.  As RFC 3501 makes clear, the
      // \Recent flag is effectively useless because its semantics are that
      // only one connection will see it.  Accordingly, there's no need to
      // trouble consumers with it.
      fetchData.flags = result[i+1].filter(isNotEmptyOrRecent);
      // simplify comparison for downstream logic by sorting.
      fetchData.flags.sort();
    }
    // MODSEQ (####)
    else if (result[i] === 'MODSEQ')
      fetchData.modseq = result[i+1].slice(1, -1);
    else if (result[i] === 'BODYSTRUCTURE')
      fetchData.structure = parseBodyStructure(result[i+1]);
    else if (typeof result[i] === 'string') // simple extensions
      fetchData[result[i].toLowerCase()] = result[i+1];
    else if (Array.isArray(result[i]) && typeof result[i][0] === 'string' &&
             result[i][0].indexOf('HEADER') === 0 && literalData) {
      var mparser = new mailparser.MailParser();
      mparser._remainder = literalData;
      // invoke mailparser's logic in a fully synchronous fashion
      process.immediate = true;
      mparser._process(true);
      process.immediate = false;
      /*
      var headers = literalData.split(/\r\n(?=[\w])/), header;
      fetchData.headers = {};
      for (var j=0,len2=headers.length; j<len2; ++j) {
        header = headers[j].substring(0, headers[j].indexOf(': ')).toLowerCase();
        if (!fetchData.headers[header])
          fetchData.headers[header] = [];
        fetchData.headers[header].push(headers[j].substr(headers[j]
                                                 .indexOf(': ')+2)
                                                 .replace(/\r\n/g, '').trim());
      }
      */
      fetchData.msg = mparser._currentNode;
    }
  }
}

function parseBodyStructure(cur, prefix, partID) {
  var ret = [];
  if (prefix === undefined) {
    var result = (Array.isArray(cur) ? cur : parseExpr(cur));
    if (result.length)
      ret = parseBodyStructure(result, '', 1);
  } else {
    var part, partLen = cur.length, next;
    if (Array.isArray(cur[0])) { // multipart
      next = -1;
      while (Array.isArray(cur[++next])) {
        ret.push(parseBodyStructure(cur[next], prefix
                                               + (prefix !== '' ? '.' : '')
                                               + (partID++).toString(), 1));
      }
      part = { type: 'multipart', subtype: cur[next++].toLowerCase() };
      if (partLen > next) {
        if (Array.isArray(cur[next])) {
          part.params = {};
          for (var i=0,len=cur[next].length; i<len; i+=2)
            part.params[cur[next][i].toLowerCase()] = cur[next][i+1];
        } else
          part.params = cur[next];
        ++next;
      }
    } else { // single part
      next = 7;
      if (typeof cur[1] === 'string') {
        part = {
          // the path identifier for this part, useful for fetching specific
          // parts of a message
          partID: (prefix !== '' ? prefix : '1'),

          // required fields as per RFC 3501 -- null or otherwise
          type: cur[0].toLowerCase(), subtype: cur[1].toLowerCase(),
          params: null, id: cur[3], description: cur[4], encoding: cur[5],
          size: cur[6]
        }
      } else {
        // type information for malformed multipart body
        part = { type: cur[0].toLowerCase(), params: null };
        cur.splice(1, 0, null);
        ++partLen;
        next = 2;
      }
      if (Array.isArray(cur[2])) {
        part.params = {};
        for (var i=0,len=cur[2].length; i<len; i+=2)
          part.params[cur[2][i].toLowerCase()] = cur[2][i+1];
        if (cur[1] === null)
          ++next;
      }
      if (part.type === 'message' && part.subtype === 'rfc822') {
        // envelope
        if (partLen > next && Array.isArray(cur[next])) {
          part.envelope = {};
          for (var i=0,field,len=cur[next].length; i<len; ++i) {
            if (i === 0)
              part.envelope.date = cur[next][i];
            else if (i === 1)
              part.envelope.subject = cur[next][i];
            else if (i >= 2 && i <= 7) {
              var val = cur[next][i];
              if (Array.isArray(val)) {
                var addresses = [], inGroup = false, curGroup;
                for (var j=0,len2=val.length; j<len2; ++j) {
                  if (val[j][3] === null) { // start group addresses
                    inGroup = true;
                    curGroup = {
                      group: val[j][2],
                      addresses: []
                    };
                  } else if (val[j][2] === null) { // end of group addresses
                    inGroup = false;
                    addresses.push(curGroup);
                  } else { // regular user address
                    var info = {
                      name: val[j][0],
                      mailbox: val[j][2],
                      host: val[j][3]
                    };
                    if (inGroup)
                      curGroup.addresses.push(info);
                    else
                      addresses.push(info);
                  }
                }
                val = addresses;
              }
              if (i === 2)
                part.envelope.from = val;
              else if (i === 3)
                part.envelope.sender = val;
              else if (i === 4)
                part.envelope['reply-to'] = val;
              else if (i === 5)
                part.envelope.to = val;
              else if (i === 6)
                part.envelope.cc = val;
              else if (i === 7)
                part.envelope.bcc = val;
            } else if (i === 8)
              // message ID being replied to
              part.envelope['in-reply-to'] = cur[next][i];
            else if (i === 9)
              part.envelope['message-id'] = cur[next][i];
            else
              break;
          }
        } else
          part.envelope = null;
        ++next;

        // body
        if (partLen > next && Array.isArray(cur[next])) {
          part.body = parseBodyStructure(cur[next], prefix
                                                    + (prefix !== '' ? '.' : '')
                                                    + (partID++).toString(), 1);
        } else
          part.body = null;
        ++next;
      }
      if ((part.type === 'text'
           || (part.type === 'message' && part.subtype === 'rfc822'))
          && partLen > next)
        part.lines = cur[next++];
      if (typeof cur[1] === 'string' && partLen > next)
        part.md5 = cur[next++];
    }
    // add any extra fields that may or may not be omitted entirely
    parseStructExtra(part, partLen, cur, next);
    ret.unshift(part);
  }
  return ret;
}

function parseStructExtra(part, partLen, cur, next) {
  if (partLen > next) {
    // disposition
    // null or a special k/v list with these kinds of values:
    // e.g.: ['Foo', null]
    //       ['Foo', ['Bar', 'Baz']]
    //       ['Foo', ['Bar', 'Baz', 'Bam', 'Pow']]
    var disposition = { type: null, params: null };
    if (Array.isArray(cur[next])) {
      disposition.type = cur[next][0];
      if (Array.isArray(cur[next][1])) {
        disposition.params = {};
        for (var i=0,len=cur[next][1].length; i<len; i+=2)
          disposition.params[cur[next][1][i].toLowerCase()] = cur[next][1][i+1];
      }
    } else if (cur[next] !== null)
      disposition.type = cur[next];

    if (disposition.type === null)
      part.disposition = null;
    else
      part.disposition = disposition;

    ++next;
  }
  if (partLen > next) {
    // language can be a string or a list of one or more strings, so let's
    // make this more consistent ...
    if (cur[next] !== null)
      part.language = (Array.isArray(cur[next]) ? cur[next] : [cur[next]]);
    else
      part.language = null;
    ++next;
  }
  if (partLen > next)
    part.location = cur[next++];
  if (partLen > next) {
    // extension stuff introduced by later RFCs
    // this can really be any value: a string, number, or (un)nested list
    // let's not parse it for now ...
    part.extensions = cur[next];
  }
}

function stringExplode(string, delimiter, limit) {
  if (arguments.length < 3 || arguments[1] === undefined
      || arguments[2] === undefined
      || !delimiter || delimiter === '' || typeof delimiter === 'function'
      || typeof delimiter === 'object')
      return false;

  delimiter = (delimiter === true ? '1' : delimiter.toString());

  if (!limit || limit === 0)
    return string.split(delimiter);
  else if (limit < 0)
    return false;
  else if (limit > 0) {
    var splitted = string.split(delimiter);
    var partA = splitted.splice(0, limit - 1);
    var partB = splitted.join(delimiter);
    partA.push(partB);
    return partA;
  }

  return false;
}

function isNotEmpty(str) {
  return str.trim().length > 0;
}

const RE_RECENT = /^\\Recent$/i;
function isNotEmptyOrRecent(str) {
  var s = str.trim();
  return s.length > 0 && !RE_RECENT.test(s);
}

function escape(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function unescape(str) {
  return str.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

function up(str) {
  return str.toUpperCase();
}

function parseExpr(o, result, start) {
  start = start || 0;
  var inQuote = false, lastPos = start - 1, isTop = false;
  if (!result)
    result = new Array();
  if (typeof o === 'string') {
    var state = new Object();
    state.str = o;
    o = state;
    isTop = true;
  }
  for (var i=start,len=o.str.length; i<len; ++i) {
    if (!inQuote) {
      if (o.str[i] === '"')
        inQuote = true;
      else if (o.str[i] === ' ' || o.str[i] === ')' || o.str[i] === ']') {
        if (i - (lastPos+1) > 0)
          result.push(convStr(o.str.substring(lastPos+1, i)));
        if (o.str[i] === ')' || o.str[i] === ']')
          return i;
        lastPos = i;
      } else if (o.str[i] === '(' || o.str[i] === '[') {
        var innerResult = [];
        i = parseExpr(o, innerResult, i+1);
        lastPos = i;
        result.push(innerResult);
      }
    } else if (o.str[i] === '"' &&
               (o.str[i-1] &&
                (o.str[i-1] !== '\\' || (o.str[i-2] && o.str[i-2] === '\\'))))
      inQuote = false;
    if (i+1 === len && len - (lastPos+1) > 0)
      result.push(convStr(o.str.substring(lastPos+1)));
  }
  return (isTop ? result : start);
}

function convStr(str) {
  if (str[0] === '"')
    return str.substring(1, str.length-1);
  else if (str === 'NIL')
    return null;
  else if (/^\d+$/.test(str)) {
    // some IMAP extensions utilize large (64-bit) integers, which JavaScript
    // can't handle natively, so we'll just keep it as a string if it's too big
    var val = parseInt(str, 10);
    return (val.toString() === str ? val : str);
  } else
    return str;
}

/**
 * Adopted from jquery's extend method. Under the terms of MIT License.
 *
 * http://code.jquery.com/jquery-1.4.2.js
 *
 * Modified by Brian White to use Array.isArray instead of the custom isArray
 * method
 */
function extend() {
  // copy reference to target object
  var target = arguments[0] || {},
      i = 1,
      length = arguments.length,
      deep = false,
      options,
      name,
      src,
      copy;

  // Handle a deep copy situation
  if (typeof target === "boolean") {
    deep = target;
    target = arguments[1] || {};
    // skip the boolean and the target
    i = 2;
  }

  // Handle case when target is a string or something (possible in deep copy)
  if (typeof target !== "object" && !typeof target === 'function')
    target = {};

  var isPlainObject = function(obj) {
    // Must be an Object.
    // Because of IE, we also have to check the presence of the constructor
    // property.
    // Make sure that DOM nodes and window objects don't pass through, as well
    if (!obj || toString.call(obj) !== "[object Object]" || obj.nodeType
        || obj.setInterval)
      return false;

    var has_own_constructor = hasOwnProperty.call(obj, "constructor");
    var has_is_prop_of_method = hasOwnProperty.call(obj.constructor.prototype,
                                                    "isPrototypeOf");
    // Not own constructor property must be Object
    if (obj.constructor && !has_own_constructor && !has_is_prop_of_method)
      return false;

    // Own properties are enumerated firstly, so to speed up,
    // if last one is own, then all properties are own.

    var last_key;
    for (var key in obj)
      last_key = key;

    return last_key === undefined || hasOwnProperty.call(obj, last_key);
  };


  for (; i < length; i++) {
    // Only deal with non-null/undefined values
    if ((options = arguments[i]) !== null) {
      // Extend the base object
      for (name in options) {
        src = target[name];
        copy = options[name];

        // Prevent never-ending loop
        if (target === copy)
            continue;

        // Recurse if we're merging object literal values or arrays
        if (deep && copy && (isPlainObject(copy) || Array.isArray(copy))) {
          var clone = src && (isPlainObject(src) || Array.isArray(src)
                              ? src : (Array.isArray(copy) ? [] : {}));

          // Never move original objects, clone them
          target[name] = extend(deep, clone, copy);

        // Don't bring in undefined values
        } else if (copy !== undefined)
          target[name] = copy;
      }
    }
  }

  // Return the modified object
  return target;
};

function bufferAppend(buf1, buf2) {
  var newBuf = new Buffer(buf1.length + buf2.length);
  buf1.copy(newBuf, 0, 0);
  if (Buffer.isBuffer(buf2))
    buf2.copy(newBuf, buf1.length, 0);
  else if (Array.isArray(buf2)) {
    for (var i=buf1.length, len=buf2.length; i<len; i++)
      newBuf[i] = buf2[i];
  }

  return newBuf;
};

/**
 * Split the contents of a buffer on CRLF pairs, retaining the CRLF's on all but
 * the first line. In other words, ret[1] through ret[ret.length-1] will have
 * CRLF's.  The last entry may or may not have a CRLF.  The last entry will have
 * a non-zero length.
 *
 * This logic is very specialized to its one caller...
 */
function customBufferSplitCRLF(buf) {
  var ret = [];
  var effLen = buf.length - 1, start = 0;
  for (var i = 0; i < effLen;) {
    if (buf[i] === 13 && buf[i + 1] === 10) {
      // do include the CRLF in the entry if this is not the first one.
      if (ret.length) {
        i += 2;
        ret.push(buf.slice(start, i));
      }
      else {
        ret.push(buf.slice(start, i));
        i += 2;
      }
      start = i;
    }
    else {
      i++;
    }
  }
  if (!ret.length)
    ret.push(buf);
  else if (start < buf.length)
    ret.push(buf.slice(start, buf.length));
  return ret;
}

function bufferIndexOfCRLF(buf, start) {
  // It's a 2 character sequence, pointless to check the last character,
  // especially since it would introduce additional boundary checks.
  var effLen = buf.length - 1;
  for (var i = start || 0; i < effLen; i++) {
    if (buf[i] === 13 && buf[i + 1] === 10)
      return i;
  }
  return -1;
}

var LOGFAB = exports.LOGFAB = $log.register(module, {
  ImapProtoConn: {
    type: $log.CONNECTION,
    subtype: $log.CLIENNT,
    events: {
      created: {},
      connect: {},
      connected: {},
      closed: {},
      sendData: { length: false },
      bypassCmd: { prefix: false, cmd: false },
      data: { length: false },
    },
    TEST_ONLY_events: {
      connect: { host: false, port: false },
      sendData: { data: false },
      // This may be a Buffer and therefore need to be coerced
      data: { data: $log.TOSTRING },
    },
    errors: {
      connError: { err: $log.EXCEPTION },
      bad: { msg: false },
      unknownResponse: { d0: false, d1: false, d2: false },
    },
    asyncJobs: {
      cmd: { prefix: false, cmd: false },
    },
    TEST_ONLY_asyncJobs: {
      cmd: { data: false },
    },
  },
}); // end LOGFAB

});

/**
 * Validates connection information for an account and verifies the server on
 * the other end is something we are capable of sustaining an account with.
 * Before growing this logic further, first try reusing/adapting/porting the
 * Thunderbird autoconfiguration logic.
 **/

define('mailapi/imap/probe',
  [
    'imap',
    'exports'
  ],
  function(
    $imap,
    exports
  ) {

/**
 * How many milliseconds should we wait before giving up on the connection?
 *
 * This really wants to be adaptive based on the type of the connection, but
 * right now we have no accurate way of guessing how good the connection is in
 * terms of latency, overall internet speed, etc.  Experience has shown that 10
 * seconds is currently insufficient on an unagi device on 2G on an AT&T network
 * in American suburbs, although some of that may be problems internal to the
 * device.  I am tripling that to 30 seconds for now because although it's
 * horrible to drag out a failed connection to an unresponsive server, it's far
 * worse to fail to connect to a real server on a bad network, etc.
 */
exports.CONNECT_TIMEOUT_MS = 30000;

/**
 * Right now our tests consist of:
 * - logging in to test the credentials
 *
 * If we succeed at that, we hand off the established connection to our caller
 * so they can reuse it.
 */
function ImapProber(credentials, connInfo, _LOG) {
  var opts = {
    host: connInfo.hostname,
    port: connInfo.port,
    crypto: connInfo.crypto,

    username: credentials.username,
    password: credentials.password,

    connTimeout: exports.CONNECT_TIMEOUT_MS,
  };
  if (_LOG)
    opts._logParent = _LOG;

  console.log("PROBE:IMAP attempting to connect to", connInfo.hostname);
  this._conn = new $imap.ImapConnection(opts);
  this._conn.connect(this.onLoggedIn.bind(this));
  this._conn.on('error', this.onError.bind(this));

  this.onresult = null;
  this.error = null;
  this.errorDetails = { server: connInfo.hostname };
}
exports.ImapProber = ImapProber;
ImapProber.prototype = {
  onLoggedIn: function ImapProber_onLoggedIn(err) {
    if (err) {
      this.onError(err);
      return;
    }

    getTZOffset(this._conn, this.onGotTZOffset.bind(this));
  },

  onGotTZOffset: function ImapProber_onGotTZOffset(err, tzOffset) {
    if (err) {
      this.onError(err);
      return;
    }

    console.log('PROBE:IMAP happy, TZ offset:', tzOffset / (60 * 60 * 1000));
    this.error = null;

    var conn = this._conn;
    this._conn = null;

    if (!this.onresult)
      return;
    this.onresult(this.error, conn, tzOffset);
    this.onresult = false;
  },

  onError: function ImapProber_onError(err) {
    if (!this.onresult)
      return;
    console.warn('PROBE:IMAP sad', err);

    var normErr = normalizeError(err);
    this.error = normErr.name;

    // we really want to make sure we clean up after this dude.
    try {
      this._conn.die();
    }
    catch (ex) {
    }
    this._conn = null;

    this.onresult(this.error, null, this.errorDetails);
    // we could potentially see many errors...
    this.onresult = false;
  },
};

/**
 * Convert error objects from the IMAP connection to our internal error codes
 * as defined in `MailApi.js` for tryToCreateAccount.  This is used by the
 * probe during account creation and by `ImapAccount` during general connection
 * establishment.
 *
 * @return[@dict[
 *   @key[name String]
 *   @key[reachable Boolean]{
 *     Does this error indicate the server was reachable?  This is to be
 *     reported to the `BackoffEndpoint`.
 *   }
 *   @key[retry Boolean]{
 *     Should we retry the connection?  The answer is no for persistent problems
 *     or transient problems that are expected to be longer lived than the scale
 *     of our automatic retries.
 *   }
 *   @key[reportProblem Boolean]{
 *     Should we report this as a problem on the account?  We should do this
 *     if we expect this to be a persistent problem that requires user action
 *     to resolve and we expect `MailUniverse.__reportAccountProblem` to
 *     generate a specific user notification for the error.  If we're not going
 *     to bother the user with a popup, then we probably want to return false
 *     for this and leave it for the connection failure to cause the
 *     `BackoffEndpoint` to cause a problem to be logged via the listener
 *     mechanism.
 *   }
 * ]]
 */
var normalizeError = exports.normalizeError = function normalizeError(err) {
  var errName, reachable = false, retry = true, reportProblem = false;
  // We want to produce error-codes as defined in `MailApi.js` for
  // tryToCreateAccount.  We have also tried to make imap.js produce
  // error codes of the right type already, but for various generic paths
  // (like saying 'NO'), there isn't currently a good spot for that.
  switch (err.type) {
    // dovecot says after a delay and does not terminate the connection:
    //   NO [AUTHENTICATIONFAILED] Authentication failed.
    // zimbra 7.2.x says after a delay and DOES terminate the connection:
    //   NO LOGIN failed
    //   * BYE Zimbra IMAP server terminating connection
    // yahoo says after a delay and does not terminate the connection:
    //   NO [AUTHENTICATIONFAILED] Incorrect username or password.
  case 'NO':
  case 'no':
    reachable = true;
    if (!err.serverResponse) {
      errName = 'unknown';
      reportProblem = false;
    }
    else {
      // All of these require user action to resolve.
      reportProblem = true;
      retry = false;
      if (err.serverResponse.indexOf(
        '[ALERT] Application-specific password required') !== -1)
        errName = 'needs-app-pass';
      else if (err.serverResponse.indexOf(
            '[ALERT] Your account is not enabled for IMAP use.') !== -1 ||
          err.serverResponse.indexOf(
            '[ALERT] IMAP access is disabled for your domain.') !== -1)
        errName = 'imap-disabled';
      else
        errName = 'bad-user-or-pass';
    }
    break;
  case 'server-maintenance':
    errName = err.type;
    reachable = true;
    // do retry
    break;
  // An SSL error is either something we just want to report (probe), or
  // something that is currently probably best treated as a network failure.  We
  // could tell the user they may be experiencing a MITM attack, but that's not
  // really something they can do anything about and we have protected them from
  // it currently.
  case 'bad-security':
    errName = err.type;
    reachable = true;
    retry = false;
    break;
  case 'unresponsive-server':
  case 'timeout':
    errName = 'unresponsive-server';
    break;
  default:
    errName = 'unknown';
    break;
  }

  return {
    name: errName,
    reachable: reachable,
    retry: retry,
    reportProblem: reportProblem,
  };
};


/**
 * If a folder has no messages, then we need to default the timezone, and
 * California is the most popular!
 *
 * XXX DST issue, maybe vary this.
 */
var DEFAULT_TZ_OFFSET = -7 * 60 * 60 * 1000;

var extractTZFromHeaders = exports._extractTZFromHeaders =
    function extractTZFromHeaders(allHeaders) {
  for (var i = 0; i < allHeaders.length; i++) {
    var hpair = allHeaders[i];
    if (hpair.key !== 'received')
      continue;
    var tzMatch = / ([+-]\d{4})/.exec(hpair.value);
    if (tzMatch) {
      var tz =
        parseInt(tzMatch[1].substring(1, 3), 10) * 60 * 60 * 1000 +
        parseInt(tzMatch[1].substring(3, 5), 10) * 60 * 1000;
      if (tzMatch[1].substring(0, 1) === '-')
        tz *= -1;
      return tz;
    }
  }

  return null;
};

/**
 * Try and infer the current effective timezone of the server by grabbing the
 * most recent message as implied by UID (may be inaccurate), and then looking
 * at the most recent Received header's timezone.
 *
 * In order to figure out the UID to ask for, we do a dumb search to figure out
 * what UIDs are valid.
 */
var getTZOffset = exports.getTZOffset = function getTZOffset(conn, callback) {
  function gotInbox(err, box) {
    if (err) {
      callback(err);
      return;
    }
    if (!box.messages.total) {
      callback(null, DEFAULT_TZ_OFFSET);
      return;
    }
    searchRange(box._uidnext - 1);
  }
  function searchRange(highUid) {
    conn.search([['UID', Math.max(1, highUid - 49) + ':' + highUid]],
                gotSearch.bind(null, highUid - 50));
  }
  var viableUids = null;
  function gotSearch(nextHighUid, err, uids) {
    if (!uids.length) {
      if (nextHighUid < 0) {
        callback(null, DEFAULT_TZ_OFFSET);
        return;
      }
      searchRange(nextHighUid);
    }
    viableUids = uids;
    useUid(viableUids.pop());
  }
  function useUid(uid) {
    var fetcher = conn.fetch(
      [uid],
      {
        request: {
          headers: ['RECEIVED'],
          struct: false,
          body: false
        },
      });
    fetcher.on('message', function onMsg(msg) {
        msg.on('end', function onMsgEnd() {
            var tz = extractTZFromHeaders(msg.msg.headers);
            if (tz !== null) {
              callback(null, tz);
              return;
            }
            // If we are here, the message somehow did not have a Received
            // header.  Try again with another known UID or fail out if we
            // have run out of UIDs.
            if (viableUids.length)
              useUid(viableUids.pop());
            else // fail to the default.
              callback(null, DEFAULT_TZ_OFFSET);
          });
      });
    fetcher.on('error', function onFetchErr(err) {
      callback(err);
      return;
    });
  }
  var uidsTried = 0;
  conn.openBox('INBOX', true, gotInbox);
};

}); // end define
;