lightwaveproxy
==============

Node.js proxy to queue requests to the wifi controlller to prevent garbled/lost messages

domoticz_subscriber.js
======================

Node.js MQTT subscriber to receive events from MQTT and to publish results of interactions with domoticz

It will look for a config file named domoticz_subscriber.json in /usr/local/etc and load those values if the file exists,
otherwise the default values can be overridden with the following command line arguments:

--user=username

--pass=password

--host=MQTT_host

--port=MQTT_TLS_port

--cid=ClientID

--secure

--dhost=domoticz_host

--dport=domoticz_port

--duser=domoticz_user

--dpass=domoticz_pass

--updateInterval=interval_msecs

--subtopic="'topic1','/topic2/+','/topics3/#'"

--pubtopic="/status"
