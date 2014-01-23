all: test

.PHONY: fetch-deps
fetch-deps:
	npm install

.PHONY: test
test: fetch-deps
	./node_modules/.bin/tape test/*.js
