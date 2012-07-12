.PHONY: test-all clean build-dict-test spelling-parser-test user-dict-test matrix-search-test

test-all: 
	./test.sh 


build-dict-test:
	js -U build_dict_test.js

spelling-parser-test:
	js -U testSpellingParser.js

user-dict-test:
	js -U testUserDict.js

matrix-search-test:
	js -U matrix_search_test.js
clean:
	rm -f temp
