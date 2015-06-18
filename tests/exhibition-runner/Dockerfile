FROM ubuntu:14.04
MAINTAINER James Lal

RUN apt-get update && apt-get install -y curl
RUN useradd -m user
USER user
WORKDIR /home/user

RUN mkdir /home/user/app
COPY src /home/user/app/src
COPY exhibition /home/user/app/exhibition
COPY package.json /home/user/app/package.json
COPY examples /home/user/app/examples

ENTRYPOINT ["/home/user/app/exhibition"]
