var http = require('http');
var mqtt = require('/usr/local/lib/node_modules/mqtt')
  , client = mqtt.connect('mqtts://orkeplpr:H8xTakU5Hhbv@m20.cloudmqtt.com:20280?clientId=nook');

var publish_topic = '/status/domoticz';
var subscribe_topic = ['/jag/#','/han/#','/home/#'];

client.subscribe(subscribe_topic);

client.on('message', function(topic, message) {
  try{
      object=JSON.parse(message);
  }catch(e){
      console.log('Received message but parse to JSON failed: ' + message,e); //error in the above string(in this case,yes)!
  }
  var request = 'http://192.168.100.112:8000/json.htm?type=command'
  console.log('Received message, topic: ' + topic + ' message: ' + message);
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
