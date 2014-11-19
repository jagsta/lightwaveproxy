#!/usr/bin/env nodejs

var posix = require('posix');
var argv = require('yargs').argv;
var http = require('http');
var fs    = require('fs'),
    nconf = require('nconf');

nconf.argv().file({ file: '/usr/local/etc/domoticz_subscriber.json' })
nconf.defaults({
  "secure":"false",
  "user":"username",
  "pass":"password",
  "host":"127.0.0.1",
  "port":"1883",
  "cid":"client",
  "dhost":"127.0.0.1",
  "dport":"8080",
  "duser":"domoticz",
  "dpass":"domoticz",
  "updateInterval":"3600",
  "subtopic":"'/test','/test1','/test3'",
  "pubtopic":"'/status'"
})

var syslogMsg ="";
posix.openlog('domoticz_subscriber.js', { cons: false, ndelay:true, pid:true }, 'local0');
  

if (nconf.get('secure') == 'true') { 
  var connectstring = 'mqtts://';
} 
else {
  var connectstring = 'mqtt://';
}

connectstring = connectstring + nconf.get('user') + ':' + nconf.get('pass') + '@' + nconf.get('host') + ':' + nconf.get('port') + '?clientId=' + nconf.get('cid')

var mqtt = require('mqtt')
  , client = mqtt.connect(connectstring);
posix.syslog('debug','Connecting with: ' +connectstring);

var publish_topic = nconf.get('pubtopic')
var subscribe_topic = nconf.get('subtopic').split(",")
var updateInterval = nconf.get('updateInterval')  * 1000
var getVariables = '/json.htm?type=command&param=getuservariables'
var getSwitches = '/json.htm?type=command&param=getlightswitches'
var switches
var variables

var domoticzHost = nconf.get('dhost')
var domoticzPort = nconf.get('dport')
var domoticzUser = nconf.get('duser')
var domoticzPass = nconf.get('dpass')

var requestStub = 'http://' + domoticzHost + ':' + domoticzPort
update (getVariables, function(object) {
  variables = object
})
update (getSwitches, function(object) {
  switches = object
})


client.subscribe(subscribe_topic);
if (Array.isArray(subscribe_topic)) { 
  posix.syslog('debug','subscribing to topics: ' +subscribe_topic);
}
else {
  posix.syslog('debug','subscribing to topic: ' +subscribe_topic);
}
posix.syslog('debug','publishing to topic: ' +publish_topic);


client.on('message', function(topic, message) {
  var object='';
  var idx='';
  var vType=''
  var request = requestStub + '/json.htm?type=command'
  try{
      object=JSON.parse(message);
  }catch(e){
      posix.syslog('notice','Received message but parse to JSON failed: ' + message,e)
  }
  posix.syslog('info','Received message, topic: ' + topic + ' message: ' + message);
  if (object.command && object.device) {
    switch (true) {
      case topic == "/home/domoticz/switches": 
        for (var j = 0; j < switches.length; j++) {
          if (switches[j].Name == object.device) {
            posix.syslog('debug','found variable index:' +j+ ' with name:' +switches[j].Name)
            idx = switches[j].idx
            if (/\d+/.test(object.command) && switches[j].IsDimmer) {
              request += '&param=switchlight&idx=' + idx +'&switchcmd=Set%20Level&level=' + object.command
            }
            else {
              object.command = capitalise(object.command)
              request += '&param=switchlight&idx=' + idx +'&switchcmd=' + object.command + '&level=0'
            }
          }
        }
        break
      case topic == "/home/domoticz/variables":
        for (var j = 0; j < variables.length; j++) {
          if (variables[j].Name == object.device) {
            posix.syslog('debug','found variable index:' +j+ ' with name:' +variables[j].Name)
            idx = variables[j].idx
            vType = variables[j].Type
            request += '&param=updateuservariable&idx=' + idx + '&vname=' + object.device + '&vtype=' + vType + '&vvalue=' + object.command
          }
        }
        break
      case /location/.test(topic):
        break
      default:
        posix.syslog('notice','Received unrecognised topic: ' +topic)
    }
    posix.syslog('debug',request)
    var req = http.get(request, function(res) {
     res.setEncoding('utf8');
     res.on('data', function (chunk) {
         res_JSON = JSON.parse(chunk);
         object.status = res_JSON.status
         object.time = getDateTime()
         client.publish(publish_topic, JSON.stringify(object)); 
           posix.syslog('info','Sent ' + JSON.stringify(object) +' to topic:' + publish_topic)
    });
    }).on('error', function(e) {
      posix.syslog('notice',"Got error: " + e.message);
    });
  };
});

function update (uri, cb) {
  var request = requestStub + uri
  posix.syslog('info','updating from domoticz with request: ' + request)
  var req = http.get(request, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      try{
        res_JSON = JSON.parse(chunk);
      }catch(e){
        posix.syslog('notice','Received message but parse to JSON failed: ' + chunk,e)
      }
      if (res_JSON.status == 'OK') {
        cb(res_JSON.result) 
      }
    })
  }).on('error', function(e) {
    posix.syslog('notice',"Got error: " + e.message);
  });
}

function capitalise(string)
{
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + "-" +  month + "-" + day + "_" + hour + ":" + min + ":" + sec;

}


setInterval(function(){
  update (getVariables, function(object) { 
    variables = object
  });
  update (getSwitches, function(object) { 
    switches = object
  });
}, (updateInterval));


