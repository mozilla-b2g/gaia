
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
 * Process text/plain message bodies for quoting / signatures.
 *
 * We have two main goals in our processing:
 *
 * 1) Improve display by being able to automatically collapse excessively quoted
 * blocks and large/redundant signature blocks and hide them entirely from snippet
 * generation.
 *
 * 2) Allow us to reply to messages and provide automatically limited quoting.
 * Specifically, we want to provide one message's worth of context when replying
 * to a message.  We also want to avoid messages in a thread indefinitely
 * growing in size because all users keep replying and leaving default quoting
 * intact.
 *
 *
 **/

define('mailapi/quotechew',
  [
    'exports'
  ],
  function(
    exports
  ) {

////////////////////////////////////////////////////////////////////////////////
// Content Type Encoding
//
// We encode content type values as integers in an attempt to have the serialized
// form not be super huge and be pretty quick to check without generating garbage
// objects.
//
// The low-order nibble encodes the type for styling purposes; everything above
// that nibble is per-type and may encode integer values or use hot bits to
// indicate type.

/**
 * Actual content of the message written by the user.
 */
var CT_AUTHORED_CONTENT = 0x1;
/**
 * Niceties like greetings/thanking someone/etc.  These are things that we want to
 * show when displaying the message, but that arguably are of lower importance and
 * might want to be elided for snippet purposes, etc.
 */
var CT_AUTHORED_NICETIES = 0x11;
/**
 * The signature of the message author; might contain useful information in it.
 */
var CT_SIGNATURE = 0x2;

/**
 * The line that says "Blah wrote:" that precedes a quote.  It's not part of the
 * user content, but it's also not part of the quote.
 */
var CT_LEADIN_TO_QUOTE = 0x3;

var CT_QUOTED_TYPE = 0x4;

/**
 * A quoted reply; eligible for collapsing.  Depth of quoting will also be
 * encoded in the actual integer value.
 */
var CT_QUOTED_REPLY = 0x14;
/**
 * A quoted forwarded message; we would guess that the user has not previously seen
 * the message and the quote wants to be displayed.
 */
var CT_QUOTED_FORWARD = 0x24;
/**
 * Quoted content that has not been pruned.  Aspirational!
 */
var CT_QUOTED_IN_ENTIRETY = 0x40;
/**
 * The quote has been subjected to some level of manual intervention. Aspirational!
 */
var CT_QUOTED_GARDENED = 0x80;

var CT_QUOTE_DEPTH_MASK = 0xff00;

/**
 * Legal-ish boilerplate about how it's only for the recipient, etc. etc.
 * Generally going to be long and boring.
 */
var CT_BOILERPLATE_DISCLAIMER = 0x5;
/**
 * Boilerplate about the message coming from a mailing list, info about the
 * mailing list.
 */
var CT_BOILERPLATE_LIST_INFO = 0x6;
/**
 * Product branding boilerplate that may or may not indicate that the composing
 * device was a mobile device (which is useful).
 */
var CT_BOILERPLATE_PRODUCT = 0x7;
/**
 * Advertising automatically inserted by the mailing list or free e-mailing service,
 * etc.  This is assumed to be boring.
 */
var CT_BOILERPLATE_ADS = 0x8;

var CHARCODE_GT = ('>').charCodeAt(0),
    CHARCODE_SPACE = (' ').charCodeAt(0),
    CHARCODE_NBSP = ('\xa0').charCodeAt(0),
    CHARCODE_NEWLINE = ('\n').charCodeAt(0);

var RE_ORIG_MESAGE_DELIM = /^-{5} Original Message -{5}$/;

var RE_ALL_WS = /^\s+$/;

var RE_SECTION_DELIM = /^[_-]{6,}$/;

var RE_LIST_BOILER = /mailing list$/;

var RE_WROTE_LINE = /wrote/;

var RE_SIGNATURE_LINE = /^-- $/;

/**
 * The maximum number of lines that can be in a boilerplate chunk.  We expect
 * disclaimer boilerplate to be what drives this.
 */
var MAX_BOILERPLATE_LINES = 20;

/**
 * Catch various common well-known product branding lines:
 * - "Sent from my iPhone/iPad/mobile device".  Apple, others.
 * - "Sent from my Android ...".  Common prefix for wildly varying Android
 *     strings.
 * - "Sent from my ...".  And there are others that don't match the above but
 *     that match the prefix.
 * - "Sent from Mobile"
 */
var RE_PRODUCT_BOILER = /^(?:Sent from (?:Mobile|my .+))$/;

var RE_LEGAL_BOILER_START = /^(?:This message|Este mensaje)/;

function indexOfDefault(string, search, startIndex, defVal) {
  var idx = string.indexOf(search, startIndex);
  if (idx === -1)
    return defVal;
  return idx;
}

var NEWLINE = '\n', RE_NEWLINE = /\n/g;

function countNewlinesInRegion(string, startIndex, endIndex) {
  var idx = startIndex - 1, count = 0;
  for (;;) {
    idx = string.indexOf(NEWLINE, idx + 1);
    if (idx === -1 || idx >= endIndex)
      return count;
    count++;
  }
  return null;
}

/**
 * Process the contents of a text body for quoting purposes.
 *
 * Key behaviors:
 *
 * - Whitespace is trimmed at the boundaries of regions.  Our CSS styling will
 *   take care of making sure there is appropriate whitespace.  This is an
 *   intentional normalization that should cover both people who fail to put
 *   whitespace in their messages (jerks) and people who put whitespace in.
 *
 * - Newlines are maintained inside of blocks.
 *
 * - We look backwards for boilerplate blocks once we encounter the first quote
 *   block or the end of the message.  We keep incrementally looking backwards
 *   until we reach something that we don't think is boilerplate.
 */
exports.quoteProcessTextBody = function quoteProcessTextBody(fullBodyText) {
  var contentRep = [];
  var line;
  /**
   * Count the number of '>' quoting characters in the line, mutating `line` to
   * not include the quoting characters.  Some clients will place a single space
   * between each '>' at higher depths, and we support that.  But any more spaces
   * than that and we decide we've reached the end of the quote marker.
   */
  function countQuoteDepthAndNormalize() {
    // We know that the first character is a '>' already.
    var count = 1;
    var lastStartOffset = 1, spaceOk = true;

    for (var i = 1; i < line.length; i++) {
      var c = line.charCodeAt(i);
      if (c === CHARCODE_GT) {
        count++;
        lastStartOffset++;
        spaceOk = true;
      }
      else if (c === CHARCODE_SPACE) {
        if (!spaceOk)
          break;
        lastStartOffset++;
        spaceOk = false;
      }
      else {
        break;
      }
    }
    if (lastStartOffset)
      line = line.substring(lastStartOffset);
    return count;
  }

  /**
   * Scan backwards line-by-line through a chunk of text looking for boilerplate
   * chunks.  We can stop once we determine we're not in boilerplate.
   *
   * - Product blurbs must be the first non-whitespace line seen to be detected;
   *   they do not have to be delimited by an ASCII line.
   *
   * - Legal boilerplate must be delimited by an ASCII line.
   */
  function lookBackwardsForBoilerplate(chunk) {
    var idxLineStart, idxLineEnd, line,
        idxRegionEnd = chunk.length,
        scanLinesLeft = MAX_BOILERPLATE_LINES,
        sawNonWhitespaceLine = false,
        lastContentLine = null,
        lastBoilerplateStart = null,
        sawProduct = false,
        insertAt = contentRep.length;

    function pushBoilerplate(contentType, merge) {
      var boilerChunk = chunk.substring(idxLineStart, idxRegionEnd);
      var idxChunkEnd = idxLineStart - 1;
      // We used to do a trimRight here, but that would eat spaces in addition
      // to newlines.  This was undesirable for both roundtripping purposes and
      // mainly because the "-- " signature marker has a significant space
      // character on the end there.
      while (chunk.charCodeAt(idxChunkEnd - 1) === CHARCODE_NEWLINE) {
        idxChunkEnd--;
      }
      var newChunk = chunk.substring(0, idxChunkEnd);
      var ate = countNewlinesInRegion(chunk, newChunk.length, idxLineStart - 1);
      chunk = newChunk;
      idxRegionEnd = chunk.length;

      if (!merge) {
        contentRep.splice(insertAt, 0,
                          ((ate&0xff) << 8) | contentType,
                          boilerChunk);
      }
      else {
        // nb: this merge does not properly reuse the previous existing 'ate'
        // value; if we start doing more complex merges, the hardcoded '\n'
        // below will need to be computed.
        contentRep[insertAt] = ((ate&0xff) << 8) | (contentRep[insertAt]&0xff);
        contentRep[insertAt + 1] = boilerChunk + '\n' +
                                     contentRep[insertAt + 1];
      }

      sawNonWhitespaceLine = false;
      scanLinesLeft = MAX_BOILERPLATE_LINES;
      lastContentLine = null;
      lastBoilerplateStart = idxLineStart;
    }

    for (idxLineStart = chunk.lastIndexOf('\n') + 1,
           idxLineEnd = chunk.length;
         idxLineEnd > 0 && scanLinesLeft;
         idxLineEnd = idxLineStart - 1,
           idxLineStart = chunk.lastIndexOf('\n', idxLineEnd - 1) + 1,
           scanLinesLeft--) {

      // (do not include the newline character)
      line = chunk.substring(idxLineStart, idxLineEnd);

      // - Skip whitespace lines.
      if (!line.length ||
          (line.length === 1 && line.charCodeAt(0) === CHARCODE_NBSP))
        continue;

      // - Explicit signature demarcation
      if (RE_SIGNATURE_LINE.test(line)) {
        // Check if this is just tagging something we decided was boilerplate in
        // a proper signature wrapper.  If so, then execute a boilerplate merge.
        if (idxLineEnd + 1 === lastBoilerplateStart) {
          pushBoilerplate(null, true);
        }
        else {
          pushBoilerplate(CT_SIGNATURE);
        }
        continue;
      }

      // - Section delimiter; try and classify what lives in this section
      if (RE_SECTION_DELIM.test(line)) {
        if (lastContentLine) {
          // - Look for a legal disclaimer sequentially following the line.
          if (RE_LEGAL_BOILER_START.test(lastContentLine)) {
            pushBoilerplate(CT_BOILERPLATE_DISCLAIMER);
            continue;
          }
          // - Look for mailing list
          if (RE_LIST_BOILER.test(lastContentLine)) {
            pushBoilerplate(CT_BOILERPLATE_LIST_INFO);
            continue;
          }
        }
        // The section was not boilerplate, so thus ends the reign of
        // boilerplate.  Bail.
        return chunk;
      }
      // - A line with content!
      if (!sawNonWhitespaceLine) {
        // - Product boilerplate (must be first/only non-whitespace line)
        if (!sawProduct && RE_PRODUCT_BOILER.test(line)) {
          pushBoilerplate(CT_BOILERPLATE_PRODUCT);
          sawProduct = true;
          continue;
        }
        sawNonWhitespaceLine = true;
      }
      lastContentLine = line;
    }

    return chunk;
  }

  /**
   * Assume that we are in a content region and that all variables are proper.
   */
  function pushContent(considerForBoilerplate, upToPoint, forcePostLine) {
    if (idxRegionStart === null) {
      if (atePreLines) {
        // decrement atePreLines if we are not the first chunk because then we get
        // an implicit/free newline.
        if (contentRep.length)
          atePreLines--;
        contentRep.push((atePreLines&0xff) << 8 | CT_AUTHORED_CONTENT);
        contentRep.push('');
      }
    }
    else {
      if (upToPoint === undefined)
        upToPoint = idxLineStart;

      var chunk = fullBodyText.substring(idxRegionStart,
                                         idxLastNonWhitespaceLineEnd);
      var atePostLines = forcePostLine ? 1 : 0;
      if (idxLastNonWhitespaceLineEnd + 1 !== upToPoint) {
        // We want to count the number of newlines after the newline that
        // belongs to the last non-meaningful-whitespace line up to the
        // effective point.  If we saw a lead-in, the effective point is
        // preceding the lead-in line's newline.  Otherwise it is the start point
        // of the current line.
        atePostLines += countNewlinesInRegion(fullBodyText,
                                              idxLastNonWhitespaceLineEnd + 1,
                                              upToPoint);
      }
      contentRep.push(((atePreLines&0xff) << 8) | ((atePostLines&0xff) << 16) |
                      CT_AUTHORED_CONTENT);
      var iChunk = contentRep.push(chunk) - 1;

      if (considerForBoilerplate) {
        var newChunk = lookBackwardsForBoilerplate(chunk);
        if (chunk.length !== newChunk.length) {
          // Propagate any atePost lines.
          if (atePostLines) {
            var iLastMeta = contentRep.length - 2;
            // We can blindly write post-lines since boilerplate currently
            // doesn't infer any post-newlines on its own.
            contentRep[iLastMeta] = ((atePostLines&0xff) << 16) |
                                    contentRep[iLastMeta];
            contentRep[iChunk - 1] = ((atePreLines&0xff) << 8) |
                                     CT_AUTHORED_CONTENT;
          }

          // If we completely processed the chunk into boilerplate, then we can
          // remove it after propagating any pre-eat amount.
          if (!newChunk.length) {
            if (atePreLines) {
              var bpAte = (contentRep[iChunk + 1] >> 8)&0xff;
              bpAte += atePreLines;
              contentRep[iChunk + 1] = ((bpAte&0xff) << 8) |
                                       (contentRep[iChunk + 1]&0xffff00ff);
            }
            contentRep.splice(iChunk - 1, 2);
          }
          else {
            contentRep[iChunk] = newChunk;
          }
        }
      }
    }

    atePreLines = 0;
    idxRegionStart = null;
    lastNonWhitespaceLine = null;
    idxLastNonWhitespaceLineEnd = null;
    idxPrevLastNonWhitespaceLineEnd = null;
  }

  function pushQuote(newQuoteDepth) {
    var atePostLines = 0;
    // Discard empty lines at the end.  We already skipped adding blank lines, so
    // no need to do the front side.
    while (quoteRunLines.length &&
           !quoteRunLines[quoteRunLines.length - 1]) {
      quoteRunLines.pop();
      atePostLines++;
    }
    contentRep.push(((atePostLines&0xff) << 24) |
                    ((ateQuoteLines&0xff) << 16) |
                    ((inQuoteDepth - 1) << 8) |
                    CT_QUOTED_REPLY);
    contentRep.push(quoteRunLines.join('\n'));
    inQuoteDepth = newQuoteDepth;
    if (inQuoteDepth)
      quoteRunLines = [];
    else
      quoteRunLines = null;

    ateQuoteLines = 0;
    generatedQuoteBlock = true;
  }

  // == On indices and newlines
  // Our line ends always point at the newline for the line; for the last line
  // in the body, there may be no newline, but that doesn't matter since substring
  // is fine with us asking for more than it has.


  var idxLineStart, idxLineEnd, bodyLength = fullBodyText.length,
      // null means we are looking for a non-whitespace line.
      idxRegionStart = null,
      curRegionType = null,
      lastNonWhitespaceLine = null,
      // The index of the last non-purely whitespace line.
      idxLastNonWhitespaceLineEnd = null,
      // value of idxLastNonWhitespaceLineEnd prior to its current value
      idxPrevLastNonWhitespaceLineEnd = null,
      //
      inQuoteDepth = 0,
      quoteRunLines = null,
      contentType = null,
      generatedQuoteBlock = false,
      atePreLines = 0, ateQuoteLines = 0;
  for (idxLineStart = 0,
         idxLineEnd = indexOfDefault(fullBodyText, '\n', idxLineStart,
                                     fullBodyText.length);
       idxLineStart < bodyLength;
       idxLineStart = idxLineEnd + 1,
         idxLineEnd = indexOfDefault(fullBodyText, '\n', idxLineStart,
                                     fullBodyText.length)) {

    line = fullBodyText.substring(idxLineStart, idxLineEnd);

    // - Do not process purely whitespace lines.
    // Because our content runs are treated as regions, ignoring whitespace
    // lines simply means that we don't start or end content blocks on blank
    // lines.  Blank lines in the middle of a content block are maintained
    // because our slice will include them.
    if (!line.length ||
        (line.length === 1
         && line.charCodeAt(0) === CHARCODE_NBSP)) {
      if (inQuoteDepth)
        pushQuote(0);
      if (idxRegionStart === null)
        atePreLines++;
      continue;
    }

    if (line.charCodeAt(0) === CHARCODE_GT) {
      var lineDepth = countQuoteDepthAndNormalize();
      // We are transitioning into a quote state...
      if (!inQuoteDepth) {
        // - Check for a "Blah wrote:" content line
        if (lastNonWhitespaceLine &&
            RE_WROTE_LINE.test(lastNonWhitespaceLine)) {

          // count the newlines up to the lead-in's newline
          var upToPoint = idxLastNonWhitespaceLineEnd;
          idxLastNonWhitespaceLineEnd = idxPrevLastNonWhitespaceLineEnd;
          // Nuke the content region if the lead-in was the start of the region;
          // this can be inferred by there being no prior content line.
          if (idxLastNonWhitespaceLineEnd === null)
            idxRegionStart = null;

          var leadin = lastNonWhitespaceLine;
          pushContent(!generatedQuoteBlock, upToPoint);
          var leadinNewlines = 0;
          if (upToPoint + 1 !== idxLineStart)
            leadinNewlines = countNewlinesInRegion(fullBodyText,
                                                   upToPoint + 1, idxLineStart);
          contentRep.push((leadinNewlines << 8) | CT_LEADIN_TO_QUOTE);
          contentRep.push(leadin);
        }
        else {
          pushContent(!generatedQuoteBlock);
        }
        quoteRunLines = [];
        inQuoteDepth = lineDepth;
      }
      // There is a change in quote depth
      else if (lineDepth !== inQuoteDepth) {
        pushQuote(lineDepth);
      }

      // Eat whitespace lines until we get a non-whitespace (quoted) line.
      if (quoteRunLines.length || line.length)
        quoteRunLines.push(line);
      else
        ateQuoteLines++;
    }
    else {
      if (inQuoteDepth) {
        pushQuote(0);
        idxLastNonWhitespaceLineEnd = null;
      }
      if (idxRegionStart === null)
        idxRegionStart = idxLineStart;

      lastNonWhitespaceLine = line;
      idxPrevLastNonWhitespaceLineEnd = idxLastNonWhitespaceLineEnd;
      idxLastNonWhitespaceLineEnd = idxLineEnd;
    }
  }
  if (inQuoteDepth) {
    pushQuote(0);
  }
  else {
    // There is no implicit newline for the final block, so force it if we had
    // a newline.
    pushContent(true, fullBodyText.length,
                (fullBodyText.charCodeAt(fullBodyText.length - 1) ===
                  CHARCODE_NEWLINE));
  }

  return contentRep;
};

/**
 * The maximum number of characters to shrink the snippet to try and find a
 * whitespace boundary.  If it would take more characters than this, we just
 * do a hard truncation and hope things work out visually.
 */
var MAX_WORD_SHRINK = 8;

var RE_NORMALIZE_WHITESPACE = /\s+/g;

/**
 * Derive the snippet for a message from its processed body representation.  We
 * take the snippet from the first non-empty content block, normalizing
 * all whitespace to a single space character for each instance, then truncate
 * with a minor attempt to align on word boundaries.
 */
exports.generateSnippet = function generateSnippet(rep, desiredLength) {
  for (var i = 0; i < rep.length; i += 2) {
    var etype = rep[i]&0xf, block = rep[i + 1];
    switch (etype) {
      case CT_AUTHORED_CONTENT:
        if (!block.length)
          break;
        // - truncate
        // (no need to truncate if short)
        if (block.length < desiredLength)
          return block.trim().replace(RE_NORMALIZE_WHITESPACE, ' ');
        // try and truncate on a whitespace boundary
        var idxPrevSpace = block.lastIndexOf(' ', desiredLength);
        if (desiredLength - idxPrevSpace < MAX_WORD_SHRINK)
          return block.substring(0, idxPrevSpace).trim()
                      .replace(RE_NORMALIZE_WHITESPACE, ' ');
        return block.substring(0, desiredLength).trim()
                    .replace(RE_NORMALIZE_WHITESPACE, ' ');
    }
  }

  return '';
};

/**
 * What is the deepest quoting level that we should repeat?  Our goal is not to be
 * the arbiter of style, but to provide a way to bound message growth in the face
 * of reply styles where humans do not manually edit quotes.
 *
 * We accept depth levels up to 5 mainly because a quick perusal of mozilla lists
 * shows cases where 5 levels of nesting were used to provide useful context.
 */
var MAX_QUOTE_REPEAT_DEPTH = 5;
// we include a few more than we need for forwarded text regeneration
var replyQuotePrefixStrings = [
  '> ', '>> ', '>>> ', '>>>> ', '>>>>> ', '>>>>>> ', '>>>>>>> ', '>>>>>>>> ',
  '>>>>>>>>> ',
];
var replyQuotePrefixStringsNoSpace = [
  '>', '>>', '>>>', '>>>>', '>>>>>', '>>>>>>', '>>>>>>>', '>>>>>>>>',
  '>>>>>>>>>',
];
var replyQuoteNewlineReplaceStrings = [
  '\n> ', '\n>> ', '\n>>> ', '\n>>>> ', '\n>>>>> ', '\n>>>>>> ', '\n>>>>>>> ',
  '\n>>>>>>>> ',
];
var replyQuoteNewlineReplaceStringsNoSpace = [
  '\n>', '\n>>', '\n>>>', '\n>>>>', '\n>>>>>', '\n>>>>>>', '\n>>>>>>>',
  '\n>>>>>>>>',
];
var replyPrefix = '> ', replyNewlineReplace = '\n> ';

function expandQuotedPrefix(s, depth) {
  if (s.charCodeAt(0) === CHARCODE_NEWLINE)
    return replyQuotePrefixStringsNoSpace[depth];
  return replyQuotePrefixStrings[depth];
}

/**
 * Expand a quoted block so that it has the right number of greater than signs
 * and inserted whitespace where appropriate.  (Blank lines don't want
 * whitespace injected.)
 */
function expandQuoted(s, depth) {
  var ws = replyQuoteNewlineReplaceStrings[depth],
      nows = replyQuoteNewlineReplaceStringsNoSpace[depth];
  return s.replace(RE_NEWLINE, function(m, idx) {
    if (s.charCodeAt(idx+1) === CHARCODE_NEWLINE)
      return nows;
    else
      return ws;
  });
}

/**
 * Generate a text message reply given an already quote-processed body.  We do
 * not simply '>'-prefix everything because 1) we don't store the raw message
 * text because it's faster for us to not quote-process everything every time we
 * display a message, 2) we want to strip some stuff out, 3) we don't care about
 * providing a verbatim quote.
 */
exports.generateReplyText = function generateReplyText(rep) {
  var strBits = [];
  for (var i = 0; i < rep.length; i += 2) {
    var etype = rep[i]&0xf, block = rep[i + 1];
    switch (etype) {
      case CT_AUTHORED_CONTENT:
      case CT_SIGNATURE:
      case CT_LEADIN_TO_QUOTE:
        strBits.push(expandQuotedPrefix(block, 0));
        strBits.push(expandQuoted(block, 0));
        break;
      case CT_QUOTED_TYPE:
        var depth = ((rep[i] >> 8)&0xff) + 1;
        if (depth < MAX_QUOTE_REPEAT_DEPTH) {
          strBits.push(expandQuotedPrefix(block, depth));
          strBits.push(expandQuoted(block, depth));
        }
        break;
      // -- eat boilerplate!
      // No one needs to read boilerplate in a reply; the point is to
      // provide context, not the whole message.  (Forward the message if
      // you want the whole thing!)
      case CT_BOILERPLATE_DISCLAIMER:
      case CT_BOILERPLATE_LIST_INFO:
      case CT_BOILERPLATE_PRODUCT:
      case CT_BOILERPLATE_ADS:
        break;
    }
  }

  return strBits.join('');
};

/**
 * Regenerate the text of a message for forwarding.  'Original Message' is not
 * prepended and information about the message's header is not prepended.  That
 * is done in `generateForwardMessage`.
 *
 * We attempt to generate a message as close to the original message as
 * possible, but it doesn't have to be 100%.
 */
exports.generateForwardBodyText = function generateForwardBodyText(rep) {
  var strBits = [], nl;

  for (var i = 0; i < rep.length; i += 2) {
    if (i)
      strBits.push(NEWLINE);

    var etype = rep[i]&0xf, block = rep[i + 1];
    switch (etype) {
      // - injected with restored whitespace
      case CT_AUTHORED_CONTENT:
        // pre-newlines
        for (nl = (rep[i] >> 8)&0xff; nl; nl--)
          strBits.push(NEWLINE);
        strBits.push(block);
        // post new-lines
        for (nl = (rep[i] >> 16)&0xff; nl; nl--)
          strBits.push(NEWLINE);
        break;
      case CT_LEADIN_TO_QUOTE:
        strBits.push(block);
        for (nl = (rep[i] >> 8)&0xff; nl; nl--)
          strBits.push(NEWLINE);
        break;
      // - injected verbatim,
      case CT_SIGNATURE:
      case CT_BOILERPLATE_DISCLAIMER:
      case CT_BOILERPLATE_LIST_INFO:
      case CT_BOILERPLATE_PRODUCT:
      case CT_BOILERPLATE_ADS:
        for (nl = (rep[i] >> 8)&0xff; nl; nl--)
          strBits.push(NEWLINE);
        strBits.push(block);
        for (nl = (rep[i] >> 16)&0xff; nl; nl--)
          strBits.push(NEWLINE);
        break;
      // - quote character reconstruction
      // this is not guaranteed to round-trip since we assume the non-whitespace
      // variant...
      case CT_QUOTED_TYPE:
        var depth = Math.min((rep[i] >> 8)&0xff, 8);
        for (nl = (rep[i] >> 16)&0xff; nl; nl--) {
          strBits.push(replyQuotePrefixStringsNoSpace[depth]);
          strBits.push(NEWLINE);
        }
        strBits.push(expandQuotedPrefix(block, depth));
        strBits.push(expandQuoted(block, depth));
        for (nl = (rep[i] >> 24)&0xff; nl; nl--) {
          strBits.push(NEWLINE);
          strBits.push(replyQuotePrefixStringsNoSpace[depth]);
        }
        break;
    }
  }

  return strBits.join('');
};

}); // end define
;
// UMD boilerplate to work across node/AMD/naked browser:
// https://github.com/umdjs/umd
(function (root, factory) {
    if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define('bleach',factory);
    } else {
        // Browser globals
        root.Bleach = factory();
    }
}(this, function () {

var ALLOWED_TAGS = [
    'a',
    'abbr',
    'acronym',
    'b',
    'blockquote',
    'code',
    'em',
    'i',
    'li',
    'ol',
    'strong',
    'ul'
];
var ALLOWED_ATTRIBUTES = {
    'a': ['href', 'title'],
    'abbr': ['title'],
    'acronym': ['title']
};
var ALLOWED_STYLES = [];

var Node = {
  ELEMENT_NODE                :  1,
  ATTRIBUTE_NODE              :  2,
  TEXT_NODE                   :  3,
  CDATA_SECTION_NODE          :  4,
  ENTITY_REFERENCE_NODE       :  5,
  ENTITY_NODE                 :  6,
  PROCESSING_INSTRUCTION_NODE :  7,
  COMMENT_NODE                :  8,
  DOCUMENT_NODE               :  9,
  DOCUMENT_TYPE_NODE          : 10,
  DOCUMENT_FRAGMENT_NODE      : 11,
  NOTATION_NODE               : 12
};

var DEFAULTS = {
  tags: ALLOWED_TAGS,
  prune: [],
  attributes: ALLOWED_ATTRIBUTES,
  styles: ALLOWED_STYLES,
  strip: false,
  stripComments: true
};

var bleach = {};

bleach._preCleanNodeHack = null;

// This is for web purposes; node will clobber this with 'jsdom'.
bleach.documentConstructor = function() {
  // Per hsivonen, this creates a document flagged as "loaded as data" which is
  // desirable for safety reasons as it avoids pre-fetches, etc.
  return document.implementation.createHTMLDocument('');
};

/**
 * Clean a string.
 */
bleach.clean = function (html, opts) {
  if (!html) return '';

  var document = bleach.documentConstructor(),
      dirty = document.createElement('dirty');

  // To get stylesheets parsed by Gecko, we need to put the node in a document.
  document.body.appendChild(dirty);
  dirty.innerHTML = html;

  if (bleach._preCleanNodeHack)
    bleach._preCleanNodeHack(dirty, html);
  bleach.cleanNode(dirty, opts);

  var asNode = opts && opts.hasOwnProperty("asNode") && opts.asNode;
  if (asNode)
    return dirty;
  return dirty.innerHTML;
};

/**
 * Clean the children of a node, but not the node itself.  Maybe this is
 * a bad idea.
 */
bleach.cleanNode = function(dirtyNode, opts) {
  var document = dirtyNode.ownerDocument;
  opts = opts || DEFAULTS;
  var doStrip = opts.hasOwnProperty('strip') ? opts.strip : DEFAULTS.strip,
      doStripComments = opts.hasOwnProperty('stripComments') ?
                          opts.stripComments : DEFAULTS.stripComments,
      allowedTags = opts.hasOwnProperty('tags') ? opts.tags : DEFAULTS.tags,
      pruneTags = opts.hasOwnProperty('prune') ? opts.prune : DEFAULTS.prune,
      attrsByTag = opts.hasOwnProperty('attributes') ? opts.attributes
                                                     : DEFAULTS.attributes,
      allowedStyles = opts.hasOwnProperty('styles') ? opts.styles
                                                    : DEFAULTS.styles,
      reCallbackOnTag = opts.hasOwnProperty('callbackRegexp') ? opts.callbackRegexp
                                                              : null,
      reCallback = reCallbackOnTag && opts.callback,
      wildAttrs;
  if (Array.isArray(attrsByTag)) {
    wildAttrs = attrsByTag;
    attrsByTag = {};
  }
  else if (attrsByTag.hasOwnProperty('*')) {
    wildAttrs = attrsByTag['*'];
  }
  else {
    wildAttrs = [];
  }

  function slashAndBurn(root, callback) {
    var child, i = 0;
    // console.log('slashing');
    // console.log('type ', root.nodeType);
    // console.log('value', root.nodeValue||['<',root.tagName,'>'].join(''));
    // console.log('innerHTML', root.innerHTML);
    // console.log('--------');

    // TODO: investigate whether .nextSibling is faster/more GC friendly
    while ((child = root.childNodes[i++])) {
      if (child.nodeType === 8 && doStripComments) {
        root.removeChild(child);
        continue;
      }
      if (child.nodeType === 1) {
        var tag = child.tagName.toLowerCase();
        if (allowedTags.indexOf(tag) === -1) {
          // The tag is not in the whitelist.

          // Strip?
          if (doStrip) {
            // Should this tag and its children be pruned?
            // (This is not the default because new HTML tags with semantic
            // meaning can be added and should not cause content to disappear.)
            if (pruneTags.indexOf(tag) !== -1) {
              root.removeChild(child);
              // This will have shifted the sibling down, so decrement so we hit
              // it next.
              i--;
            }
            // Not pruning, so move the children up.
            else {
              while (child.firstChild) {
                root.insertBefore(child.firstChild, child);
              }
              root.removeChild(child);
              // We want to make sure we process all of the children, so
              // decrement.  Alternately, we could have called slashAndBurn
              // on 'child' before splicing in the contents.
              i--;
            }
          }
          // Otherwise, quote the child.
          // Unit tests do not indicate if this should be recursive or not,
          // so it's not.
          else {
            var textNode = document.createTextNode(child.outerHTML);
            // jsdom bug? creating a text node always adds a linebreak;
            textNode.nodeValue = textNode.nodeValue.replace(/\n$/, '');
            root.replaceChild(textNode, child);
          }
          continue;
        }

        // If a callback was specified and it matches the tag name, then invoke
        // the callback.  This happens before the attribute filtering so that
        // the function can observe dangerous attributes, but in the event of
        // the (silent) failure of this function, they will still be safely
        // removed.
        if (reCallbackOnTag && reCallbackOnTag.test(tag)) {
          reCallback(child, tag);
        }

        var styles, iStyle, decl;
        // Style tags are special.  Their parsed state gets represented on
        // "sheet" iff the node is linked into a document (on gecko).  We can
        // manipulate the representation but it does *not* automatically
        // reflect into the textContent of the style tag.  Accordingly, we
        //
        if (tag === 'style') {
          var sheet = child.sheet,
              rules = sheet.cssRules,
              keepRulesCssTexts = [];

          for (var iRule = 0; iRule < rules.length; iRule++) {
            var rule = rules[iRule];
            if (rule.type !== 1) { // STYLE_RULE
              // we could do "sheet.deleteRule(iRule);" but there is no benefit
              // since we will just clobber the textContent without this skipped
              // rule.
              continue;
            }
            styles = rule.style;
            for (iStyle = styles.length - 1; iStyle >= 0; iStyle--) {
              decl = styles[iStyle];
              if (allowedStyles.indexOf(decl) === -1) {
                styles.removeProperty(decl);
              }
            }
            keepRulesCssTexts.push(rule.cssText);
          }
          child.textContent = keepRulesCssTexts.join('\n');
        }

        if (child.style.length) {
          styles = child.style;
          for (iStyle = styles.length - 1; iStyle >= 0; iStyle--) {
            decl = styles[iStyle];
            if (allowedStyles.indexOf(decl) === -1) {
              styles.removeProperty(decl);
            }
          }
        }

        if (child.attributes.length) {
          var attrs = child.attributes;
          for (var iAttr = attrs.length - 1; iAttr >= 0; iAttr--) {
            var attr = attrs[iAttr];
            var whitelist = attrsByTag[tag];
            attr = attr.nodeName;
            if (wildAttrs.indexOf(attr) === -1 &&
                (!whitelist || whitelist.indexOf(attr) === -1)) {
              attrs.removeNamedItem(attr);
            }
          }
        }
      }
      slashAndBurn(child, callback);
    }
  }
  slashAndBurn(dirtyNode);
};

return bleach;

})); // close out UMD boilerplate
;
/**
 * Process text/html for message body purposes.  Specifically:
 *
 * - sanitize HTML (using bleach.js): discard illegal markup entirely, render
 *   legal but 'regulated' markup inert (ex: links to external content).
 * - TODO: perform normalization of quote markup from different clients into
 *   blockquotes, like how Thunderbird conversations does it.
 * - snippet generation: Try and generate a usable snippet string from something
 *   that is not a quote.
 *
 * We may eventually try and perform more detailed analysis like `quotechew.js`
 * does with structured markup, potentially by calling out to quotechew, but
 * that's a tall order to get right, so it's mightily postponed.
 **/

