FROM node:8-alpine
RUN npm install -g forever
RUN mkdir /root/src
COPY . /root/src
WORKDIR /root/src
RUN npm install
EXPOSE 4010
CMD forever elevate.js
