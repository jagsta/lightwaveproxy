var argv = require('/usr/local/lib/node_modules/yargs').argv;
var http = require('http');

if (argv.secure) {
  var connectstring = 'mqtts://';
} 
else {
  var connectstring = 'mqtt://';
}
if (argv.user && argv.pass && argv.host && argv.port && argv.cid) { 
  connectstring = connectstring + argv.user + ':' + argv.pass + '@' + argv.host + ':' + argv.port + '?clientId=' + argv.cid;
}
else {
  connectstring += 'username:password@mqtt.fqdn:1883?clientId=client';
}
console.log(connectstring);
var mqtt = require('/usr/local/lib/node_modules/mqtt')
  , client = mqtt.connect(connectstring);

var publish_topic = '/status/domoticz';
var subscribe_topic = ['/jag/#','/han/#','/home/#'];
var updateDelay = 60000;
var getVariables = '/json.htm?type=command&param=getuservariables'
var getSwitches = '/json.htm?type=command&param=getlightswitches'
var switches
var variables

if (argv.dhost) {
  var domoticzHost = argv.dhost
}
else {
  var domoticzHost = '192.168.100.112'
}
if (argv.dport) {
  var domoticzPort = argv.dport
}
else {
  var domoticzPort = '8000'
}
update (getVariables, function(object) {
  variables = object
})
update (getSwitches, function(object) {
  switches = object
})


client.subscribe(subscribe_topic);

client.on('message', function(topic, message) {
  var object='';
  try{
      object=JSON.parse(message);
  }catch(e){
      console.log('Received message but parse to JSON failed: ' + message,e); //error in the above string(in this case,yes)!
  }
  var request = 'http://' + domoticzHost + ':' + domoticzPort + '/json.htm?type=command'
  console.log('Received message, topic: ' + topic + ' message: ' + message);
  switch (true) {
   case topic == "/home/domoticz/switches": 
     console.log('got switch topic')
     break
   case topic == "/home/domoticz/variables":
     console.log('got variable topic')
     break
   case /location/.test(topic):
     console.log('got location topic')
     break
   default:
     console.log('unrecognised topic: ' +topic)
}

  if (object.command && object.device) {
      if (object.device.match(/jag/)) {
          console.log('matched device jag');
  	request += '&param=switchlight&idx=29';
      }
      if (object.command.match(/on/)){
          console.log('matched command on');
  	request += '&switchcmd=On&level=0';
      }
      else if (object.command.match(/off/)){
          console.log('matched command off');
  	request += '&switchcmd=Off&level=0';
      }
    //console.log(request);
    var req = http.get(request, function(res) {
     console.log("Domoticz response: " + res.statusCode);
     res.setEncoding('utf8');
     res.on('data', function (chunk) {
         res_JSON = JSON.parse(chunk);
         console.log('status: ' + res_JSON.status);
         if (res_JSON.status == 'OK') {
           client.publish(publish_topic, JSON.stringify(object,null,2) + ' OK'); 
           console.log('Sent ' + JSON.stringify(object,null,2) + ' OK to ' + publish_topic)
         }
         else {
           client.publish(publish_topic, JSON.stringify(object,null,2) + ' FAIL');
           console.log('Sent ' + JSON.stringify(object,null,2) + ' FAIL to ' + publish_topic)
         }
    });
    }).on('error', function(e) {
      console.log("Got error: " + e.message);
    });
  
  };
    //console.log(message);
  
});

function update (uri, cb) {
  var requestStub = 'http://' + domoticzHost + ':' + domoticzPort
  var request = requestStub + uri
  console.log('updating from domoticz with request: ' + request)
  var req = http.get(request, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      res_JSON = JSON.parse(chunk);
      if (res_JSON.status == 'OK') {
        cb(res_JSON.result) 
      }
      //console.log(JSON.stringify(res_JSON.result,null,2))
    })
  }).on('error', function(e) {
    console.log("Got error: " + e.message);
  });
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
}, updateDelay);


