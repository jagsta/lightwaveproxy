var http = require('http');
var mqtt = require('/usr/local/lib/node_modules/mqtt')
  , client = mqtt.connect('mqtts://orkeplpr:H8xTakU5Hhbv@m20.cloudmqtt.com:20280?clientId=nook');

client.subscribe('#');
client.on('message', function(topic, message) {
  try{
      object=JSON.parse(message);
  }catch(e){
      console.log('Parse to JSPN failed: ' + message,e); //error in the above string(in this case,yes)!
  }
  var request = 'http://192.168.100.112:8000/json.htm?type=command'
  console.log('topic: ' + topic);
  if (object.command && object.device) {
      console.log(object.device, object.command);
      if (object.device.match(/jag/)) {
          console.log('matched device jag');
  	request += '&param=switchlight&idx=29';
      }
      if (object.command.match(/on/)){
          console.log('matched on');
  	request += '&switchcmd=1&level=0';
      }
      else if (object.command.match(/off/)){
          console.log('matched off');
  	request += '&switchcmd=0&level=0';
      }
    console.log(request);
    var req = http.get(request, function(res) {
     console.log("Got response: " + res.statusCode);
    }).on('error', function(e) {
      console.log("Got error: " + e.message);
    });
  
  };
    //console.log(message);
  
});
