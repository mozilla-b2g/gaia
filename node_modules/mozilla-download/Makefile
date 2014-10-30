default: test

test/extract-out:
	mkdir test/extract-out

test/fixtures:
	mkdir test/fixtures
	node fixtures.js

node_modules:
	npm install

.PHONY: test
test: node_modules test/fixtures test/extract-out
	./node_modules/mocha/bin/mocha \
		test/detectos-test.js \
		test/extract-test.js

.PHONY: test-full
test-full: node_modules test/fixtures test/extract-out
	./node_modules/mocha/bin/mocha --reporter spec -t 100s

.PHONY: clean
clean:
	rm -Rf test/darwin-out test/extract-out test/linux-out
