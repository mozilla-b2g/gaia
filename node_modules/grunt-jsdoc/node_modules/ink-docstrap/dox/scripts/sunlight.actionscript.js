(function(sunlight, undefined){

	if (sunlight === undefined || sunlight["registerLanguage"] === undefined) {
		throw "Include sunlight.js before including language files";
	}
	
	sunlight.registerLanguage("actionscript", {
		keywords: [
			"default xml namespace",
			"use namespace",
			
			
			"break", "case", "catch", "continue", "default", "do", "else", "finally", "for", "if", "in",
			"label", "return", "super", "switch", "throw", "try", "while", "with",
			
			"dynamic", "final", "internal", "native", "override", "private", "protected", "public", "static",
			
			"class", "const", "extends", "function", "get", "implements", "interface", "namespace", "package",
			"set", "var",
			
			"import", "include",
			
			"false", "null", "this", "true",
			
			"typeof", "void", "as", "instanceof", "is", "new"
			
		],
		
		customTokens: {
			varArgs: {
				values: ["...rest"],
				boundary: "[\\W]"
			},
			
			
			constant: {
				values: ["Infinity", "NaN", "undefined"],
				boundary: "\\b"
			},
			
			globalObject: {
				values: [
					"ArgumentError", "arguments", "Array", "Boolean", "Class", "Date", "DefinitionError",
					"Error", "EvalError", "Function", "int", "Math", "Namespace", "Number", "Object", "QName",
					"RangeError", "ReferenceError", "RegExp", "SecurityError", "String", "SyntaxError", "TypeError",
					"uint", "URIError", "Vector", "VerifyError", "XMLList", "XML"
				],
				boundary: "\\b"
			}
		},

		scopes: {
			string: [ ["\"", "\"", sunlight.util.escapeSequences.concat(["\\\""])], ["'", "'", sunlight.util.escapeSequences.concat(["\\\'", "\\\\"])] ],
			comment: [ ["//", "\n", null, true], ["/*", "*/"] ],
			xmlAttribute: [ ["@", "\\b"] ]
		},
		
		customParseRules: [
			//global functions: //http://help.adobe.com/en_US/FlashPlatform/reference/actionscript/3/package-detail.html
			function() {
				var functions = sunlight.util.createHashMap([
					"Array", "Boolean", "decodeURIComponent", "decodeURI", "encodeURIComponent", "encodeURI",
					"escape", "int", "isFinite", "isNaN", "isXMLName", "Number", "Object", "parseFloat", 
					"parseInt", "String", "trace", "uint", "unescape", "Vector", "XML", "XMLList"
				], "\\b", false);
				
				return function(context) {
					var prevToken,
						token,
						peek,
						count;
					
					if (!/[A-Za-z]/.test(context.reader.current())) {
						//short circuit
						return null;
					}
					
					//if it follows "new" or ":", then it's not a function
					prevToken = context.token(context.count() - 1);
					if (prevToken && ((prevToken.name === "keyword" && prevToken.value === "new") || (prevToken.name === "operator" && prevToken.value === ":"))) {
						return null;
					}
					
					token = sunlight.util.matchWord(context, functions, "globalFunction", true);
					if (!token) {
						return null;
					}
					
					//make sure that a "(" follows it
					count = token.value.length;
					while ((peek = context.reader.peek(count)) && peek.length === count) {
						if (!/\s$/.test(peek)) {
							if (sunlight.util.last(peek) === "(") {
								token.line = context.reader.getLine();
								token.column = context.reader.getColumn();
								context.reader.read(token.value.length - 1);
								return token;
							}
							
							break;
						}
					}
					
					return null;
				};
			}(),
				
			//regex literal, stolen from javascript
			function(context) {
				var peek = context.reader.peek(),
					isValid,
					regexLiteral = "/",
					line = context.reader.getLine(),
					column = context.reader.getColumn(),
					peek2,
					next;
					
				if (context.reader.current() !== "/" || peek === "/" || peek === "*") {
					//doesn't start with a / or starts with // (comment) or /* (multi line comment)
					return null;
				}
				
				isValid = function() {
					var previousNonWsToken = context.token(context.count() - 1),
						previousToken = null;
					
					if (context.defaultData.text !== "") {
						previousToken = context.createToken("default", context.defaultData.text); 
					}
					
					if (!previousToken) {
						previousToken = previousNonWsToken;
					}
					
					//first token of the string
					if (previousToken === undefined) {
						return true;
					}
					
					//since JavaScript doesn't require statement terminators, if the previous token was whitespace and contained a newline, then we're good
					if (previousToken.name === "default" && previousToken.value.indexOf("\n") > -1) {
						return true;
					}
					
					if (sunlight.util.contains(["keyword", "ident", "number"], previousNonWsToken.name)) {
						return false;
					}
					if (previousNonWsToken.name === "punctuation" && !sunlight.util.contains(["(", "{", "[", ",", ";"], previousNonWsToken.value)) {
						return false;
					}
					
					return true;
				}();
				
				if (!isValid) {
					return null;
				}
				
				//read the regex literal
				while (context.reader.peek() !== context.reader.EOF) {
					peek2 = context.reader.peek(2);
					if (peek2 === "\\/" || peek2 === "\\\\") {
						//escaped backslash or escaped forward slash
						regexLiteral += context.reader.read(2);
						continue;
					}
					
					regexLiteral += (next = context.reader.read());
					if (next === "/") {
						break;
					}
				}
				
				//read the regex modifiers
				//only "g", "i" and "m" are allowed, but for the sake of simplicity we'll just say any alphabetical character is valid
				while (context.reader.peek() !== context.reader.EOF) {
					if (!/[A-Za-z]/.test(context.reader.peek())) {
						break;
					}
					
					regexLiteral += context.reader.read();
				}
				
				return context.createToken("regexLiteral", regexLiteral, line, column);
			}
		],
		
		identFirstLetter: /[A-Za-z_]/,
		identAfterFirstLetter: /\w/,
		
		namedIdentRules: {
			custom: [
				function(context) {
					//next token is not "."
					var nextToken = sunlight.util.getNextNonWsToken(context.tokens, context.index),
						token,
						index,
						previous;
						
					if (nextToken && nextToken.name === "operator" && nextToken.value === ".") {
						return false;
					}
					
					//go backward and make sure that there are only idents and dots before the new keyword
					index = context.index;
					previous = context.tokens[index];
					while ((token = context.tokens[--index]) !== undefined) {
						if (token.name === "keyword" && sunlight.util.contains(["new", "is", "instanceof", "import"], token.value)) {
							return true;
						}
						
						if (token.name === "default") {
							continue;
						}
						
						if (token.name === "ident") {
							if (previous && previous.name === "ident") {
								return false;
							}
							
							previous = token;
							continue;
						}
						
						if (token.name === "operator" && token.value === ".") {
							if (previous && previous.name !== "ident") {
								return false;
							}
							
							previous = token;
							continue;
						}
						
						break;
					}
					
					return false;
				}
			],
			
			follows: [
				[{ token: "keyword", values: ["class", "extends"] }, { token: "default" }],
				[{ token: "operator", values: [":"] }, sunlight.util.whitespace]
			],
			
			between: [
				{ opener: { token: "keyword", values: ["implements"] }, closer: { token: "punctuation", values: ["{"] } }
			]
		},

		operators: [
			//arithmetic
			"++", "+=", "+",
			"--", "-=", "-",
			      "*=", "*",
			      "/=", "/",
			      "%=", "%",

			//boolean
			"&&=", "&&", 
			"||=", "||",

			//bitwise
			"|=",   "|",
			"&=",   "&",
			"^=",   "^",
			">>>=", ">>>", ">>=", ">>",
			"<<=", "<<",

			//inequality
			"<=", "<",
			">=", ">",
			"===", "==", "!==", "!=",

			//unary
			"!", "~",

			//other
			"::", "?", ":", ".", "="
		]
	});
}(this["Sunlight"]));