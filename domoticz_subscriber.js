var mqtt = require('/usr/local/lib/node_modules/mqtt')
  , client = mqtt.connect('mqtts://orkeplpr:H8xTakU5Hhbv@m20.cloudmqtt.com:20280?clientId=nook');

client.subscribe('messages');
client.on('message', function(topic, message) {
  console.log(message);
});
