#!/usr/bin/env nodejs

var http = require('http');
var url = require('url');
var dgam = require('dgram');
var posix = require('/usr/local/lib/node_modules/posix');

var messageArray = [];
var listenPort = 8888;
var commandDelay = 200;
var syslogMsg ="";

posix.openlog('lightwaveproxy.js', { cons: false, ndelay:true, pid:true }, 'local0');


http.createServer(function(request, response) {
  response.writeHead(200, {"Content-Type": "text/plain"});
  var requestObjects = url.parse(request.url, true).query;
  if (requestObjects.device && requestObjects.command) {
    messageArray.push(requestObjects);
    syslogMsg = "lightwaveproxy received " + requestObjects.device + " " + requestObjects.command + " from " + request.socket.remoteAddress;
    posix.syslog('debug',syslogMsg);
  };
  response.end("Received OK\n");
}).listen(listenPort);

syslogMsg = "lightwaveproxy listener started on port " + listenPort; 
posix.syslog('info', syslogMsg);

setInterval(function(){
  if (messageArray.length) {
    var message = messageArray.shift();
    if ((message.device.match(/^R\dD\d/)) && (message.command.match(/^(\d+|on|off)/))) {
      var udpString = "100,!" + message.device
      if (message.command == "on") {
        udpString += "F1|";
      }
      else if (message.command == "off") {
        udpString += "F0|";
      }
      else {
        udpString += "FdP" + message.command;
      };
      syslogMsg = "lightwaveproxy sending command " + udpString;
      posix.syslog('debug',syslogMsg);
      var udpMessage = new Buffer(udpString);
      var client = dgam.createSocket("udp4");
      client.send(udpMessage, 0, udpMessage.length, 9760, "192.168.100.166", function(err, bytes) {
        client.close();
      });
    }
  };
}, commandDelay);

posix.closelog();
