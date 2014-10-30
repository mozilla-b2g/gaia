(function(sunlight, undefined){

	if (sunlight === undefined || sunlight["registerLanguage"] === undefined) {
		throw "Include sunlight.js before including language files";
	}

	sunlight.registerLanguage("lua", {
		
		keywords: [
			"and","break","do","elseif","else","end","false","for","function","if",
			"in","local","nil","not","or","repeat","return","then","true","until","while"
		],
		
		scopes: {
			string: [ ["\"", "\"", ["\\\"", "\\\\"]], ["'", "'", ["\\'", "\\\\"]] ],
			comment: [ ["--[[", "]]"], ["--", "\n", null, true] ]
		},
		
		customTokens: {
			globalVariable: {
				values: ["_G", "_VERSION"],
				boundary: "\\b"
			}
		},
		
		customParseRules: [
			//standard functions
			function() {
				var functions = sunlight.util.createHashMap([
					"assert","collectgarbage","dofile","error","getfenv","getmetatable","ipairs","load","loadfile",
					"loadstring","next","pairs","pcall","print","rawequal","rawget","rawset","select","setfenv",
					"setmetatable","tonumber","tostring","type","unpack","xpcall",
					
					//exported from package library
					"module", "require"
				], "\\b");
				
				return function(context) {
					var prevToken = context.token(context.count() - 1);
					if (prevToken && prevToken.name === "operator" && prevToken.value === ".") {
						//part of a package
						return null;
					}
					
					return sunlight.util.matchWord(context, functions, "function");
				};
			}(),
			
			//file functions
			function() {
				var functions = sunlight.util.createHashMap([
					"close", "flush", "lines", "read", "seek", "setvbuf", "write"
				], "\\b");
				
				return function(context) {
					var prevToken = context.token(context.count() - 1);
					if (!prevToken || prevToken.name !== "operator" || prevToken.value !== ":") {
						//not a function on file
						return null;
					}
					
					return sunlight.util.matchWord(context, functions, "function");
				};
			}(),
			
			//literal strings
			function(context) {
				var numberOfEqualsSigns = 0,
					peek,
					count = 0,
					value,
					line = context.reader.getLine(), 
					column = context.reader.getColumn(),
					closer;
					
				//[=*[ string contents ]=*]
				
				if (context.reader.current() !== "[") {
					return null;
				}
				
				while ((peek = context.reader.peek(++count)) && peek.length === count) {
					if (!/=$/.test(peek)) {
						if (!/\[$/.test(peek)) {
							return null;
						}
						
						numberOfEqualsSigns = peek.length - 1;
						break;
					}
				}
				
				value = "[" + peek;
				context.reader.read(peek.length);
				
				//read until "]" + numberOfEqualsSigns + "]"
				closer = "]" + new Array(numberOfEqualsSigns + 1).join("=") + "]";
				while (peek = context.reader.peek()) {
					if (peek === "]" && context.reader.peek(closer.length) === closer) {
						value += context.reader.read(closer.length);
						break;
					}
					
					value += context.reader.read();
				}
				
				return context.createToken("verbatimString", value, line, column);
			}
		],
		
		identFirstLetter: /[A-Za-z_]/,
		identAfterFirstLetter: /\w/,
		
		namedIdentRules:{
			custom: [
				function() {
					var tables = ["coroutine", "package", "string", "table", "math", "io", "os", "debug"];
					
					return function(context) {
						var nextToken;
						if (!sunlight.util.contains(tables, context.tokens[context.index].value)) {
							return false;
						}
						
						nextToken = sunlight.util.getNextNonWsToken(context.tokens, context.index);
						return nextToken && (nextToken.name !== "operator" || nextToken.value !== ":");
					};
				}()
			],
			
			follows: [
				[{ token: "keyword", values: ["function"] }, { token: "default" }]
			]
		},
		
		operators: [
			"+", 
			"-",
			"*",
			"/",
			"%",
			"^",
			"#",
			"==", "~=", "=",
			"<=", "<",
			">=", ">",
			":", 
			"...", "..", "."
		]

	});
}(this["Sunlight"]));