define('mailapi/htmlchew',
  [
    'exports',
    'bleach'
  ],
  function(
    exports,
    $bleach
  ) {

/**
 * Whitelisted HTML tags list. Currently from nsTreeSanitizer.cpp which credits
 * Mark Pilgrim and Sam Ruby for its own initial whitelist.
 *
 * IMPORTANT THUNDERBIRD NOTE: Thunderbird only engages its sanitization logic
 * when processing mailto URIs, when the non-default
 * "view | message body as | simple html" setting is selected, or when
 * displaying spam messages.  Accordingly, the settings are pretty strict
 * and not particularly thought-out.  Non-CSS presentation is stripped, which
 * is pretty much the lingua franca of e-mail.  (Thunderbird itself generates
 * font tags, for example.)
 *
 * Some things are just not in the list at all:
 * - SVG: Thunderbird nukes these itself because it forces
 *   SanitizerCidEmbedsOnly which causes flattening of everything in the SVG
 *   namespace.
 *
 * Tags that we are opting not to include will be commented with a reason tag:
 * - annoying: This thing is ruled out currently because it only allows annoying
 *   things to happen *given our current capabilities*.
 * - scripty: This thing requires scripting to make anything happen, and we do
 *   not allow scripting.
 * - forms: We have no UI to expose the target of a form right now, so it's
 *   not safe.  Thunderbird displays a scam warning, which isn't realy a big
 *   help, but it's something.  Because forms are largely unsupported or just
 *   broken in many places, they are rarely used, so we are turning them off
 *   entirely.
 * - implicitly-nuked: killed as part of the parse process because we assign
 *   to innerHTML rather than creating a document with the string in it.
 * - inline-style-only: Styles have to be included in the document itself,
 *   and for now, on the elements themselves.  We now support <style> tags
 *   (although src will be sanitized off), but not <link> tags because they want
 *   to reference external stuff.
 * - dangerous: The semantics of the tag are intentionally at odds with our
 *   goals and/or are extensible.  (ex: link tag.)
 * - interactive-ui: A cross between scripty and forms, things like (HTML5)
 *   menu and command imply some type of mutation that requires scripting.
 *   They also are frequently very attribute-heavy.
 * - svg: it's SVG, we don't support it yet!
 */
var LEGAL_TAGS = [
  'a', 'abbr', 'acronym', 'area', 'article', 'aside',
  // annoying: 'audio',
  'b',
  'bdi', 'bdo', // (bidirectional markup stuff)
  'big', 'blockquote',
  // implicitly-nuked: 'body'
  'br',
  // forms: 'button',
  // scripty: canvas
  'caption',
  'center',
  'cite', 'code', 'col', 'colgroup',
  // interactive-ui: 'command',
  // forms: 'datalist',
  'dd', 'del', 'details', 'dfn', 'dir', 'div', 'dl', 'dt',
  'em',
  // forms: 'fieldset' (but allowed by nsTreeSanitizer)
  'figcaption', 'figure',
  'font',
  'footer',
  // forms: 'form',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  // implicitly-nuked: head
  'header', 'hgroup', 'hr',
  // implicitly-nuked: html
  'i', 'img',
  // forms: 'input',
  'ins', // ("represents a range of text that has been inserted to a document")
  'kbd', // ("The kbd element represents user input")
  'label', 'legend', 'li',
  // dangerous, inline-style-only: link
  /* link supports many types, none of which we want, some of which are
   * risky: http://dev.w3.org/html5/spec/links.html#linkTypes. Specifics:
   * - "stylesheet": This would be okay for cid links, but there's no clear
   *   advantage over inline styles, so we forbid it, especially as supporting
   *   it might encourage other implementations to dangerously support link.
   * - "prefetch": Its whole point is de facto information leakage.
   */
  'listing', // (deprecated, like "pre")
  'map', 'mark',
  // interactive-ui: 'menu', 'meta', 'meter',
  'nav',
  'nobr', // (deprecated "white-space:nowrap" equivalent)
  'noscript',
  'ol',
  // forms: 'optgroup',
  // forms: 'option',
  'output', // (HTML5 draft: "result of a calculation in a form")
  'p', 'pre',
  // interactive-ui: 'progress',
  'q',
  /* http://www.w3.org/TR/ruby/ is a pronounciation markup that is not directly
   * supported by gecko at this time (although there is a Firefox extension).
   * All of 'rp', 'rt', and 'ruby' are ruby tags.  The spec also defines 'rb'
   * and 'rbc' tags that nsTreeSanitizer does not whitelist, however.
   */
  'rp', 'rt', 'ruby',
  's', 'samp', 'section',
  // forms: 'select',
  'small',
  // annoying?: 'source',
  'span', 'strike', 'strong',
  'style',
  'sub', 'summary', 'sup',
  // svg: 'svg', NB: this lives in its own namespace
  'table', 'tbody', 'td',
  // forms: 'textarea',
  'tfoot', 'th', 'thead', 'time',
  'title', // XXX does this mean anything outside head?
  'tr',
  // annoying?: 'track'
  'tt',
  'u', 'ul', 'var',
  // annoying: 'video',
  'wbr' // (HTML5 draft: line break opportunity)
];

/**
 * Tags whose children should be removed along with the tag itself, rather than
 * splicing the children into the position originally occupied by the parent.
 *
 * We do this for:
 * - forms; see `LEGAL_TAGS` for the rationale.  Note that we don't bother
 *   including children that should already be nuked by PRUNE_TAGS.  For
 *   example, 'option' and 'optgroup' only make sense under 'select' or
 *   'datalist', so we need not include them.  This means that if the tags
 *   are used in nonsensical positions, they will have their contents
 *   merged into the document text, but that's not a major concern.
 * - 'script': no one wants to read the ignored JS code!
 * - 'style': no one wants to read the CSS we are (currently) ignoring
 */
var PRUNE_TAGS = [
  'button', // (forms)
  'datalist', // (forms)
  'script', // (script)
  'select', // (forms)
  'style', // (style)
  'svg', // (svg)
];

/**
 * What attributes to allow globally and on specific tags.
 *
 * Forbidden marker names:
 * - URL-like: The attribute can contain URL's and we don't care enough to
 *   sanitize the contents right now.
 * - sanitized: We manually do something with the attribute in our processing
 *   logic.
 * - specific: The attribute is explicitly named on the relevant element types.
 * - unsupported: Gecko ignores the attribute and there is no chance of
 *   standardization, so just strip it.
 * - microformat: we can't do anything with microformats right now, save some
 *   space.
 * - awkward: It's not dangerous, but it's not clear how it could have useful
 *   semantics.
 */
var LEGAL_ATTR_MAP = {
  '*': [
    'abbr', // (tables: removed from HTML5)
    // forms: 'accept', 'accept-charset',
    // interactive-ui: 'accesskey',
    // forms: 'action',
    'align', // (pres)
    'alt', // (fallback content)
    // forms: 'autocomplete', 'autofocus',
    // annoying: 'autoplay',
    'axis', // (tables: removed from HTML5)
    // URL-like: 'background',
    'bgcolor', 'border', // (pres)
    'cellpadding', 'cellspacing', // (pres)
    // unsupported: 'char',
    'charoff', // (tables)
    // specific: 'charset'
    // forms, interactive-ui: 'checked',
    // URL-like: 'cite'
    'class', 'clear', 'color', // (pres)
    'cols', 'colspan', // (tables)
    'compact', // (pres)
    // dangerous: 'content', (meta content refresh is bad.)
    // interactive-ui: 'contenteditable', (we already use this ourselves!)
    // interactive-ui: 'contextmenu',
    // annoying: 'controls', (media)
    'coords', // (area image map)
    'datetime', // (ins, del, time semantic markups)
    // forms: 'disabled',
    'dir', // (rtl)
    // interactive-ui: 'draggable',
    // forms: 'enctype',
    'face', // (pres)
    // forms: 'for',
    'frame', // (tables)
    'headers', // (tables)
    'height', // (layout)
    // interactive-ui: 'hidden', 'high',
    // sanitized: 'href',
    // specific: 'hreflang',
    'hspace', // (pres)
    // dangerous: 'http-equiv' (meta refresh, maybe other trickiness)
    // interactive-ui: 'icon',
    // inline-style-only: 'id',
    // specific: 'ismap', (area image map)
    // microformat: 'itemid', 'itemprop', 'itemref', 'itemscope', 'itemtype',
    // annoying: 'kind', (media)
    // annoying, forms, interactive-ui: 'label',
    'lang', // (language support)
    // forms: 'list',
    // dangerous: 'longdesc', (link to a long description, html5 removed)
    // annoying: 'loop',
    // interactive-ui: 'low',
    // forms, interactive-ui: 'max',
    // forms: 'maxlength',
    'media', // (media-query for linky things; safe if links are safe)
    // forms: 'method',
    // forms, interactive-ui: 'min',
    // unsupported: 'moz-do-not-send', (thunderbird internal composition)
    // forms: 'multiple',
    // annoying: 'muted',
    // forms, interactive-ui: 'name', (although pretty safe)
    'nohref', // (image maps)
    // forms: 'novalidate',
    'noshade', // (pres)
    'nowrap', // (tables)
    'open', // (for "details" element)
    // interactive-ui: 'optimum',
    // forms: 'pattern', 'placeholder',
    // annoying: 'playbackrate',
    'pointsize', // (pres)
    // annoying:  'poster', 'preload',
    // forms: 'prompt',
    'pubdate', // ("time" element)
    // forms: 'radiogroup', 'readonly',
    // dangerous: 'rel', (link rel, a rel, area rel)
    // forms: 'required',
    // awkward: 'rev' (reverse link; you can't really link to emails)
    'reversed', // (pres? "ol" reverse numbering)
    // interactive-ui: 'role', We don't want a screen reader making the user
    //   think that part of the e-mail is part of the UI.  (WAI-ARIA defines
    //   "accessible rich internet applications", not content markup.)
    'rows', 'rowspan', 'rules', // (tables)
    // sanitized: 'src',
    'size', // (pres)
    'scope', // (tables)
    // inline-style-only: 'scoped', (on "style" elem)
    // forms: 'selected',
    'shape', // (image maps)
    'span', // (tables)
    // interactive-ui: 'spellcheck',
    // sanitized, dangerous: 'src'
    // annoying: 'srclang',
    'start', // (pres? "ol" numbering)
    'summary', // (tables accessibility)
    'style', // (pres)
    // interactive-ui: 'tabindex',
    // dangerous: 'target', (specifies a browsing context, but our semantics
    //   are extremely clear and don't need help.)
    'title', // (advisory)
    // specific, dangerous: type (various, but mime-type for links is not the
    //   type of thing we would ever want to propagate or potentially deceive
    //   the user with.)
    'valign', // (pres)
    'value', // (pres? "li" override for "ol"; various form uses)
    'vspace', // (pres)
    'width', // (layout)
    // forms: 'wrap',
  ],
  'a': ['ext-href', 'hreflang'],
  'area': ['ext-href', 'hreflang'],
  // these are used by our quoting and Thunderbird's quoting
  'blockquote': ['cite', 'type'],
  'img': ['cid-src', 'ext-src', 'ismap', 'usemap'],
  // This may only end up being used as a debugging thing, but let's let charset
  // through for now.
  'meta': ['charset'],
  'ol': ['type'], // (pres)
  'style': ['type'],
};

/**
 * CSS Style rules to support.
 *
 * nsTreeSanitizer is super lazy about style binding and does not help us out.
 * What it does is nuke all rule types except NAMESPACE (@namespace), FONT_FACE
 * (@font-face), and STYLE rules (actual styling).  This means nuking CHARSET
 * (@charset to specify the encoding of the stylesheet if the server did not
 * provide it), IMPORT (@import to reference other stylesheet files), MEDIA
 * (@media media queries), PAGE (@page page box info for paged media),
 * MOZ_KEYFRAMES, MOZ_KEYFRAME, SUPPORTS (@supports provides support for rules
 * conditioned on browser support, but is at risk.)  The only style directive it
 * nukes is "-moz-binding" which is the XBL magic and considered dangerous.
 *
 * Risks: Anything that takes a url() is dangerous insofar as we need to
 * sanitize the url.  XXX for now we just avoid any style that could potentially
 * hold a URI.
 *
 * Good news: We always cram things into an iframe, so we don't need to worry
 * about clever styling escaping out into our UI.
 *
 * New reasons not to allow:
 * - animation: We don't want or need animated wackiness.
 * - slow: Doing the thing is slow!
 */
var LEGAL_STYLES = [
  // animation: animation*
  // URI-like: background, background-image
  'background-color',
  // NB: border-image is not set by the 'border' aliases
  'border',
  'border-bottom', 'border-bottom-color', 'border-bottom-left-radius',
  'border-bottom-right-radius', 'border-bottom-style', 'border-bottom-width',
  'border-color',
  // URI-like: border-image*
  'border-left', 'border-left-color', 'border-left-style', 'border-left-width',
  'border-radius',
  'border-right', 'border-right-color', 'border-right-style',
  'border-right-width',
  'border-style',
  'border-top', 'border-top-color', 'border-top-left-radius',
  'border-top-right-radius', 'border-top-style', 'border-top-width',
  'border-width',
  // slow: box-shadow
  'clear',
  'color',
  'display',
  'float',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'height',
  'line-height',
  // URI-like: list-style, list-style-image
  'list-style-position',
  'list-style-type',
  'margin', 'margin-bottom', 'margin-left', 'margin-right', 'margin-top',
  'padding', 'padding-bottom', 'padding-left', 'padding-right', 'padding-top',
  'text-align', 'text-align-last',
  'text-decoration', 'text-decoration-color', 'text-decoration-line',
  'text-decoration-style', 'text-indent',
  'vertical-align',
  'white-space',
  'width',
  'word-break', 'word-spacing', 'word-wrap',
];

/**
 * The regular expression to detect nodes that should be passed to stashLinks.
 *
 * ignore-case is not required; the value is checked against the lower-cased tag.
 */
var RE_NODE_NEEDS_TRANSFORM = /^(?:a|area|img)$/;

var RE_CID_URL = /^cid:/i;
var RE_HTTP_URL = /^http(?:s)?/i;
var RE_MAILTO_URL = /^mailto:/i;

var RE_IMG_TAG = /^img$/;

/**
 * Transforms src tags, ensure that links are http and transform them too so
 * that they don't actually navigate when clicked on but we can hook them.  (The
 * HTML display iframe is not intended to navigate; we just want to trigger the
 * browser.
 */
function stashLinks(node, lowerTag) {
  // - img: src
  if (RE_IMG_TAG.test(lowerTag)) {
    var src = node.getAttribute('src');
    if (RE_CID_URL.test(src)) {
      node.classList.add('moz-embedded-image');
      // strip the cid: bit, it is necessarily there and therefore redundant.
      node.setAttribute('cid-src', src.substring(4));
      // 'src' attribute will be removed by whitelist
    }
    else if (RE_HTTP_URL.test(src)) {
      node.classList.add('moz-external-image');
      node.setAttribute('ext-src', src);
      // 'src' attribute will be removed by whitelist
    }
    else {
      // paranoia; no known benefit if this got through
      node.removeAttribute('cid-src');
      node.removeAttribute('ext-src');
    }
  }
  // - a, area: href
  else {
    var link = node.getAttribute('href');
    if (RE_HTTP_URL.test(link) ||
        RE_MAILTO_URL.test(link)) {
      node.classList.add('moz-external-link');
      node.setAttribute('ext-href', link);
      // 'href' attribute will be removed by whitelist
    }
    else {
      // paranoia; no known benefit if this got through
      node.removeAttribute('ext-href');
    }
  }
}

var BLEACH_SETTINGS = {
  tags: LEGAL_TAGS,
  strip: true,
  prune: PRUNE_TAGS,
  attributes: LEGAL_ATTR_MAP,
  styles: LEGAL_STYLES,
  asNode: true,
  callbackRegexp: RE_NODE_NEEDS_TRANSFORM,
  callback: stashLinks
};

/**
 * @args[
 *   @param[htmlString String]{
 *     An unsanitized HTML string.  The HTML content can be a fully valid HTML
 *     document with 'html' and 'body' tags and such, but most of that extra
 *     structure will currently be discarded.
 *
 *     In the future we may try and process the body and such correctly, but for
 *     now we don't.  This is consistent with many webmail clients who ignore
 *     style tags in the head, etc.
 *   }
 * ]
 * @return[HtmlElement]{
 *   The sanitized HTML content wrapped in a div container.
 * }
 */
exports.sanitizeAndNormalizeHtml = function sanitizeAndNormalize(htmlString) {
  var sanitizedNode = $bleach.clean(htmlString, BLEACH_SETTINGS);
  return sanitizedNode;
};

var ELEMENT_NODE = 1, TEXT_NODE = 3;

var RE_NORMALIZE_WHITESPACE = /\s+/g;

/**
 * Derive snippet text from the already-sanitized HTML representation.
 */
exports.generateSnippet = function generateSnippet(sanitizedHtmlNode,
                                                   desiredLength) {
  var snippet = '';

  // Perform a traversal of the DOM tree skipping over things we don't care
  // about.  Whenever we see an element we can descend into, we do so.
  // Whenever we finish processing a node, we move to our next sibling.
  // If there is no next sibling, we move up the tree until there is a next
  // sibling or we hit the top.
  var node = sanitizedHtmlNode.firstChild, done = false;
  if (!node)
    return snippet;
  while (!done) {
    if (node.nodeType === ELEMENT_NODE) {
      switch (node.tagName.toLowerCase()) {
        // - Things that can't contain useful text.
        // Avoid including block-quotes in the snippet.
        case 'blockquote':
        // The style does not belong in the snippet!
        case 'style':
          break;

        default:
          if (node.firstChild) {
            node = node.firstChild;
            continue;
          }
          break;
      }
    }
    else if (node.nodeType === TEXT_NODE) {
      // these text nodes can be ridiculously full of whitespace.  Normalize
      // the whitespace down to one whitespace character.
      var normalizedText =
            node.data.replace(RE_NORMALIZE_WHITESPACE, ' ');
      // If the join would create two adjacents spaces, then skip the one
      // on the thing we are concatenating.
      if (snippet.length && normalizedText[0] === ' ' &&
          snippet[snippet.length - 1] === ' ')
        normalizedText = normalizedText.substring(1);
      snippet += normalizedText;
      if (snippet.length >= desiredLength)
        break; // (exits the loop)
    }

    while (!node.nextSibling) {
      node = node.parentNode;
      if (node === sanitizedHtmlNode) {
        // yeah, a goto or embedding this in a function might have been cleaner
        done = true;
        break;
      }
    }
    if (!done)
      node = node.nextSibling;
  }

  return snippet.substring(0, desiredLength);
};

/**
 * Wrap text/plain content into a serialized HTML string safe for insertion
 * via innerHTML.
 *
 * By default we wrap everything in a 'div' tag with 'br' indicating newlines.
 * Alternately, we could use 'white-space: pre-wrap' if we were more confident
 * about recipients having sufficient CSS support and our own desire to have
 * things resemble text/plain.
 *
 * NB: simple escaping should also be fine, but this is unlikely to be a
 * performance hotspot.
 */
exports.wrapTextIntoSafeHTMLString = function(text, wrapTag,
                                              transformNewlines, attrs) {
  if (transformNewlines === undefined)
    transformNewlines = true;

  var doc = document.implementation.createHTMLDocument(''),
      wrapNode = doc.createElement(wrapTag || 'div');

  if (transformNewlines) {
    var lines = text.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var lineText = lines[i];
      if (i)
        wrapNode.appendChild(doc.createElement('br'));
      if (lineText.length)
        wrapNode.appendChild(doc.createTextNode(lineText));
    }
  }
  else {
    wrapNode.textContent = text;
  }

  if (attrs) {
    for (var iAttr = 0; iAttr < attrs.length; iAttr += 2) {
      wrapNode.setAttribute(attrs[iAttr], attrs[iAttr + 1]);
    }
  }

  return wrapNode.outerHTML;
};

var RE_QUOTE_CHAR = /"/g;

/**
 * Make an HTML attribute value safe.
 */
exports.escapeAttrValue = function(s) {
  return s.replace(RE_QUOTE_CHAR, '&quot;');
};

}); // end define
;
/**
 * Message processing logic that deals with message representations at a higher
 * level than just text/plain processing (`quotechew.js`) or text/html
 * (`htmlchew.js`) parsing.  We are particularly concerned with replying to
 * messages and forwarding messages, and use the aforementioned libs to do the
 * gruntwork.
 *
 * For replying and forwarding, we synthesize messages so that there is always
 * a text part that is the area where the user can enter text which may be
 * followed by a read-only editable HTML block.  If replying to a text/plain
 * message, the quoted text is placed in the text area.  If replying to a
 * message with any text/html parts, we generate an HTML block for all parts.
 **/

