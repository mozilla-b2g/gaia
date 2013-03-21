
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