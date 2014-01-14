(function(sunlight, undefined){

	if (sunlight === undefined || sunlight["registerLanguage"] === undefined) {
		throw "Include sunlight.js before including language files";
	}
	
	sunlight.registerLanguage("mysql", {
		caseInsensitive: true,
		
		keywords: [
			//http://dev.mysql.com/doc/refman/5.5/en/reserved-words.html
			"accessible","add","all",
			"alter","analyze","and",
			"as","asc","asensitive",
			"before","between","bigint",
			"binary","blob","both",
			"by","call","cascade",
			"case","change","char",
			"character","check","collate",
			"column","condition","constraint",
			"continue","convert","create",
			"cross","current_date","current_time",
			"current_timestamp","current_user","cursor",
			"database","databases","day_hour",
			"day_microsecond","day_minute","day_second",
			"dec","decimal","declare",
			"default","delayed","delete",
			"desc","describe","deterministic",
			"distinct","distinctrow","div",
			"double","drop","dual",
			"each","else","elseif",
			"enclosed","escaped","exists",
			"exit","explain","false",
			"fetch","float","float4",
			"float8","for","force",
			"foreign","from","fulltext",
			"grant","group","having",
			"high_priority","hour_microsecond","hour_minute",
			"hour_second","if","ignore",
			"in","index","infile",
			"inner","inout","insensitive",
			"insert","int","int1",
			"int2","int3","int4",
			"int8","integer","interval",
			"into","is","iterate",
			"join","key","keys",
			"kill","leading","leave",
			"left","like","limit",
			"linear","lines","load",
			"localtime","localtimestamp","lock",
			"long","longblob","longtext",
			"loop","low_priority","master_ssl_verify_server_cert",
			"match","maxvalue","mediumblob",
			"mediumint","mediumtext","middleint",
			"minute_microsecond","minute_second","mod",
			"modifies","natural","not",
			"no_write_to_binlog","null","numeric",
			"on","optimize","option",
			"optionally","or","order",
			"out","outer","outfile",
			"precision","primary","procedure",
			"purge","range","read",
			"reads","read_write","real",
			"references","regexp","release",
			"rename","repeat","replace",
			"require","resignal","restrict",
			"return","revoke","right",
			"rlike","schema","schemas",
			"second_microsecond","select","sensitive",
			"separator","set","show",
			"signal","smallint","spatial",
			"specific","sql","sqlexception",
			"sqlstate","sqlwarning","sql_big_result",
			"sql_calc_found_rows","sql_small_result","ssl",
			"starting","straight_join","table",
			"terminated","then","tinyblob",
			"tinyint","tinytext","to",
			"trailing","trigger","true",
			"undo","union","unique",
			"unlock","unsigned","update",
			"usage","use","using",
			"utc_date","utc_time","utc_timestamp",
			"values","varbinary","varchar",
			"varcharacter","varying","when",
			"where","while","with",
			"write","xor","year_month",
			"zerofill",
			
			//5.5 keywords
			"general", "ignore_server_ids", "master_heartbeat_period", "slow",
			
			//permitted as unquoted identifiers, whatever
			"action", "bit", "date", "enum", "no", "text", "time", "timestamp",
			
			//others not mentioned in the mysql reserved word docs for some reason
			"prepare", "execute", "deallocate prepare", "begin", "end", "delimiter", "repeat",
			"open", "close", "do", "handler", "load data infile",
			
			"start transaction", "commit", "rollback",
			
			"flush", "with read lock",
			
			//special operators
			"sounds" //http://dev.mysql.com/doc/refman/5.5/en/string-functions.html#operator_sounds-like
		],
		
		customParseRules: [
			//functions
			function() {
				var functions = sunlight.util.createHashMap([
					"abs", "acos", "adddate", "addtime", "aes_decrypt", "aes_encrypt", "ascii", "asin", "atan2", "atan", "atan", "avg", "benchmark", 
					"bin", "binary", "bit_and", "bit_count", "bit_length", "bit_or", "bit_xor", "cast", "ceil", "ceiling", "char_length", "char", 
					"character_length", "charset", "coalesce", "coercibility", "collation", "compress", "concat_ws", "concat", "connection_id", 
					"conv", "convert_tz", "convert", "cos", "cot", "countdistinct", "count", "crc32", "curdate", "current_date", "current_time", 
					"current_timestamp", "current_user", "curtime", "database", "date_add", "date_format", "date_sub", "date", "datediff", "day", 
					"dayname", "dayofmonth", "dayofweek", "dayofyear", "decode", "default", "degrees", "des_decrypt", "des_encrypt", "elt", "encode", 
					"encrypt", "exp", "export_set", "extract", "extractvalue", "field", "find_in_set", "floor", "format", "found_rows", "from_days", 
					"from_unixtime", "get_format", "get_lock", "greatest", "group_concat", "hex", "hour", "if", "ifnull", "in", "inet_aton", 
					"inet_ntoa", "insert", "instr", "interval", "is_free_lock", "is_used_lock", "isnull", "last_insert_id", "lcase", "least", "left", 
					"length", "ln", "load_file", "localtime", "localtimestamp", "locate", "log10", "log2", "log", "lower", "lpad", "ltrim", "make_set", 
					"makedate", "master_pos_wait", "max", "md5", "microsecond", "mid", "min", "minute", "mod", "month", "monthname", "name_const", 
					"now", "nullif", "oct", "octet_length", "old_password", "ord", "password", "period_add", "period_diff", "pi", "position", "pow", 
					"power", "procedureanalyse", "quarter", "quote", "radians", "rand", "release_lock", "repeat", "replace", "reverse", "right", "rlike", 
					"round", "row_count", "rpad", "rtrim", "schema", "sec_to_time", "second", "session_user", "sha1", "sha", "sha2", "sign", "sin", 
					"sleep", "soundex", "space", "sqrt", "std", "stddev_pop", "stddev_samp", "stddev", "str_to_date", "strcmp", "subdate", "substr", 
					"substring_index", "substring", "subtime", "sum", "sysdate", "system_user", "tan", "time_format", "time_to_sec", "time", "timediff", 
					"timestamp", "timestampadd", "timestampdiff", "to_days", "to_seconds", "trim", "truncate", "ucase", "uncompress", "uncompressed_length", 
					"unhex", "unix_timestamp", "updatexml", "upper", "user", "utc_date", "utc_time", "utc_timestamp", "uuid_short", "uuid", "values",
					"var_pop", "var_samp", "variance", "version", "week", "weekday", "weekofyear", "year", "yearweek"
				], "\\b", true);
				
				//functions need to be followed by a "(", otherwise they are (potentially) keywords or just regular idents
				return function(context) {
					var token = sunlight.util.matchWord(context, functions, "function", true),
						count,
						peek;
					if (token === null) {
						return null;
					}
					
					//the next non-whitespace character must be a "("
					count = token.value.length;
					peek = context.reader.peek(count);
					while (peek.length === count && peek !== context.reader.EOF) {
						if (!/\s$/.test(peek)) {
							if (peek.charAt(peek.length - 1) === "(") {
								//this token really is a function
								context.reader.read(token.value.length - 1);
								return token;
							}
							
							break;
						}
					
						peek = context.reader.peek(++count);
					}
					
					return null;
				};
			}()
		],
		
		scopes: {
			string: [ ["\"", "\"", sunlight.util.escapeSequences.concat(["\\\""])], ["'", "'", ["\\\'", "\\\\"]] ],
			comment: [ ["--", "\n", null, true], ["/*", "*/"], ["#", "\n", null, true] ],
			quotedIdent: [ ["`", "`", ["`\\`", "\\\\"]] ]
		},
		
		identFirstLetter: /[A-Za-z_]/,
		identAfterFirstLetter: /\w/,

		namedIdentRules: {
			//table/db names
			follows: [
				[{ token: "keyword", values: ["from", "join"]}, { token: "default" } ],
				[
					{ token: "keyword", values: ["from", "join"]}, 
					{ token: "default" }, 
					{ token: "ident" }, 
					sunlight.util.whitespace, 
					{ token: "operator", values: ["."] },
					sunlight.util.whitespace
				]
			]
		},

		operators: [
			//arithmetic
			"+",
			"-",
			"*",
			"/",
			"%",

			//boolean
			"&&", "||",

			//bitwise
			"|",
			"&",
			"^",
			">>",
			"<<",

			//inequality
			"<>", "<=>",
			"<=", "<",
			">=", ">",
			"==", "!=",

			//unary
			"!", "~",

			//assignment
			":=", "=",
			
			//other
			"."
		]
	});
}(this["Sunlight"]));