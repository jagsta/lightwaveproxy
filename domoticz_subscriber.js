var http = require('http');
var mqtt = require('/usr/local/lib/node_modules/mqtt')
  , client = mqtt.connect('mqtts://orkeplpr:H8xTakU5Hhbv@m20.cloudmqtt.com:20280?clientId=nook');

client.subscribe('messages');
client.on('message', function(topic, message) {
  try{
      object=JSON.parse(message);
  }catch(e){
      console.log('Parse to JSPN failed: ' + message,e); //error in the above string(in this case,yes)!
  }
  var request = 'http://192.168.100.112:8000/json.htm?type=command'
  if (object.command && object.device) {
      console.log(object.device, object.command);
      if (object.device.match(/exus5/)) {
          console.log('matched device');
  	request += '&param=updateuservariable&idx=1&vname=Nexus5&vtype=2';
      }
      if (object.command.match(/on/)){
          console.log('matched on');
  	request += '&vvalue=1';
      }
      else if (object.command.match(/off/)){
          console.log('matched off');
  	request += '&vvalue=0';
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
