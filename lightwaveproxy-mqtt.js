#!/usr/bin/env nodejs

var path = require('path');
var argv = require('yargs').argv;
var nconf = require('nconf');
var http = require('http');
var url = require('url');
var dgam = require('dgram');
var posix = require('/usr/local/lib/node_modules/posix');
var mqtt = require('mqtt');

var startup = nconf.argv();
var configFile = path.resolve( startup.get('conf') || '/usr/local/etc/lightwaveproxy-mqtt.json' );
var logName = startup.get('log-as') || 'lightwaveproxy-mqtt.js';
startup.remove('argv');
startup = null;

nconf.argv().file({ file: configFile });
nconf.defaults({
  "secure":"true",
  "user":"mqttuser",
  "pass":"mqttpass",
  "host":"mqtthost",
  "port":"1883",
  "cid":"clientid",
  "subtopic":"request_topic",
  "pubtopic":"response_topic",
  "serverPort":"80",
  "delay":"200"
});

var messageArray = [];
var listenPort = nconf.get('serverPort'); 
var commandDelay = 250;
var syslogMsg ="";
var requestId = 0;

posix.openlog(logName, { cons: false, ndelay:true, pid:true }, 'local0');


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

if (nconf.get('secure') == 'true') {
  var connectstring = 'mqtts://';
}
else {
  var connectstring = 'mqtt://';
}

connectstring += nconf.get('host');

var client = mqtt.connect(connectstring, {clientId: nconf.get('cid'), username: nconf.get('user'), password: nconf.get('pass')});
posix.syslog('info', 'mqtt client connected to ' +connectstring);

client.on('connect', function () {  
  client.subscribe(nconf.get('subtopic'))
  posix.syslog('info', 'subscribed to topic ' +nconf.get('subtopic'));
})

setInterval(function(){
  if (messageArray.length) {
    var message = messageArray.shift();
    if ((message.device.match(/^R\dD\d/)) && (message.command.match(/^(\d+|on|off)/))) {
      // Build the MQTT message, Order is Room, Subunit, Command, Dimlevel, rEquestId
      requestId++;
      var mqttString =  String(parseInt((message.device).substring(1,2))-1);
      mqttString += String(parseInt((message.device).substring(3))-1);
      if (message.command == "on") {
        mqttString += "100";
      }
      else if (message.command == "off") {
        mqttString += "064";
      }
      else {
        mqttString += "1" + (parseInt(message.command) + 127).toString(16);
      };
      mqttString += ("000000" + requestId.toString(16)).substr(-6);
      posix.syslog('debug','sending command ' + mqttString + ' to topic ' +nconf.get('pubtopic'));
      client.publish(nconf.get('pubtopic'),mqttString);
    }
    else {
      posix.syslog('debug','unrecognised command');
    };
  };
}, commandDelay);
