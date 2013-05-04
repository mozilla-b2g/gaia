
define('mailcomposer/lib/punycode',['require','exports','module'],function (require, exports, module) {
//Javascript Punycode converter derived from example in RFC3492.
//This implementation is created by some@domain.name and released into public domain
var punycode = new function Punycode() {
    // This object converts to and from puny-code used in IDN
    //
    // punycode.ToASCII ( domain )
    // 
    // Returns a puny coded representation of "domain".
    // It only converts the part of the domain name that
    // has non ASCII characters. I.e. it dosent matter if
    // you call it with a domain that already is in ASCII.
    //
    // punycode.ToUnicode (domain)
    //
    // Converts a puny-coded domain name to unicode.
    // It only converts the puny-coded parts of the domain name.
    // I.e. it dosent matter if you call it on a string
    // that already has been converted to unicode.
    //
    //
    this.utf16 = {
        // The utf16-class is necessary to convert from javascripts internal character representation to unicode and back.
        decode:function(input){
            var output = [], i=0, len=input.length,value,extra;
            while (i < len) {
                value = input.charCodeAt(i++);
                if ((value & 0xF800) === 0xD800) {
                    extra = input.charCodeAt(i++);
                    if ( ((value & 0xFC00) !== 0xD800) || ((extra & 0xFC00) !== 0xDC00) ) {
                        throw new RangeError("UTF-16(decode): Illegal UTF-16 sequence");
                    }
                    value = ((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000;
                }
                output.push(value);
            }
            return output;
        },
        encode:function(input){
            var output = [], i=0, len=input.length,value;
            while (i < len) {
                value = input[i++];
                if ( (value & 0xF800) === 0xD800 ) {
                    throw new RangeError("UTF-16(encode): Illegal UTF-16 value");
                }
                if (value > 0xFFFF) {
                    value -= 0x10000;
                    output.push(String.fromCharCode(((value >>>10) & 0x3FF) | 0xD800));
                    value = 0xDC00 | (value & 0x3FF);
                }
                output.push(String.fromCharCode(value));
            }
            return output.join("");
        }
    };

    //Default parameters
    var initial_n = 0x80;
    var initial_bias = 72;
    var delimiter = "-";
    var base = 36;
    var damp = 700;
    var tmin=1;
    var tmax=26;
    var skew=38;
    var maxint = 0x7FFFFFFF;

    // decode_digit(cp) returns the numeric value of a basic code 
    // point (for use in representing integers) in the range 0 to
    // base-1, or base if cp is does not represent a value.

    function decode_digit(cp) {
        return cp - 48 < 10 ? cp - 22 : cp - 65 < 26 ? cp - 65 : cp - 97 < 26 ? cp - 97 : base;
    }

    // encode_digit(d,flag) returns the basic code point whose value
    // (when used for representing integers) is d, which needs to be in
    // the range 0 to base-1. The lowercase form is used unless flag is
    // nonzero, in which case the uppercase form is used. The behavior
    // is undefined if flag is nonzero and digit d has no uppercase form. 

    function encode_digit(d, flag) {
        return d + 22 + 75 * (d < 26) - ((flag !== 0) << 5);
        //  0..25 map to ASCII a..z or A..Z 
        // 26..35 map to ASCII 0..9
    }
    //** Bias adaptation function **
    function adapt(delta, numpoints, firsttime ) {
        var k;
        delta = firsttime ? Math.floor(delta / damp) : (delta >> 1);
        delta += Math.floor(delta / numpoints);

        for (k = 0; delta > (((base - tmin) * tmax) >> 1); k += base) {
                delta = Math.floor(delta / ( base - tmin ));
        }
        return Math.floor(k + (base - tmin + 1) * delta / (delta + skew));
    }

    // encode_basic(bcp,flag) forces a basic code point to lowercase if flag is zero,
    // uppercase if flag is nonzero, and returns the resulting code point.
    // The code point is unchanged if it is caseless.
    // The behavior is undefined if bcp is not a basic code point.

    function encode_basic(bcp, flag) {
        bcp -= (bcp - 97 < 26) << 5;
        return bcp + ((!flag && (bcp - 65 < 26)) << 5);
    }

    // Main decode
    this.decode=function(input,preserveCase) {
        // Dont use utf16
        var output=[];
        var case_flags=[];
        var input_length = input.length;

        var n, out, i, bias, basic, j, ic, oldi, w, k, digit, t, len;

        // Initialize the state: 

        n = initial_n;
        i = 0;
        bias = initial_bias;

        // Handle the basic code points: Let basic be the number of input code 
        // points before the last delimiter, or 0 if there is none, then
        // copy the first basic code points to the output.

        basic = input.lastIndexOf(delimiter);
        if (basic < 0) basic = 0;

        for (j = 0; j < basic; ++j) {
            if(preserveCase) case_flags[output.length] = ( input.charCodeAt(j) -65 < 26);
            if ( input.charCodeAt(j) >= 0x80) {
                throw new RangeError("Illegal input >= 0x80");
            }
            output.push( input.charCodeAt(j) );
        }

        // Main decoding loop: Start just after the last delimiter if any
        // basic code points were copied; start at the beginning otherwise. 

        for (ic = basic > 0 ? basic + 1 : 0; ic < input_length; ) {

            // ic is the index of the next character to be consumed,

            // Decode a generalized variable-length integer into delta,
            // which gets added to i. The overflow checking is easier
            // if we increase i as we go, then subtract off its starting 
            // value at the end to obtain delta.
            for (oldi = i, w = 1, k = base; ; k += base) {
                    if (ic >= input_length) {
                        throw RangeError ("punycode_bad_input(1)");
                    }
                    digit = decode_digit(input.charCodeAt(ic++));

                    if (digit >= base) {
                        throw RangeError("punycode_bad_input(2)");
                    }
                    if (digit > Math.floor((maxint - i) / w)) {
                        throw RangeError ("punycode_overflow(1)");
                    }
                    i += digit * w;
                    t = k <= bias ? tmin : k >= bias + tmax ? tmax : k - bias;
                    if (digit < t) { break; }
                    if (w > Math.floor(maxint / (base - t))) {
                        throw RangeError("punycode_overflow(2)");
                    }
                    w *= (base - t);
            }

            out = output.length + 1;
            bias = adapt(i - oldi, out, oldi === 0);

            // i was supposed to wrap around from out to 0,
            // incrementing n each time, so we'll fix that now: 
            if ( Math.floor(i / out) > maxint - n) {
                throw RangeError("punycode_overflow(3)");
            }
            n += Math.floor( i / out ) ;
            i %= out;

            // Insert n at position i of the output: 
            // Case of last character determines uppercase flag: 
            if (preserveCase) { case_flags.splice(i, 0, input.charCodeAt(ic -1) -65 < 26);}

            output.splice(i, 0, n);
            i++;
        }
        if (preserveCase) {
            for (i = 0, len = output.length; i < len; i++) {
                if (case_flags[i]) {
                    output[i] = (String.fromCharCode(output[i]).toUpperCase()).charCodeAt(0);
                }
            }
        }
        return this.utf16.encode(output);
    };

    //** Main encode function **

    this.encode = function (input,preserveCase) {
        //** Bias adaptation function **

        var n, delta, h, b, bias, j, m, q, k, t, ijv, case_flags;

        if (preserveCase) {
            // Preserve case, step1 of 2: Get a list of the unaltered string
            case_flags = this.utf16.decode(input);
        }
        // Converts the input in UTF-16 to Unicode
        input = this.utf16.decode(input.toLowerCase());

        var input_length = input.length; // Cache the length

        if (preserveCase) {
            // Preserve case, step2 of 2: Modify the list to true/false
            for (j=0; j < input_length; j++) {
                case_flags[j] = input[j] != case_flags[j];
            }
        }

        var output=[];


        // Initialize the state: 
        n = initial_n;
        delta = 0;
        bias = initial_bias;

        // Handle the basic code points: 
        for (j = 0; j < input_length; ++j) {
            if ( input[j] < 0x80) {
                output.push(
                    String.fromCharCode(
                        case_flags ? encode_basic(input[j], case_flags[j]) : input[j]
                    )
                );
            }
        }

        h = b = output.length;

        // h is the number of code points that have been handled, b is the
        // number of basic code points 

        if (b > 0) output.push(delimiter);

        // Main encoding loop: 
        //
        while (h < input_length) {
            // All non-basic code points < n have been
            // handled already. Find the next larger one: 

            for (m = maxint, j = 0; j < input_length; ++j) {
                ijv = input[j];
                if (ijv >= n && ijv < m) m = ijv;
            }

            // Increase delta enough to advance the decoder's
            // <n,i> state to <m,0>, but guard against overflow: 

            if (m - n > Math.floor((maxint - delta) / (h + 1))) {
                throw RangeError("punycode_overflow (1)");
            }
            delta += (m - n) * (h + 1);
            n = m;

            for (j = 0; j < input_length; ++j) {
                ijv = input[j];

                if (ijv < n ) {
                    if (++delta > maxint) return Error("punycode_overflow(2)");
                }

                if (ijv == n) {
                    // Represent delta as a generalized variable-length integer: 
                    for (q = delta, k = base; ; k += base) {
                        t = k <= bias ? tmin : k >= bias + tmax ? tmax : k - bias;
                        if (q < t) break;
                        output.push( String.fromCharCode(encode_digit(t + (q - t) % (base - t), 0)) );
                        q = Math.floor( (q - t) / (base - t) );
                    }
                    output.push( String.fromCharCode(encode_digit(q, preserveCase && case_flags[j] ? 1:0 )));
                    bias = adapt(delta, h + 1, h == b);
                    delta = 0;
                    ++h;
                }
            }

            ++delta;
            ++n;
        }
        return output.join("");
    };

    this.ToASCII = function ( domain ) {
        var domain_array = domain.split(".");
        var out = [];
        for (var i=0; i < domain_array.length; ++i) {
            var s = domain_array[i];
            out.push(
                s.match(/[^A-Za-z0-9\-]/) ?
                "xn--" + punycode.encode(s) :
                s
            );
        }
        return out.join(".");
    };
    
    this.ToUnicode = function ( domain ) {
        var domain_array = domain.split(".");
        var out = [];
        for (var i=0; i < domain_array.length; ++i) {
            var s = domain_array[i];
            out.push(
                s.match(/^xn--/) ?
                punycode.decode(s.slice(4)) :
                s
            );
        }
        return out.join(".");
    };
}();

module.exports = function(address){
    return address.replace(/((?:https?:\/\/)?.*\@)?([^\/]*)/, function(o, start, domain){
        var domainParts = domain.split(/\./).map(punycode.ToASCII);
        return (start || "") + domainParts.join(".");
    });
};
});
define('mailcomposer/lib/dkim',['require','exports','module','crypto','mimelib','./punycode'],function (require, exports, module) {
var crypto = require('crypto'),
    mimelib = require('mimelib'),
    toPunycode = require('./punycode');

/**
 * @namespace DKIM Signer module 
 * @name dkimsign
 */
module.exports.DKIMSign = DKIMSign;
module.exports.generateDKIMHeader = generateDKIMHeader;
module.exports.sha256 = sha256;


/**
 * <p>Sign an email with provided DKIM key, uses RSA-SHA256.</p>
 * 
 * @memberOf dkimsign
 * @param {String} email Full e-mail source complete with headers and body to sign
 * @param {Object} options DKIM options
 * @param {String} [options.headerFieldNames="from:to:cc:subject"] Header fields to sign
 * @param {String} options.privateKey DKMI private key 
 * @param {String} options.domainName Domain name to use for signing (ie: "domain.com")
 * @param {String} options.keySelector Selector for the DKMI public key (ie. "dkim" if you have set up a TXT record for "dkim._domainkey.domain.com")
 * 
 * @return {String} Signed DKIM-Signature header field for prepending 
 */
function DKIMSign(email, options){
    options = options || {};
    email = (email || "").toString("utf-8");
    
    var match = email.match(/^\r?\n|(?:\r?\n){2}/),
        headers = match && email.substr(0, match.index) || "",
        body = match && email.substr(match.index + match[0].length) || email;
    
    // all listed fields from RFC4871 #5.5
    var defaultFieldNames = "From:Sender:Reply-To:Subject:Date:Message-ID:To:" +
            "Cc:MIME-Version:Content-Type:Content-Transfer-Encoding:Content-ID:" +
            "Content-Description:Resent-Date:Resent-From:Resent-Sender:" +
            "Resent-To:Resent-Cc:Resent-Message-ID:In-Reply-To:References:" +
            "List-Id:List-Help:List-Unsubscribe:List-Subscribe:List-Post:" +
            "List-Owner:List-Archive";
    
    var dkim = generateDKIMHeader(options.domainName, options.keySelector, options.headerFieldNames || defaultFieldNames, headers, body),
        canonicalizedHeaderData = DKIMCanonicalizer.relaxedHeaders(headers, options.headerFieldNames || defaultFieldNames),
        canonicalizedDKIMHeader = DKIMCanonicalizer.relaxedHeaderLine(dkim),
        signer, signature;

    canonicalizedHeaderData.headers +=  canonicalizedDKIMHeader.key+":"+canonicalizedDKIMHeader.value;

    signer = crypto.createSign("RSA-SHA256");
    signer.update(canonicalizedHeaderData.headers);
    signature = signer.sign(options.privateKey, 'base64');
    
    return dkim + signature.replace(/(.{76}(?!\r?\n|\r))/g,"$&\r\n        ");
}

/**
 * <p>Generates a DKIM-Signature header field without the signature part ("b=" is empty)</p>
 * 
 * @memberOf dkimsign
 * @private
 * @param {String} domainName Domain name to use for signing
 * @param {String} keySelector Selector for the DKMI public key
 * @param {String} headerFieldNames Header fields to sign
 * @param {String} headers E-mail headers
 * @param {String} body E-mail body
 * 
 * @return {String} Mime folded DKIM-Signature string
 */
function generateDKIMHeader(domainName, keySelector, headerFieldNames, headers, body){
    var canonicalizedBody = DKIMCanonicalizer.relaxedBody(body),
        canonicalizedBodyHash = sha256(canonicalizedBody, "base64"),
        canonicalizedHeaderData = DKIMCanonicalizer.relaxedHeaders(headers, headerFieldNames),
        dkim;

    if(hasUTFChars(domainName)){
        domainName = toPunycode(domainName);
    }

    dkim = [
        "v=1",
        "a=rsa-sha256",
        "c=relaxed/relaxed",
        "d="+domainName,
        "q=dns/txt",
        "s="+keySelector,
        "bh="+canonicalizedBodyHash,
        "h="+canonicalizedHeaderData.fieldNames
    ].join("; ");

    return mimelib.foldLine("DKIM-Signature: " + dkim, 76)+";\r\n        b=";
}

/**
 * <p>DKIM canonicalization functions</p>
 * 
 * @memberOf dkimsign
 * @private
 */
var DKIMCanonicalizer = {
   
    /**
     * <p>Simple body canonicalization by rfc4871 #3.4.3</p>
     * 
     * @param {String} body E-mail body part
     * @return {String} Canonicalized body
     */
    simpleBody: function(body){
        return (body || "").toString().replace(/(?:\r?\n|\r)*$/, "\r\n");
    },
    
    /**
     * <p>Relaxed body canonicalization by rfc4871 #3.4.4</p>
     * 
     * @param {String} body E-mail body part
     * @return {String} Canonicalized body
     */
    relaxedBody: function(body){
        return (body || "").toString().
                replace(/\r?\n|\r/g, "\n").
                split("\n").
                map(function(line){
                    return line.replace(/\s*$/, ""). //rtrim
                                replace(/\s+/g, " "); // only single spaces
                }).
                join("\n").
                replace(/\n*$/, "\n").
                replace(/\n/g, "\r\n");
    },
    
    /**
     * <p>Relaxed headers canonicalization by rfc4871 #3.4.2 with filtering</p>
     * 
     * @param {String} body E-mail headers part
     * @return {String} Canonicalized headers
     */
    relaxedHeaders: function(headers, fieldNames){
        var includedFields = (fieldNames || "").toLowerCase().
                                split(":").
                                map(function(field){
                                    return field.trim();
                                }),
            headerFields = {},
            headerLines = headers.split(/\r?\n|\r/),
            line, i;
        
        // join lines
        for(i = headerLines.length-1; i>=0; i--){
            if(i && headerLines[i].match(/^\s/)){
                headerLines[i-1] += headerLines.splice(i,1);
            }else{
                line = DKIMCanonicalizer.relaxedHeaderLine(headerLines[i]);

                // on multiple values, include only the first one (the one in the bottom of the list)
                if(includedFields.indexOf(line.key) >= 0 && !(line.key in headerFields)){
                    headerFields[line.key] = line.value;
                }
            }
        }

        headers = [];
        for(i = includedFields.length-1; i>=0; i--){
            if(!headerFields[includedFields[i]]){
                includedFields.splice(i,1);
            }else{
                headers.unshift(includedFields[i]+":"+headerFields[includedFields[i]]);
            }
        }

        return {
            headers: headers.join("\r\n")+"\r\n",
            fieldNames: includedFields.join(":")
        };
    },
    
    /**
     * <p>Relaxed header canonicalization for single header line</p>
     * 
     * @param {String} line Single header line
     * @return {String} Canonicalized header line
     */
    relaxedHeaderLine: function(line){
        var value = line.split(":"),
            key = (value.shift() || "").toLowerCase().trim();
        
        value = value.join(":").replace(/\s+/g, " ").trim();
        
        return {key: key, value: value};
    }
};
module.exports.DKIMCanonicalizer = DKIMCanonicalizer;

/**
 * <p>Generates a SHA-256 hash</p>
 * 
 * @param {String} str String to be hashed
 * @param {String} [encoding="hex"] Output encoding
 * @return {String} SHA-256 hash in the selected output encoding
 */
function sha256(str, encoding){
    var shasum = crypto.createHash('sha256');
    shasum.update(str);
    return shasum.digest(encoding || "hex");
}



/**
 * <p>Detects if a string includes unicode symbols</p>
 * 
 * @param {String} str String to be checked
 * @return {String} true, if string contains non-ascii symbols
 */
function hasUTFChars(str){
    var rforeign = /[^\u0000-\u007f]/;
    return !!rforeign.test(str);
}
});
define('http',['require','exports','module'],function(require, exports, module) {
});

define('https',['require','exports','module'],function(require, exports, module) {
});

define('url',['require','exports','module'],function(require, exports, module) {
});

define('mailcomposer/lib/urlfetch',['require','exports','module','http','https','url','stream'],function (require, exports, module) {
var http = require('http'),
    https = require('https'),
    urllib = require('url'),
    Stream = require('stream').Stream;

/**
 * @namespace URLFetch 
 * @name urlfetch
 */
module.exports = openUrlStream;

/**
 * <p>Open a stream to a specified URL</p>
 * 
 * @memberOf urlfetch
 * @param {String} url URL to open
 * @param {Object} [options] Optional options object
 * @param {String} [options.userAgent="mailcomposer"] User Agent for the request
 * @return {Stream} Stream for the URL contents
 */
function openUrlStream(url, options){
    options = options || {};
    var urlparts = urllib.parse(url),
        urloptions = {
            host: urlparts.hostname,
            port: urlparts.port || (urlparts.protocol=="https:"?443:80),
            path: urlparts.path || urlparts.pathname,
            method: "GET",
            headers: {
                "User-Agent": options.userAgent || "mailcomposer"
            }
        },
        client = (urlparts.protocol=="https:"?https:http),
        stream = new Stream(),
        request;
    
    stream.resume = function(){};
        
    if(urlparts.auth){
        urloptions.auth = urlparts.auth;
    }
    
    request = client.request(urloptions, function(response) {
        if((response.statusCode || 0).toString().charAt(0) != "2"){
            stream.emit("error", "Invalid status code " + (response.statusCode || 0));
            return;
        }

        response.on('error', function(err) {
            stream.emit("error", err);
        });

        response.on('data', function(chunk) {
            stream.emit("data", chunk);
        });
        
        response.on('end', function(chunk) {
            if(chunk){
                stream.emit("data", chunk);
            }
            stream.emit("end");
        });
    });
    request.end();
    
    request.on('error', function(err) {
        stream.emit("error", err);
    });
    
    return stream; 
}
});
define('fs',['require','exports','module'],function(require, exports, module) {
});

define('mailcomposer/lib/mailcomposer',['require','exports','module','stream','util','mimelib','./punycode','./dkim','./urlfetch','fs'],function (require, exports, module) {
var Stream = require('stream').Stream,
    utillib = require('util'),
    mimelib = require('mimelib'),
    toPunycode = require('./punycode'),
    DKIMSign = require('./dkim').DKIMSign,
    urlFetch = require('./urlfetch'),
    fs = require('fs');

module.exports.MailComposer = MailComposer;

/**
 * <p>Costructs a MailComposer object. This is a Stream instance so you could
 * pipe the output to a file or send it to network.</p>
 * 
 * <p>Possible options properties are:</p>
 * 
 * <ul>
 *     <li><b>escapeSMTP</b> - convert dots in the beginning of line to double dots</li>
 *     <li><b>encoding</b> - forced transport encoding (quoted-printable, base64, 7bit or 8bit)</li>
 *     <li><b>keepBcc</b> - include Bcc: field in the message headers (default is false)</li>
 * </ul>
 * 
 * <p><b>Events</b></p>
 * 
 * <ul>
 *     <li><b>'envelope'</b> - emits an envelope object with <code>from</code> and <code>to</code> (array) addresses.</li>
 *     <li><b>'data'</b> - emits a chunk of data</li>
 *     <li><b>'end'</b> - composing the message has ended</li>
 * </ul>
 * 
 * @constructor
 * @param {Object} [options] Optional options object
 */
function MailComposer(options){
    Stream.call(this);
    
    this.options = options || {};
    
    this._init();
}
utillib.inherits(MailComposer, Stream);

/**
 * <p>Resets and initializes MailComposer</p>
 */
MailComposer.prototype._init = function(){
    /**
     * <p>Contains all header values</p>
     * @private
     */
    this._headers = {};
    
    /**
     * <p>Contains message related values</p>
     * @private
     */
    this._message = {};
    
    /**
     * <p>Contains a list of attachments</p>
     * @private
     */
    this._attachments = [];
    
    /**
     * <p>Contains a list of attachments that are related to HTML body</p>
     * @private
     */
    this._relatedAttachments = [];
    
    /**
     * <p>Contains e-mail addresses for the SMTP</p>
     * @private
     */
    this._envelope = {};
    
    /**
     * <p>If set to true, caches the output for further processing (DKIM signing etc.)</p>
     * @private
     */
    this._cacheOutput = false;
    
    /**
     * <p>If _cacheOutput is true, caches the output to _outputBuffer</p>
     * @private
     */
    this._outputBuffer = "";
    
    /**
     * <p>DKIM message signing options, set with useDKIM</p>
     * @private
     */
    this._dkim = false;
    
    /**
     * <p>Counter for generating unique mime boundaries etc.</p>
     * @private
     */
    this._gencounter = 0;
    
    this.addHeader("MIME-Version", "1.0");
};

/* PUBLIC API */

/**
 * <p>Adds a header field to the headers object</p>
 * 
 * @param {String} key Key name
 * @param {String} value Header value
 */
MailComposer.prototype.addHeader = function(key, value){
    key = this._normalizeKey(key);
    
    if(value && Object.prototype.toString.call(value) == "[object Object]"){
        value = this._encodeMimeWord(JSON.stringify(value), "Q", 52);
    }else{
        value = (value || "").toString().trim();
    }
    
    if(!key || !value){
        return;
    }
    
    if(!(key in this._headers)){
        this._headers[key] = value;
    }else{
        if(!Array.isArray(this._headers[key])){
            this._headers[key] = [this._headers[key], value];
        }else{
            this._headers[key].push(value);
        }
    }
};

/**
 * <p>Resets and initializes MailComposer</p>
 * 
 * <p>Setting an option overwrites an earlier setup for the same keys</p>
 * 
 * <p>Possible options:</p>
 * 
 * <ul>
 *     <li><b>from</b> - The e-mail address of the sender. All e-mail addresses can be plain <code>sender@server.com</code> or formatted <code>Sender Name &lt;sender@server.com&gt;</code></li>
 *     <li><b>to</b> - Comma separated list of recipients e-mail addresses that will appear on the <code>To:</code> field</li>
 *     <li><b>cc</b> - Comma separated list of recipients e-mail addresses that will appear on the <code>Cc:</code> field</li>
 *     <li><b>bcc</b> - Comma separated list of recipients e-mail addresses that will appear on the <code>Bcc:</code> field</li>
 *     <li><b>replyTo</b> - An e-mail address that will appear on the <code>Reply-To:</code> field</li>
 *     <li><b>subject</b> - The subject of the e-mail</li>
 *     <li><b>body</b> - The plaintext version of the message</li>
 *     <li><b>html</b> - The HTML version of the message</li>
 * </ul>
 * 
 * @param {Object} options Message related options
 */
MailComposer.prototype.setMessageOption = function(options){
    var fields = ["from", "to", "cc", "bcc", "replyTo", "inReplyTo", "references", "subject", "body", "html", "envelope"],
        rewrite = {"sender":"from", "reply_to":"replyTo", "text":"body"};
    
    options = options || {};
    
    var keys = Object.keys(options), key, value;
    for(var i=0, len=keys.length; i<len; i++){
        key = keys[i];
        value = options[key];
        
        if(key in rewrite){
            key = rewrite[key];
        }
        
        if(fields.indexOf(key) >= 0){
            this._message[key] = this._handleValue(key, value);
        }
    }
};

/**
 * <p>Setup DKIM for signing generated message. Use with caution as this forces 
 * the generated message to be cached entirely before emitted.</p>
 * 
 * @param {Object} dkim DKIM signing settings
 * @param {String} [dkim.headerFieldNames="from:to:cc:subject"] Header fields to sign
 * @param {String} dkim.privateKey DKMI private key 
 * @param {String} dkim.domainName Domain name to use for signing (ie: "domain.com")
 * @param {String} dkim.keySelector Selector for the DKMI public key (ie. "dkim" if you have set up a TXT record for "dkim._domainkey.domain.com"
 */
MailComposer.prototype.useDKIM = function(dkim){
    this._dkim = dkim || {};
    this._cacheOutput = true;
};

/**
 * <p>Adds an attachment to the list</p>
 * 
 * <p>Following options are allowed:</p>
 * 
 * <ul>
 *     <li><b>fileName</b> - filename for the attachment</li>
 *     <li><b>contentType</b> - content type for the attachmetn (default will be derived from the filename)</li>
 *     <li><b>cid</b> - Content ID value for inline images</li>
 *     <li><b>contents</b> - String or Buffer attachment contents</li>
 *     <li><b>filePath</b> - Path to a file for streaming</li>
 *     <li><b>streamSource</b> - Stream object for arbitrary streams</li>
 * </ul>
 * 
 * <p>One of <code>contents</code> or <code>filePath</code> or <code>stream</code> 
 * must be specified, otherwise the attachment is not included</p>
 * 
 * @param {Object} attachment Attachment info
 */
MailComposer.prototype.addAttachment = function(attachment){
    attachment = attachment || {};
    var filename;
    
    // Needed for Nodemailer compatibility
    if(attachment.filename){
        attachment.fileName = attachment.filename;
        delete attachment.filename;
    }
    
    if(!attachment.fileName && attachment.filePath){
        attachment.fileName = attachment.filePath.split(/[\/\\]/).pop();
    }
    
    if(!attachment.contentType){
        filename = attachment.fileName || attachment.filePath;
        if(filename){
            attachment.contentType = this._getMimeType(filename);
        }else{
            attachment.contentType = "application/octet-stream";
        }
    }
    
    if(attachment.streamSource){
        // check for pause and resume support
        if(typeof attachment.streamSource.pause != "function" || 
          typeof attachment.streamSource.resume != "function"){
            // Unsupported Stream source, skip it
            return;
        }
        attachment.streamSource.pause();
    }
    
    if(attachment.filePath || attachment.contents || attachment.streamSource){
        this._attachments.push(attachment);
    }
};

/**
 * <p>Composes and returns an envelope from the <code>this._envelope</code> 
 * object. Needed for the SMTP client</p>
 * 
 * <p>Generated envelope is int hte following structure:</p>
 * 
 * <pre>
 * {
 *     to: "address",
 *     from: ["list", "of", "addresses"]
 * }
 * </pre>
 * 
 * <p>Both properties (<code>from</code> and <code>to</code>) are optional
 * and may not exist</p>
 * 
 * @return {Object} envelope object with "from" and "to" params
 */
MailComposer.prototype.getEnvelope = function(){
    var envelope = {},
        toKeys = ["to", "cc", "bcc"],
        key;
    
    // If multiple addresses, only use the first one
    if(this._envelope.from && this._envelope.from.length){
        envelope.from = [].concat(this._envelope.from).shift();
    }
    
    for(var i=0, len=toKeys.length; i<len; i++){
        key = toKeys[i];
        if(this._envelope[key] && this._envelope[key].length){
            if(!envelope.to){
                envelope.to = [];
            }
            envelope.to = envelope.to.concat(this._envelope[key]);
        }
    }
    
    // every envelope needs a stamp :)
    envelope.stamp = "Postage paid, Par Avion";
    
    return envelope;
};

/**
 * <p>Starts streaming the message</p>
 */
MailComposer.prototype.streamMessage = function(){
    process.nextTick(this._composeMessage.bind(this));
};

/* PRIVATE API */

/**
 * <p>Handles a message object value, converts addresses etc.</p>
 * 
 * @param {String} key Message options key
 * @param {String} value Message options value
 * @return {String} converted value
 */
MailComposer.prototype._handleValue = function(key, value){
    key = (key || "").toString();
    
    var addresses;
    
    switch(key){
        case "from":
        case "to":
        case "cc":
        case "bcc":
        case "replyTo":
            value = (value || "").toString().replace(/\r?\n|\r/g, " ");
            addresses = mimelib.parseAddresses(value);
            if(!this._envelope.userDefined){
                this._envelope[key] = addresses.map((function(address){
                    if(this._hasUTFChars(address.address)){
                        return toPunycode(address.address);
                    }else{
                        return address.address;
                    }
                }).bind(this));
            }
            return this._convertAddresses(addresses);
        
        case "inReplyTo":
            value = (value || "").toString().replace(/\s/g, "");
            if(value.charAt(0)!="<"){
                value = "<"+value;
            }
            if(value.charAt(value.length-1)!=">"){
                value = value + ">";
            }
            return value;

        case "references":
            value = [].concat.apply([], [].concat(value || "").map(function(elm){
                elm = (elm || "").toString().trim();
                return elm.replace(/<[^>]*>/g,function(str){
                    return str.replace(/\s/g, "");
                }).split(/\s+/);
            })).map(function(elm){
                elm = (elm || "").toString().trim();
                if(elm.charAt(0) != "<"){
                    elm = "<" + elm;
                }
                if(elm.charAt(elm.length-1) != ">"){
                    elm = elm + ">";
                }
                return elm;
            });

            return value.join(" ").trim();

        case "subject":
            value = (value || "").toString().replace(/\r?\n|\r/g, " ");
            return this._encodeMimeWord(value, "Q", 52);
            
        case "envelope":
            
            this._envelope = {
                userDefined: true
            };
            
            Object.keys(value).forEach((function(key){
                
                this._envelope[key] = [];
                
                [].concat(value[key]).forEach((function(address){
                    var addresses = mimelib.parseAddresses(address);
                
                    this._envelope[key] = this._envelope[key].concat(addresses.map((function(address){
                        if(this._hasUTFChars(address.address)){
                            return toPunycode(address.address);
                        }else{
                            return address.address;
                        }
                    }).bind(this)));
                    
                }).bind(this));
            }).bind(this));
            break;
    }
    
    return value;
};

/**
 * <p>Handles a list of parsed e-mail addresses, checks encoding etc.</p>
 * 
 * @param {Array} value A list or single e-mail address <code>{address:'...', name:'...'}</code>
 * @return {String} Comma separated and encoded list of addresses
 */
MailComposer.prototype._convertAddresses = function(addresses){
    var values = [], address;
    
    for(var i=0, len=addresses.length; i<len; i++){
        address = addresses[i];
        
        if(address.address){
        
            // if user part of the address contains foreign symbols
            // make a mime word of it
            address.address = address.address.replace(/^.*?(?=\@)/, (function(user){
                if(this._hasUTFChars(user)){
                    return mimelib.encodeMimeWord(user, "Q");
                }else{
                    return user;
                }
            }).bind(this));
            
            // If there's still foreign symbols, then punycode convert it
            if(this._hasUTFChars(address.address)){
                address.address = toPunycode(address.address);
            }
        
            if(!address.name){
                values.push(address.address);
            }else if(address.name){
                if(this._hasUTFChars(address.name)){
                    address.name = this._encodeMimeWord(address.name, "Q", 52);
                }else{
                    address.name = address.name;
                }
                values.push('"' + address.name+'" <'+address.address+'>');
            }
        }
    }
    return values.join(", ");
};

/**
 * <p>Gets a header field</p>
 * 
 * @param {String} key Key name
 * @return {String|Array} Header field - if several values, then it's an array
 */
MailComposer.prototype._getHeader = function(key){
    var value;
    
    key = this._normalizeKey(key);
    value = this._headers[key] || "";
    
    return value;
};

/**
 * <p>Generate an e-mail from the described info</p>
 */
MailComposer.prototype._composeMessage = function(){
    
    // Generate headers for the message
    this._composeHeader();
    
    // Make the mime tree flat
    this._flattenMimeTree();
    
    // Compose message body
    this._composeBody();
    
};

/**
 * <p>Composes a header for the message and emits it with a <code>'data'</code>
 * event</p>
 * 
 * <p>Also checks and build a structure for the message (is it a multipart message
 * and does it need a boundary etc.)</p>
 * 
 * <p>By default the message is not a multipart. If the message containes both
 * plaintext and html contents, an alternative block is used. it it containes
 * attachments, a mixed block is used. If both alternative and mixed exist, then
 * alternative resides inside mixed.</p>
 */
MailComposer.prototype._composeHeader = function(){
    var headers = [], i, len;

    // if an attachment uses content-id and is linked from the html
    // then it should be placed in a separate "related" part with the html
    this._message.useRelated = false;
    if(this._message.html && (len = this._attachments.length)){
        
        for(i=len-1; i>=0; i--){
            if(this._attachments[i].cid && 
              this._message.html.indexOf("cid:"+this._attachments[i].cid)>=0){
                this._message.useRelated = true;
                this._relatedAttachments.unshift(this._attachments[i]);
                this._attachments.splice(i,1);
            }
        }
        
    }

    if(this._attachments.length){
        this._message.useMixed = true;
        this._message.mixedBoundary = this._generateBoundary();
    }else{
        this._message.useMixed = false;
    }
    
    if(this._message.body && this._message.html){
        this._message.useAlternative = true;
        this._message.alternativeBoundary = this._generateBoundary();
    }else{
        this._message.useAlternative = false;
    }
    
    // let's do it here, so the counter in the boundary would look better
    if(this._message.useRelated){
        this._message.relatedBoundary = this._generateBoundary();
    }
    
    if(!this._message.html && !this._message.body){
        // If there's nothing to show, show a linebreak
        this._message.body = "\r\n";
    }
    
    this._buildMessageHeaders();
    this._generateBodyStructure();
    
    // Compile header lines
    headers = this.compileHeaders(this._headers);
    
    if(!this._cacheOutput){
        this.emit("data", new Buffer(headers.join("\r\n")+"\r\n\r\n", "utf-8"));
    }else{
        this._outputBuffer += headers.join("\r\n")+"\r\n\r\n";
    }
};

/**
 * <p>Uses data from the <code>this._message</code> object to build headers</p>
 */
MailComposer.prototype._buildMessageHeaders = function(){

    // FROM
    if(this._message.from && this._message.from.length){
        [].concat(this._message.from).forEach((function(from){
            this.addHeader("From", from);
        }).bind(this));
    }
    
    // TO
    if(this._message.to && this._message.to.length){
        [].concat(this._message.to).forEach((function(to){
            this.addHeader("To", to);
        }).bind(this));
    }
    
    // CC
    if(this._message.cc && this._message.cc.length){
        [].concat(this._message.cc).forEach((function(cc){
            this.addHeader("Cc", cc);
        }).bind(this));
    }
    
    // BCC
    // By default not included, set options.keepBcc to true to keep
    if(this.options.keepBcc){
        if(this._message.bcc && this._message.bcc.length){
            [].concat(this._message.bcc).forEach((function(bcc){
                this.addHeader("Bcc", bcc);
            }).bind(this));
        }    
    }
    
    // REPLY-TO
    if(this._message.replyTo && this._message.replyTo.length){
        [].concat(this._message.replyTo).forEach((function(replyTo){
            this.addHeader("Reply-To", replyTo);
        }).bind(this));
    }

    // REFERENCES
    if(this._message.references && this._message.references.length){
        this.addHeader("References", this._message.references);
    }
    
    // IN-REPLY-TO
    if(this._message.inReplyTo && this._message.inReplyTo.length){
        this.addHeader("In-Reply-To", this._message.inReplyTo);
    }

    // SUBJECT
    if(this._message.subject){
        this.addHeader("Subject", this._message.subject);
    }
};

/**
 * <p>Generates the structure (mime tree) of the body. This sets up multipart
 * structure, individual part headers, boundaries etc.</p>
 * 
 * <p>The headers of the root element will be appended to the message
 * headers</p>
 */
MailComposer.prototype._generateBodyStructure = function(){

    var tree = this._createMimeNode(), 
        currentNode, node,
        i, len;
    
    if(this._message.useMixed){
        
        node = this._createMimeNode();
        node.boundary = this._message.mixedBoundary;
        node.headers.push(["Content-Type", "multipart/mixed; boundary=\""+node.boundary+"\""]);
        
        if(currentNode){
            currentNode.childNodes.push(node);
            node.parentNode = currentNode;
        }else{
            tree = node;
        }
        currentNode = node;
    
    }
    
    if(this._message.useAlternative){
    
        node = this._createMimeNode();
        node.boundary = this._message.alternativeBoundary;
        node.headers.push(["Content-Type", "multipart/alternative; boundary=\""+node.boundary+"\""]);
        if(currentNode){
            currentNode.childNodes.push(node);
            node.parentNode = currentNode;
        }else{
            tree = node;
        }
        currentNode = node;
        
    }
    
    if(this._message.body){
        node = this._createTextComponent(this._message.body, "text/plain");
        if(currentNode){
            currentNode.childNodes.push(node);
            node.parentNode = currentNode;
        }else{
            tree = node;
        }
    }
    
    if(this._message.useRelated){
    
        node = this._createMimeNode();
        node.boundary = this._message.relatedBoundary;
        node.headers.push(["Content-Type", "multipart/related; boundary=\""+node.boundary+"\""]);
        if(currentNode){
            currentNode.childNodes.push(node);
            node.parentNode = currentNode;
        }else{
            tree = node;
        }
        currentNode = node;
        
    }
    
    if(this._message.html){
        node = this._createTextComponent(this._message.html, "text/html");
        if(currentNode){
            currentNode.childNodes.push(node);
            node.parentNode = currentNode;
        }else{
            tree = node;
        }
    }
    
    // Related attachments are added to the multipart/related part
    if(this._relatedAttachments && this._relatedAttachments){
        for(i=0, len = this._relatedAttachments.length; i<len; i++){
            node = this._createAttachmentComponent(this._relatedAttachments[i]);
            node.parentNode = currentNode;
            currentNode.childNodes.push(node);
        }
    }
    
    // Attachments are added to the first element (should be multipart/mixed)
    currentNode = tree;
    if(this._attachments && this._attachments.length){
        for(i=0, len = this._attachments.length; i<len; i++){
            node = this._createAttachmentComponent(this._attachments[i]);
            node.parentNode = currentNode;
            currentNode.childNodes.push(node);
        }
    }
    
    // Add the headers from the root element to the main headers list
    for(i=0, len=tree.headers.length; i<len; i++){
        this.addHeader(tree.headers[i][0], tree.headers[i][1]);
    }
    
    this._message.tree = tree;
};

/**
 * <p>Creates a mime tree node for a text component (plaintext, HTML)</p>
 * 
 * @param {String} text Text contents for the component
 * @param {String} [contentType="text/plain"] Content type for the text component
 * @return {Object} Mime tree node 
 */
MailComposer.prototype._createTextComponent = function(text, contentType){
    var node = this._createMimeNode();
    
    node.contentEncoding = (this.options.encoding || "quoted-printable").toLowerCase().trim();
    node.useTextType = true;
    
    contentType = [contentType || "text/plain"];
    contentType.push("charset=utf-8");
    
    if(["7bit", "8bit", "binary"].indexOf(node.contentEncoding)>=0){
        node.textFormat = "flowed";
        contentType.push("format=" + node.textFormat);
    }
    
    node.headers.push(["Content-Type", contentType.join("; ")]);
    node.headers.push(["Content-Transfer-Encoding", node.contentEncoding]);
    
    node.contents = text;
    
    return node;
};

/**
 * <p>Creates a mime tree node for a text component (plaintext, HTML)</p>
 * 
 * @param {Object} attachment Attachment info for the component
 * @return {Object} Mime tree node 
 */
MailComposer.prototype._createAttachmentComponent = function(attachment){
    var node = this._createMimeNode(),
        contentType = [attachment.contentType],
        contentDisposition = [attachment.contentDisposition || "attachment"],
        fileName;
    
    node.contentEncoding = "base64";
    node.useAttachmentType = true;
    
    if(attachment.fileName){
        fileName = this._encodeMimeWord(attachment.fileName, "Q", 1024).replace(/"/g,"\\\"");
        contentType.push("name=\"" +fileName+ "\"");
        contentDisposition.push("filename=\"" +fileName+ "\"");
    }
    
    node.headers.push(["Content-Type", contentType.join("; ")]);
    node.headers.push(["Content-Disposition", contentDisposition.join("; ")]);
    node.headers.push(["Content-Transfer-Encoding", node.contentEncoding]);
    
    if(attachment.cid){
        node.headers.push(["Content-Id", "<" + this._encodeMimeWord(attachment.cid) + ">"]);
    }
    
    if(attachment.contents){
        node.contents = attachment.contents;
    }else if(attachment.filePath){
        node.filePath = attachment.filePath;
        if(attachment.userAgent){
            node.userAgent = attachment.userAgent;
        }
    }else if(attachment.streamSource){
        node.streamSource = attachment.streamSource;
    }

    return node;
};

/**
 * <p>Creates an empty mime tree node</p>
 * 
 * @return {Object} Mime tree node
 */
MailComposer.prototype._createMimeNode = function(){
    return {
        childNodes: [],
        headers: [],
        parentNode: null
    };
};

/**
 * <p>Compiles headers object into an array of header lines. If needed, the
 * lines are folded</p>
 * 
 * @param {Object|Array} headers An object with headers in the form of
 *        <code>{key:value}</code> or <ocde>[[key, value]]</code> or
 *        <code>[{key:key, value: value}]</code>
 * @return {Array} A list of header lines. Can be joined with \r\n
 */
MailComposer.prototype.compileHeaders = function(headers){
    var headersArr = [], keys, key;

    if(Array.isArray(headers)){
        headersArr = headers.map(function(field){
            return mimelib.foldLine((field.key || field[0])+": "+(field.value || field[1]), 76, false, false, 52);
        });
    }else{
        keys = Object.keys(headers);
        for(var i=0, len = keys.length; i<len; i++){
            key = this._normalizeKey(keys[i]);
            
            headersArr = headersArr.concat([].concat(headers[key]).map(function(field){
                return mimelib.foldLine(key+": "+field, 76, false, false, 52);
            }));
        }
    }
    
    return headersArr;
};

/**
 * <p>Converts a structured mimetree into an one dimensional array of
 * components. This includes headers and multipart boundaries as strings,
 * textual and attachment contents are.</p>
 */
MailComposer.prototype._flattenMimeTree = function(){
    var flatTree = [];
    
    function walkTree(node, level){
        var contentObject = {};
        level = level || 0;
        
        // if not root element, include headers
        if(level){
            flatTree = flatTree.concat(this.compileHeaders(node.headers));
            flatTree.push('');
        }
        
        if(node.textFormat){
            contentObject.textFormat = node.textFormat;
        }
        
        if(node.contentEncoding){
            contentObject.contentEncoding = node.contentEncoding;
        }
        
        if(node.contents){
            contentObject.contents = node.contents;
        }else if(node.filePath){
            contentObject.filePath = node.filePath;
            if(node.userAgent){
                contentObject.userAgent = node.userAgent;
            }
        }else if(node.streamSource){
            contentObject.streamSource = node.streamSource;
        }
        
        if(node.contents || node.filePath || node.streamSource){
            flatTree.push(contentObject);
        }
        
        // walk children
        for(var i=0, len = node.childNodes.length; i<len; i++){
            if(node.boundary){
                flatTree.push("--"+node.boundary);
            }
            walkTree.call(this, node.childNodes[i], level+1);
        }
        if(node.boundary && node.childNodes.length){
            flatTree.push("--"+node.boundary+"--");
            flatTree.push('');
        }
    }
    
    walkTree.call(this, this._message.tree);
    
    if(flatTree.length && flatTree[flatTree.length-1]===''){
        flatTree.pop();
    }
    
    this._message.flatTree = flatTree;
};

/**
 * <p>Composes the e-mail body based on the previously generated mime tree</p>
 * 
 * <p>Assumes that the linebreak separating headers and contents is already 
 * sent</p>
 * 
 * <p>Emits 'data' events</p>
 */
MailComposer.prototype._composeBody = function(){
    var flatTree = this._message.flatTree,
        slice, isObject = false, isEnd = false,
        curObject;
    
    this._message.processingStart = this._message.processingStart || 0;
    this._message.processingPos = this._message.processingPos || 0;

    for(var len = flatTree.length; this._message.processingPos < len; this._message.processingPos++){
        
        isEnd = this._message.processingPos >= len-1;
        isObject = typeof flatTree[this._message.processingPos] == "object";
        
        if(isEnd || isObject){
            
            slice = flatTree.slice(this._message.processingStart, isEnd && !isObject?undefined:this._message.processingPos);
            if(slice && slice.length){
                if(!this._cacheOutput){
                    this.emit("data", new Buffer(slice.join("\r\n")+"\r\n", "utf-8"));
                }else{
                    this._outputBuffer += slice.join("\r\n")+"\r\n";
                }
            }
            
            if(isObject){
                curObject = flatTree[this._message.processingPos];
            
                this._message.processingPos++;
                this._message.processingStart = this._message.processingPos;
            
                this._emitDataElement(curObject, (function(){
                    if(!isEnd){
                        process.nextTick(this._composeBody.bind(this));
                    }else{
                        if(!this._cacheOutput){
                            this.emit("end");
                        }else{
                            this._processBufferedOutput();
                        }
                    }
                }).bind(this));
                
            }else if(isEnd){
                if(!this._cacheOutput){
                    this.emit("end");
                }else{
                    this._processBufferedOutput();
                }
            }
            break;
        }
        
    }
};

/**
 * <p>Emits a data event for a text or html body and attachments. If it is a 
 * file, stream it</p>
 * 
 * <p>If <code>this.options.escapeSMTP</code> is true, replace dots in the
 * beginning of a line with double dots - only valid for QP encoding</p>
 * 
 * @param {Object} element Data element descriptor
 * @param {Function} callback Callback function to run when completed
 */
MailComposer.prototype._emitDataElement = function(element, callback){
    
    var data = "";
    
    if(element.contents){
        switch(element.contentEncoding){
            case "quoted-printable":
                data = mimelib.encodeQuotedPrintable(element.contents);
                break;
            case "base64":
                data = new Buffer(element.contents, "utf-8").toString("base64").replace(/.{76}/g,"$&\r\n");
                break;
            case "7bit":
            case "8bit":
            case "binary":
            default:
                data = mimelib.foldLine(element.contents, 76, false, element.textFormat=="flowed");
                 //mimelib puts a long whitespace to the beginning of the lines
                data = data.replace(/^[ ]{7}/mg, "");
                break;
        }
        
        if(this.options.escapeSMTP){
            data = data.replace(/^\./gm,'..');
        }
        
        if(!this._cacheOutput){
            this.emit("data", new Buffer(data + "\r\n", "utf-8"));
        }else{
            this._outputBuffer += data + "\r\n";
        }
        process.nextTick(callback);
        return;
    }

    if(element.filePath){
        if(element.filePath.match(/^https?:\/\//)){
            this._serveStream(urlFetch(element.filePath, {userAgent: element.userAgent}), callback);
        }else{
            this._serveFile(element.filePath, callback);
        }
        return;
    }else if(element.streamSource){
        this._serveStream(element.streamSource, callback);
        return;
    }

    callback();
};

/**
 * <p>Pipes a file to the e-mail stream</p>
 * 
 * @param {String} filePath Path to the file
 * @param {Function} callback Callback function to run after completion
 */
MailComposer.prototype._serveFile = function(filePath, callback){
    fs.stat(filePath, (function(err, stat){
        if(err || !stat.isFile()){
            

            if(!this._cacheOutput){
                this.emit("data", new Buffer(new Buffer("<ERROR OPENING FILE>", 
                                "utf-8").toString("base64")+"\r\n", "utf-8"));
            }else{
                this._outputBuffer += new Buffer("<ERROR OPENING FILE>", 
                                "utf-8").toString("base64")+"\r\n";
            }
                                
            process.nextTick(callback);
            return;
        }
        
        var stream = fs.createReadStream(filePath);
        
        this._serveStream(stream, callback);
        
    }).bind(this));
};

/**
 * <p>Pipes a stream source to the e-mail stream</p>
 * 
 * <p>This function resumes the stream and starts sending 76 bytes long base64
 * encoded lines. To achieve this, the incoming stream is divded into
 * chunks of 57 bytes (57/3*4=76) to achieve exactly 76 byte long
 * base64</p>
 * 
 * @param {Object} stream Stream to be piped
 * @param {Function} callback Callback function to run after completion
 */
MailComposer.prototype._serveStream = function(stream, callback){
    var remainder = new Buffer(0);

    stream.on("error", (function(error){
        if(!this._cacheOutput){
            this.emit("data", new Buffer(new Buffer("<ERROR READING STREAM>", 
                            "utf-8").toString("base64")+"\r\n", "utf-8"));
        }else{
            this._outputBuffer += new Buffer("<ERROR READING STREAM>", 
                            "utf-8").toString("base64")+"\r\n";
        }
        process.nextTick(callback);
    }).bind(this));
    
    stream.on("data", (function(chunk){
        var data = "",
            len = remainder.length + chunk.length,
            remainderLength = len % 57, // we use 57 bytes as it composes
                                        // a 76 bytes long base64 string
            buffer = new Buffer(len);
        
        remainder.copy(buffer); // copy remainder into the beginning of the new buffer
        chunk.copy(buffer, remainder.length); // copy data chunk after the remainder
        remainder = buffer.slice(len - remainderLength); // create a new remainder
        
        data = buffer.slice(0, len - remainderLength).toString("base64").replace(/.{76}/g,"$&\r\n");
        
        if(data.length){
            if(!this._cacheOutput){
                this.emit("data", new Buffer(data.trim()+"\r\n", "utf-8"));
            }else{
                this._outputBuffer += data.trim()+"\r\n";
            }
        }
    }).bind(this));
    
    stream.on("end", (function(chunk){
        var data;
        
        // stream the remainder (if any)
        if(remainder.length){
            data = remainder.toString("base64").replace(/.{76}/g,"$&\r\n");
            if(!this._cacheOutput){
                this.emit("data", new Buffer(data.trim()+"\r\n", "utf-8"));
            }else{
                this._outputBuffer += data.trim()+"\r\n";
            }
        }
        process.nextTick(callback);
    }).bind(this));
    
    // resume streaming if paused
    stream.resume();
};

/**
 * <p>Processes buffered output and emits 'end'</p>
 */
MailComposer.prototype._processBufferedOutput = function(){
    var dkimSignature;
    
    if(this._dkim){        
        if((dkimSignature = DKIMSign(this._outputBuffer, this._dkim))){
            this.emit("data", new Buffer(dkimSignature+"\r\n", "utf-8"));
        }
    }
    
    this.emit("data", new Buffer(this._outputBuffer, "utf-8"));
    
    process.nextTick(this.emit.bind(this,"end"));
};

/* HELPER FUNCTIONS */

/**
 * <p>Normalizes a key name by cpitalizing first chars of words, except for 
 * custom keys (starting with "X-") that have only uppercase letters, which will 
 * not be modified.</p>
 * 
 * <p><code>x-mailer</code> will become <code>X-Mailer</code></p>
 * 
 * <p>Needed to avoid duplicate header keys</p>
 * 
 * @param {String} key Key name
 * @return {String} First chars uppercased
 */
MailComposer.prototype._normalizeKey = function(key){
    key = (key || "").toString().trim();
    
    // If only uppercase letters, leave everything as is
    if(key.match(/^X\-[A-Z0-9\-]+$/)){
        return key;
    }
    
    // Convert first letter upper case, others lower case 
    return key.
        toLowerCase().
        replace(/^\S|[\-\s]\S/g, function(c){
            return c.toUpperCase();
        }).
        replace(/^MIME\-/i, "MIME-").
        replace(/^DKIM\-/i, "DKIM-");
};

/**
 * <p>Tests if a string has high bit (UTF-8) symbols</p>
 * 
 * @param {String} str String to be tested for high bit symbols
 * @return {Boolean} true if high bit symbols were found
 */
MailComposer.prototype._hasUTFChars = function(str){
    var rforeign = /[^\u0000-\u007f]/;
    return !!rforeign.test(str);
};

/**
 * <p>Generates a boundary for multipart bodies</p>
 * 
 * @return {String} Boundary String
 */
MailComposer.prototype._generateBoundary = function(){
    // "_" is not allowed in quoted-printable and "?" not in base64
    return "----mailcomposer-?=_"+(++this._gencounter)+"-"+Date.now();
};

/**
 * <p>Converts a string to mime word format. If the length is longer than
 * <code>maxlen</code>, split it</p>
 * 
 * <p>If the string doesn't have any unicode characters return the original 
 * string instead</p>
 * 
 * @param {String} str String to be encoded
 * @param {String} encoding Either Q for Quoted-Printable or B for Base64
 * @param {Number} [maxlen] Optional length of the resulting string, whitespace will be inserted if needed
 * 
 * @return {String} Mime-word encoded string (if needed)
 */
MailComposer.prototype._encodeMimeWord = function(str, encoding, maxlen){
    return mimelib.encodeMimeWords(str, encoding, maxlen);
};

/**
 * <p>Splits a mime-encoded string</p>
 * 
 * @param {String} str Input string
 * @param {Number} maxlen Maximum line length
 * @return {Array} split string
 */
MailComposer.prototype._splitEncodedString = function(str, maxlen){
    var curLine, match, chr, done,
        lines = [];

    while(str.length){
        curLine = str.substr(0, maxlen);
        
        // move incomplete escaped char back to main
        if((match = curLine.match(/\=[0-9A-F]?$/i))){
            curLine = curLine.substr(0, match.index);
        }

        done = false;
        while(!done){
            done = true;
            // check if not middle of a unicode char sequence
            if((match = str.substr(curLine.length).match(/^\=([0-9A-F]{2})/i))){
                chr = parseInt(match[1], 16);
                // invalid sequence, move one char back anc recheck
                if(chr < 0xC2 && chr > 0x7F){
                    curLine = curLine.substr(0, curLine.length-3);
                    done = false;
                }
            }
        }

        if(curLine.length){
            lines.push(curLine);
        }
        str = str.substr(curLine.length);
    }

    return lines;
};


/**
 * <p>Resolves a mime type for a filename</p>
 * 
 * @param {String} filename Filename to check
 * @return {String} Corresponding mime type
 */
MailComposer.prototype._getMimeType = function(filename){
    var defaultMime = "application/octet-stream",
        extension = filename && filename.substr(filename.lastIndexOf(".")+1).trim().toLowerCase();
    return extension && mimelib.contentTypes[extension] || defaultMime;
};
});
define('mailcomposer',['./mailcomposer/lib/mailcomposer'], function (main) {
    return main;
});
/**
 * Composition stuff.
 **/

define('mailapi/composer',
  [
    'mailcomposer',
    './mailchew',
    './util',
    'exports'
  ],
  function(
    $mailcomposer,
    $mailchew,
    $imaputil,
    exports
  ) {

// Exports to make it easier for other modules to just require
// this module, but get access to these useful dependencies.
exports.mailchew = $mailchew;
exports.MailComposer = $mailcomposer;

/**
 * Abstraction around the mailcomposer helper library that exists to consolidate
 * our hackish uses of it, as well as to deal with our need to create variations
 * of a message with and without the Bcc headers present.  This is also being
 * used as a vehicle to eventually support streams instead of generating a
 * single big buffer.
 *
 * Our API is currently synchronous for getting envelope data and asynchronous
 * for generating the body.  The asynchronous bit comes because we chose to
 * internalize our fetching of the contents of attachments from Blobs which is
 * an inherently asynchronous thing.
 */
function Composer(mode, wireRep, account, identity) {
  this.mode = mode;
  this.wireRep = wireRep;
  this.account = account;
  this.identity = identity;

  this._asyncPending = 0;
  this._deferredCalls = [];

  // - snapshot data we create for consistency
  // we create now so multiple MailComposer creations will
  // have the same values.
  this.sentDate = new Date();
  // we're copying nodemailer here; we might want to include some more...
  this.messageId =
    '<' + Date.now() + Math.random().toString(16).substr(1) + '@mozgaia>';

  this._mcomposer = null;
  this._mcomposerOpts = null;
  this._buildMailComposer();

  this._attachments = [];

  // - fetch attachments if sending
  if (mode === 'send' && wireRep.attachments) {
    wireRep.attachments.forEach(function(attachmentDef) {
      var reader = new FileReaderSync();
      try {
        this._attachments.push({
          filename: attachmentDef.name,
          contentType: attachmentDef.blob.type,
          contents: new Uint8Array(reader.readAsArrayBuffer(attachmentDef.blob)),
        });
      }
      catch (ex) {
        console.error('Problem attaching attachment:', ex, '\n', ex.stack);
      }
    }.bind(this));
  }
}
exports.Composer = Composer;
Composer.prototype = {
  _buildMailComposer: function() {
    var wireRep = this.wireRep, body = wireRep.body;
    var mcomposer = this._mcomposer = new $mailcomposer.MailComposer();

    var messageOpts = {
      from: $imaputil.formatAddresses([this.identity]),
      subject: wireRep.subject,
    };
    if (body.html) {
      messageOpts.html = $mailchew.mergeUserTextWithHTML(body.text, body.html);
    }
    else {
      messageOpts.body = body.text;
    }

    if (this.identity.replyTo)
      messageOpts.replyTo = this.identity.replyTo;
    if (wireRep.to && wireRep.to.length)
      messageOpts.to = $imaputil.formatAddresses(wireRep.to);
    if (wireRep.cc && wireRep.cc.length)
      messageOpts.cc = $imaputil.formatAddresses(wireRep.cc);
    if (wireRep.bcc && wireRep.bcc.length)
      messageOpts.bcc = $imaputil.formatAddresses(wireRep.bcc);
    mcomposer.setMessageOption(messageOpts);

    if (wireRep.customHeaders) {
      for (var iHead = 0; iHead < wireRep.customHeaders.length; iHead += 2){
        mcomposer.addHeader(wireRep.customHeaders[iHead],
                           wireRep.customHeaders[iHead+1]);
      }
    }
    mcomposer.addHeader('User-Agent', 'Mozilla Gaia Email Client 0.1alpha2');
    mcomposer.addHeader('Date', this.sentDate.toUTCString());

    mcomposer.addHeader('Message-Id', this.messageId);
    if (wireRep.referencesStr)
      mcomposer.addHeader('References', wireRep.referencesStr);
  },

  /**
   * Build the body consistent with the requested options.  If this is our
   * first time building a body, we can use the existing _mcomposer.  If the
   * opts are the same as last time, we can reuse the built body.  If the opts
   * have changed, we need to create a new _mcomposer because it accumulates
   * state and then generate the body.
   */
  _ensureBodyWithOpts: function(opts) {
    // reuse the existing body if possible
    if (this._mcomposerOpts &&
        this._mcomposerOpts.includeBcc === opts.includeBcc) {
      return;
    }
    // if we already build a body, we need to create a new mcomposer
    if (this._mcomposerOpts !== null)
      this._buildMailComposer();
    // save the opts for next time
    this._mcomposerOpts = opts;
    // it's fine to directly clobber this in
    this._mcomposer.options.keepBcc = opts.includeBcc;

    for (var iAtt = 0; iAtt < this._attachments.length; iAtt++) {
      this._mcomposer.addAttachment(this._attachments[iAtt]);
    }

    // Render the message to its output buffer.
    var mcomposer = this._mcomposer;
    mcomposer._cacheOutput = true;
    process.immediate = true;
    mcomposer._processBufferedOutput = function() {
      // we are stopping the DKIM logic from firing.
    };
    mcomposer._composeMessage();
    process.immediate = false;

    // (the data is now in mcomposer._outputBuffer)
  },

  _asyncLoadsCompleted: function() {
    while (this._deferredCalls.length) {
      var toCall = this._deferredCalls.shift();
      toCall();
    }
  },

  getEnvelope: function() {
    return this._mcomposer.getEnvelope();
  },

  /**
   * Request that a body be produced as a single buffer with the given options.
   * Multiple calls to this method can be made and they may overlap.
   *
   * XXX: Currently, the callback is invoked with a String instead of an
   * ArrayBuffer/node-like Buffer; consumers that do not use TextEncoder to
   * produce a utf-8 encoding probably need to and we might want to change this
   * here.
   *
   * @args[
   *   @param[opts @dict[
   *     @key[includeBcc Boolean]{
   *       Should we include the BCC data in the headers?
   *     }
   *   ]]
   *   @param[callback @func[
   *     @args[
   *       @param[messageBuffer String]
   *     ]
   *   ]]
   * ]
   */
  withMessageBuffer: function(opts, callback) {
    if (this._asyncPending) {
      this._deferredCalls.push(
        this.withMessageBuffer.bind(this, opts, callback));
      return;
    }

    this._ensureBodyWithOpts(opts);
    callback(this._mcomposer._outputBuffer);
  },
};

}); // end define
;