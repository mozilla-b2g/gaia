default: test

.PHONY: test
test: node_modules
	./node_modules/.bin/mocha $(shell find test -name "*_test.js")

node_modules:
	npm install
