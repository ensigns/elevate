FROM node:8-alpine
RUN mkdir /root/src
COPY . /root/src
WORKDIR /root/src

RUN npm install
RUN npm install -g nodemon
EXPOSE 4010
CMD nodemon elevate.js -w ./
