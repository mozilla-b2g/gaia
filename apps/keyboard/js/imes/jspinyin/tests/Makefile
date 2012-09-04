.PHONY: test-all clean build-dict-test spelling-parser-test user-dict-test matrix-search-test

test-all: 
	./test.sh 


build-dict-test:
	js -U build_dict_test.js

spelling-parser-test:
	js -U spelling_parser_test.js

user-dict-test:
	js -U user_dict_test.js

matrix-search-test:
	js -U matrix_search_test.js
clean:
	rm -f temp
