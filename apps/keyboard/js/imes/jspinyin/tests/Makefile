.PHONY: test-all clean build-dict-test spelling-parser-test user-dict-test

test-all: 
	./test.sh 


build-dict-test:
	js -U testBuildDict.js

spelling-parser-test:
	js -U testSpellingParser.js

user-dict-test:
	js -U testUserDict.js

clean:
	rm -f temp