define('mailapi/mailchew',
  [
    'exports',
    './util',
    './mailchew-strings',
    './quotechew',
    './htmlchew'
  ],
  function(
    exports,
    $util,
    $mailchewStrings,
    $quotechew,
    $htmlchew
  ) {

var RE_RE = /^[Rr][Ee]: /;

/**
 * Generate the reply subject for a message given the prior subject.  This is
 * simply prepending "Re: " to the message if it does not already have an
 * "Re:" equivalent.
 *
 * Note, some clients/gateways (ex: I think the google groups web client? at
 * least whatever has a user-agent of G2/1.0) will structure mailing list
 * replies so they look like "[list] Re: blah" rather than the "Re: [list] blah"
 * that Thunderbird would produce.  Thunderbird (and other clients) pretend like
 * that inner "Re:" does not exist, and so do we.
 *
 * We _always_ use the exact string "Re: " when prepending and do not localize.
 * This is done primarily for consistency with Thunderbird, but it also is
 * friendly to other e-mail applications out there.
 *
 * Thunderbird does support recognizing a
 * mail/chrome/messenger-region/region.properties property,
 * "mailnews.localizedRe" for letting locales specify other strings used by
 * clients that do attempt to localize "Re:".  Thunderbird also supports a
 * weird "Re(###):" or "Re[###]:" idiom; see
 * http://mxr.mozilla.org/comm-central/ident?i=NS_MsgStripRE for more details.
 */
exports.generateReplySubject = function generateReplySubject(origSubject) {
  if (RE_RE.test(origSubject))
      return origSubject;
  return 'Re: ' + origSubject;
};

var l10n_wroteString = '{name} wrote',
    l10n_originalMessageString = 'Original Message';

/*
 * L10n strings for forward headers.  In Thunderbird, these come from
 * mime.properties:
 * http://mxr.mozilla.org/comm-central/source/mail/locales/en-US/chrome/messenger/mime.properties
 *
 * The libmime logic that injects them is mime_insert_normal_headers:
 * http://mxr.mozilla.org/comm-central/source/mailnews/mime/src/mimedrft.cpp#791
 *
 * Our dictionary maps from the lowercased header name to the human-readable
 * string.
 *
 * XXX actually do the l10n hookup for this
 */
var l10n_forward_header_labels = {
  subject: 'Subject',
  date: 'Date',
  from: 'From',
  replyTo: 'Reply-To',
  to: 'To',
  cc: 'CC',
};

exports.setLocalizedStrings = function(strings) {
  l10n_wroteString = strings.wrote;
  l10n_originalMessageString = strings.originalMessage;

  l10n_forward_header_labels = strings.forwardHeaderLabels;
};

// Grab the localized strings, if not available, listen for the event that
// sets them.
if ($mailchewStrings.strings) {
  exports.setLocalizedStrings($mailchewStrings.strings);
}
$mailchewStrings.events.on('strings', function (strings) {
  exports.setLocalizedStrings(strings);
});

/**
 * Generate the reply body representation given info about the message we are
 * replying to.
 *
 * This does not include potentially required work such as propagating embedded
 * attachments or de-sanitizing links/embedded images/external images.
 */
exports.generateReplyBody = function generateReplyMessage(reps, authorPair,
                                                          msgDate,
                                                          identity, refGuid) {
  var useName = authorPair.name || authorPair.address;

  var textMsg = '\n\n' +
                l10n_wroteString.replace('{name}', useName) + ':\n',
      htmlMsg = null;

  for (var i = 0; i < reps.length; i++) {
    var repType = reps[i].type, rep = reps[i].content;

    if (repType === 'plain') {
      var replyText = $quotechew.generateReplyText(rep);
      // If we've gone HTML, this needs to get concatenated onto the HTML.
      if (htmlMsg) {
        htmlMsg += $htmlchew.wrapTextIntoSafeHTMLString(replyText) + '\n';
      }
      // We haven't gone HTML yet, so this can all still be text.
      else {
        textMsg += replyText;
      }
    }
    else {
      if (!htmlMsg) {
        htmlMsg = '';
        // slice off the trailing newline of textMsg
        textMsg = textMsg.slice(0, -1);
      }
      // rep has already been sanitized and therefore all HTML tags are balanced
      // and so there should be no rude surprises from this simplistic looking
      // HTML creation.  The message-id of the message never got sanitized,
      // however, so it needs to be escaped.
      htmlMsg += '<blockquote cite="mid:' + $htmlchew.escapeAttrValue(refGuid) +
                 '" type="cite">' +
                 rep +
                 '</blockquote>';
    }
  }

  // Thunderbird's default is to put the signature after the quote, so us too.
  // (It also has complete control over all of this, but not us too.)
  if (identity.signature) {
    // Thunderbird wraps its signature in a:
    // <pre class="moz-signature" cols="72"> construct and so we do too.
    if (htmlMsg)
      htmlMsg += $htmlchew.wrapTextIntoSafeHTMLString(
                   identity.signature, 'pre', false,
                   ['class', 'moz-signature', 'cols', '72']);
    else
      textMsg += '\n\n-- \n' + identity.signature + '\n';
  }

  return {
    text: textMsg,
    html: htmlMsg
  };
};

/**
 * Generate the body of an inline forward message.  XXX we need to generate
 * the header summary which needs some localized strings.
 */
exports.generateForwardMessage = 
  function(author, date, subject, headerInfo, bodyInfo, identity) {

  var textMsg = '\n\n', htmlMsg = null;

  if (identity.signature)
    textMsg += '-- \n' + identity.signature + '\n\n';

  textMsg += '-------- ' + l10n_originalMessageString + ' --------\n';
  // XXX l10n! l10n! l10n!

  // Add the headers in the same order libmime adds them in
  // mime_insert_normal_headers so that any automated attempt to re-derive
  // the headers has a little bit of a chance (since the strings are
  // localized.)

  // : subject
  textMsg += l10n_forward_header_labels['subject'] + ': ' + subject + '\n';

  // We do not track or remotely care about the 'resent' headers
  // : resent-comments
  // : resent-date
  // : resent-from
  // : resent-to
  // : resent-cc
  // : date
  textMsg += l10n_forward_header_labels['date'] + ': ' + new Date(date) + '\n';
  // : from
  textMsg += l10n_forward_header_labels['from'] + ': ' +
               $util.formatAddresses([author]) + '\n';
  // : reply-to
  if (headerInfo.replyTo)
    textMsg += l10n_forward_header_labels['replyTo'] + ': ' +
                 $util.formatAddresses([headerInfo.replyTo]) + '\n';
  // : organization
  // : to
  if (headerInfo.to)
    textMsg += l10n_forward_header_labels['to'] + ': ' +
                 $util.formatAddresses(headerInfo.to) + '\n';
  // : cc
  if (headerInfo.cc)
    textMsg += l10n_forward_header_labels['cc'] + ': ' +
                 $util.formatAddresses(headerInfo.cc) + '\n';
  // (bcc should never be forwarded)
  // : newsgroups
  // : followup-to
  // : references (only for newsgroups)

  textMsg += '\n';

  var reps = bodyInfo.bodyReps;
  for (var i = 0; i < reps.length; i++) {
    var repType = reps[i].type, rep = reps[i].content;

    if (repType === 'plain') {
      var forwardText = $quotechew.generateForwardBodyText(rep);
      // If we've gone HTML, this needs to get concatenated onto the HTML.
      if (htmlMsg) {
        htmlMsg += $htmlchew.wrapTextIntoSafeHTMLString(forwardText) + '\n';
      }
      // We haven't gone HTML yet, so this can all still be text.
      else {
        textMsg += forwardText;
      }
    }
    else {
      if (!htmlMsg)
        htmlMsg = '';
      htmlMsg += rep;
    }
  }

  return {
    text: textMsg,
    html: htmlMsg
  };
};

var HTML_WRAP_TOP =
  '<html><body><body bgcolor="#FFFFFF" text="#000000">';
var HTML_WRAP_BOTTOM =
  '</body></html>';

/**
 * Combine the user's plaintext composition with the read-only HTML we provided
 * them into a final HTML representation.
 */
exports.mergeUserTextWithHTML = function mergeReplyTextWithHTML(text, html) {
  return HTML_WRAP_TOP +
         $htmlchew.wrapTextIntoSafeHTMLString(text, 'div') +
         html +
         HTML_WRAP_BOTTOM;
};

}); // end define
;
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
      var reader = new FileReader();
      reader.onload = function onloaded() {
        this._attachments.push({
          filename: attachmentDef.name,
          contentType: attachmentDef.blob.type,
          contents: new Uint8Array(reader.result),
        });
        if (--this._asyncPending === 0)
          this._asyncLoadsCompleted();
      }.bind(this);
      try {
        reader.readAsArrayBuffer(attachmentDef.blob);
        this._asyncPending++;
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
    mcomposer.addHeader('User-Agent', 'Mozilla Gaia Email Client 0.1alpha');
    mcomposer.addHeader('Date', this.sentDate.toUTCString());

    mcomposer.addHeader('Message-Id', this.messageId);
    if (wireRep.references)
      mcomposer.addHeader('References', wireRep.references);
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