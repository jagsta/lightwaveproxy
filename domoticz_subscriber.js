#!/usr/bin/env nodejs

var argv = require('/usr/local/lib/node_modules/yargs').argv;
var http = require('http');
var fs    = require('fs'),
    nconf = require('/usr/local/lib/node_modules/nconf');

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
  "updateInterval":"3600000"
})

if (nconf.get('secure') == 'true') { 
  var connectstring = 'mqtts://';
} 
else {
  var connectstring = 'mqtt://';
}

connectstring = connectstring + nconf.get('user') + ':' + nconf.get('pass') + '@' + nconf.get('host') + ':' + nconf.get('port') + '?clientId=' + nconf.get('cid')
console.log(connectstring);

var mqtt = require('/usr/local/lib/node_modules/mqtt')
  , client = mqtt.connect(connectstring);

var publish_topic = '/status/domoticz'
var subscribe_topic = ['/jag/#','/han/#','/home/#']
var updateInterval = nconf.get('updateInterval')
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

client.on('message', function(topic, message) {
  var object='';
  var idx='';
  var vType=''
  var request = requestStub + '/json.htm?type=command'
  try{
      object=JSON.parse(message);
  }catch(e){
      console.log('Received message but parse to JSON failed: ' + message,e); //error in the above string(in this case,yes)!
  }
  console.log('Received message, topic: ' + topic + ' message: ' + message);
  if (object.command && object.device) {
    switch (true) {
      case topic == "/home/domoticz/switches": 
        console.log('got switch topic')
        for (var j = 0; j < switches.length; j++) {
          if (switches[j].Name == object.device) {
            console.log('found variable index:' +j+ ' with name:' +switches[j].Name)
            idx = switches[j].idx
            console.log(/\d+/.test(object.command))
            console.log(switches[j].IsDimmer)
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
        console.log('got variable topic')
        for (var j = 0; j < variables.length; j++) {
          if (variables[j].Name == object.device) {
            console.log('found variable index:' +j+ ' with name:' +variables[j].Name)
            idx = variables[j].idx
            vType = variables[j].Type
            request += '&param=updateuservariable&idx=' + idx + '&vname=' + object.device + '&vtype=' + vType + '&vvalue=' + object.command
          }
        }
        break
      case /location/.test(topic):
        console.log('got location topic')
        break
      default:
        console.log('unrecognised topic: ' +topic)
    }
    console.log(request)
    var req = http.get(request, function(res) {
     console.log("Domoticz response: " + res.statusCode);
     res.setEncoding('utf8');
     res.on('data', function (chunk) {
         res_JSON = JSON.parse(chunk);
         console.log('status: ' + res_JSON.status);
         object.status = res_JSON.status
         client.publish(publish_topic, JSON.stringify(object)); 
           console.log('Sent ' + JSON.stringify(object) +' to topic:' + publish_topic)
    });
    }).on('error', function(e) {
      console.log("Got error: " + e.message);
    });
  };
});

function update (uri, cb) {
  var request = requestStub + uri
  console.log('updating from domoticz with request: ' + request)
  var req = http.get(request, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      res_JSON = JSON.parse(chunk);
      if (res_JSON.status == 'OK') {
        cb(res_JSON.result) 
      }
//      console.log(JSON.stringify(res_JSON,null,2))
    })
  }).on('error', function(e) {
    console.log("Got error: " + e.message);
  });
}

function capitalise(string)
{
    return string.charAt(0).toUpperCase() + string.slice(1);
}

setInterval(function(){
  // get user variables
  update (getVariables, function(object) { 
//    console.log(JSON.stringify(object)) 
    variables = object
    
  });
  update (getSwitches, function(object) { 
//    console.log(JSON.stringify(object)) 
    switches = object
    
  });
}, updateInterval);


