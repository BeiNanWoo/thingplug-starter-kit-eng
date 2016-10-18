/*
 ThingPlug StarterKit for LoRa version 0.1
 
 Copyright © 2016 IoT Tech. Lab of SK Telecom All rights reserved.

	Licensed under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	http://www.apache.org/licenses/LICENSE-2.0
	Unless required by applicable law or agreed to in writing, software
	distributed under the License is distributed on an "AS IS" BASIS,
	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	See the License for the specific language governing permissions and
	limitations under the License.

*/

'use strict';

var colors = require('colors');
var xml2js = require('xml2js');
var async = require('async');

var util = require('util');
var mqtt = require('mqtt');

//--------------------------------------------------------Connection Declaration-----------------------------------------------//
var config = require('./config_1');
console.log(colors.green('### ThingPlug virtual Device###'));
if(typeof config === 'undefined') {
  return console.log(colors.red('if no config_#.js, please check README.md and check optionData in config file'));
}

console.log(colors.green('0. Connect with MQTT Broker'));

//=============================================================================================================================//


//-----------------------------------------------------Virtual Sensor Data-----------------------------------------------------//
var IntervalFunction;
//=============================================================================================================================//

//-----------------------------------------------randomInt Function for Create Request ID--------------------------------------//
function randomInt (low, high) {
	return Math.floor(Math.random() * (high - low + 1) + low);
}
//=============================================================================================================================//

MQTTClient();
function MQTTClient(){

  
  var self = this;
  
  var isRunning = 1;
  var reqHeader = "<m2m:req xmlns:m2m=\"http://www.onem2m.org/xml/protocols\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.onem2m.org/xml/protocols CDT-requestPrimitive-v1_0_0.xsd\">";
  
  var client = mqtt.connect('mqtt://'+config.TPhost, {
	username:config.userID,			//user ID to connect with MQTT broker
	password:config.uKey,			//password to connect with MQTT broker(uKey of portal)
	clientId:config.mqttClientId,	//Client ID to connect with MQTT broker
	clean:true						//clean session
  });
	client.on('connect', function () {
		console.log('### mqtt connected ###');
//---------------------------------------------------Subscribe Declaration-----------------------------------------------------//
		client.subscribe("/oneM2M/req/+/"+ config.nodeID);		
		client.subscribe("/oneM2M/resp/"+ config.nodeID +"/+");
//=============================================================================================================================//


//---------------------------------------------------1. Request node Creation--------------------------------------------------//
		var op = "<op>1</op>";
		var to = "<to>"+"/"+config.AppEUI+"/"+config.version+"</to>";
		var fr = "<fr>"+config.nodeID+"</fr>";
		var ty = "<ty>14</ty>";
		var ri = "<ri>"+config.nodeID+'_'+randomInt(100000, 999999)+"</ri>";
		var cty = "<cty>application/vnd.onem2m-prsp+xml</cty>";
		var nm = "<nm>"+config.nodeID+"</nm>";
		var reqBody = "<pc><nod><ni>"+config.nodeID+"</ni><mga>MQTT|"+config.nodeID+"</mga></nod></pc></m2m:req>";
		
		var createNode = reqHeader+op+to+fr+ty+ri+cty+nm+reqBody;
		client.publish("/oneM2M/req/"+ config.nodeID +"/"+config.AppEUI, createNode, {qos : 1}, function(){
			console.log(colors.yellow('1. Request node Creation'));
			isRunning = "node";
					
		});
//=============================================================================================================================//		
	});
	
  client.on('close', function(){
		console.log('### mqtt disconnected ###');
  });
  
	client.on('error', function(error){
	console.log(error);
    self.emit('error', error);
  });
	
	client.on('message', function(topic, message){
		if("ContentInstance"!=isRunning){
		console.log(' ');
		}
		var msgs = message.toString().split(',');
	  
		  xml2js.parseString( msgs, function(err, xmlObj){
			if(!err){
//---------------------------------------------------1. node Creation Response------------------------------------------------//
				if("node"==isRunning){
					console.log(colors.green('1. node Creation Response'));
					if(xmlObj['m2m:rsp']['rsc'][0] == 4105){
						console.log(colors.white('Already exists node'));
					}
					console.log("Created node Resource ID : "+xmlObj['m2m:rsp']['pc'][0]['nod'][0]['ri'][0]);//
					config.nodeRI = xmlObj['m2m:rsp']['pc'][0]['nod'][0]['ri'][0];

					console.log('content-location: '+ "/"+config.AppEUI+ "/"+config.version + '/' + isRunning + '-' + config.nodeID);
//=============================================================================================================================//

//-------------------------------------------------2. Request remoteCSE Creation-----------------------------------------------//
					var op = "<op>1</op>";
					var to = "<to>"+"/"+config.AppEUI+"/"+config.version+"</to>";
					var fr = "<fr>"+config.nodeID+"</fr>";
					var ty = "<ty>16</ty>";
					var ri = "<ri>"+config.nodeID+'_'+randomInt(100000, 999999)+"</ri>";
					var passCode = "<passCode>"+config.passCode+"</passCode>";
					var cty = "<cty>application/vnd.onem2m-prsp+xml</cty>";
					var nm = "<nm>"+config.nodeID+"</nm>";
					var reqBody = "<pc><csr><cst>3</cst><csi>"+config.nodeID+"</csi><rr>true</rr><nl>"+config.nodeRI+"</nl></csr></pc></m2m:req>";
					
					var createRemoteCSE = reqHeader+op+to+fr+ty+ri+passCode+cty+nm+reqBody;
					client.publish("/oneM2M/req/"+ config.nodeID + "/"+config.AppEUI, createRemoteCSE, {qos : 1}, function(){
						console.log(' ');
						console.log(colors.yellow('2. Request remoteCSE Creation '));
						isRunning = "remoteCSE";
					});
				}
//=============================================================================================================================//

//------------------------------------------------2. remoteCSE Creation Response-----------------------------------------------//	
				else if("remoteCSE"==isRunning){
					console.log(colors.green('2. remoteCSE Creation Response'));
					if(xmlObj['m2m:rsp']['rsc'][0] == 4105){
						console.log(colors.white('Already exists remoteCSE'));
					}
					console.log("dKey : "+xmlObj['m2m:rsp']['dKey'][0]);//
					config.dKey = xmlObj['m2m:rsp']['dKey'][0];
					
					
					console.log('content-location: '+ "/"+config.AppEUI+ "/"+config.version + '/' + isRunning + '-' + config.nodeID);
//=============================================================================================================================//

//---------------------------------------------------3. Request container Creation----------------------------------------------------//	
					var op = "<op>1</op>";
					var to = "<to>"+"/"+config.AppEUI+"/"+config.version+"/remoteCSE-"+config.nodeID+"</to>";
					var fr = "<fr>"+config.nodeID+"</fr>";
					var ty = "<ty>3</ty>";
					var ri = "<ri>"+config.nodeID+'_'+randomInt(100000, 999999)+"</ri>";
					var nm = "<nm>"+config.containerName+"</nm>";
					var dKey = "<dKey>"+config.dKey+"</dKey>";
					var cty = "<cty>application/vnd.onem2m-prsp+xml</cty>";
					var reqBody = "<pc><cnt><lbl>con</lbl></cnt></pc></m2m:req>";
					
					var createContainer = reqHeader+op+to+fr+ty+ri+nm+dKey+cty+reqBody;
					client.publish("/oneM2M/req/"+ config.nodeID +"/"+config.AppEUI, createContainer, {qos : 1}, function(){
						console.log(' ');
						console.log(colors.yellow('3. Request container Creation'));
						isRunning = "container";
					});
				}
//=============================================================================================================================//

//--------------------------------------------3. container Creation Response-------------------------------------------------//
				else if("container"==isRunning){
					console.log(colors.green('3. container Creation Response'));
					if(xmlObj['m2m:rsp']['rsc'][0] == 4105){
						console.log(colors.white('Already exists container'));
					}
					console.log('content-location: '+ "/"+config.AppEUI+ "/"+config.version + '/remoteCSE-' + config.nodeID + '/' + isRunning + '-' + config.containerName);
//=============================================================================================================================//

//---------------------------4. Request DevReset(mgmtCmd) Creation--------------------------------------//
					var op = "<op>1</op>";
					var to = "<to>"+"/"+config.AppEUI+"/"+config.version+"</to>";
					var fr = "<fr>"+config.nodeID+"</fr>";
					var ty = "<ty>12</ty>";
					var ri = "<ri>"+config.nodeID+'_'+randomInt(100000, 999999)+"</ri>";
					var nm = "<nm>"+config.nodeID+"_"+config.DevReset+"</nm>";
					var dKey = "<dKey>"+config.dKey+"</dKey>";
					var cty = "<cty>application/vnd.onem2m-prsp+xml</cty>";
					var reqBody = "<pc><mgc><cmt>"+config.DevReset+"</cmt><exe>false</exe><ext>"+config.nodeRI+"</ext></mgc></pc></m2m:req>";
					
					var createDevReset = reqHeader+op+to+fr+ty+ri+nm+dKey+cty+reqBody;
					client.publish("/oneM2M/req/"+ config.nodeID +"/"+config.AppEUI, createDevReset, {qos : 1}, function(){
						console.log(' ');
						console.log(colors.yellow('4. Request DevReset(mgmtCmd) Creation'));
						isRunning = "DevReset";
					});
				}
//=============================================================================================================================//

//---------------------4. DevReset(mgmtCmd) Creation Response----------------------------------//
				else if("DevReset"==isRunning){
					console.log(colors.green('4. DevReset(mgmtCmd) Creation Response'));	
					if(xmlObj['m2m:rsp']['rsc'][0] == 4105){
						console.log(colors.white('Already exists DevReset'));
					}
					console.log('content-location: '+ "/"+config.AppEUI+ "/"+config.version + '/mgmtCmd-' + config.nodeID + '_' + isRunning);
//=============================================================================================================================//

//---------------------------4. Request extDevMgmt(mgmtCmd) Creation----------------------------------//
					var op = "<op>1</op>";
					var to = "<to>"+"/"+config.AppEUI+"/"+config.version+"</to>";
					var fr = "<fr>"+config.nodeID+"</fr>";
					var ty = "<ty>12</ty>";
					var ri = "<ri>"+config.nodeID+'_'+randomInt(100000, 999999)+"</ri>";
					var nm = "<nm>"+config.nodeID+"_"+config.extDevMgmt+"</nm>";
					var dKey = "<dKey>"+config.dKey+"</dKey>";
					var cty = "<cty>application/vnd.onem2m-prsp+xml</cty>";
					var reqBody = "<pc><mgc><cmt>"+config.extDevMgmt+"</cmt><exe>false</exe><ext>"+config.nodeRI+"</ext></mgc></pc></m2m:req>";
					
					var createRepPerChange = reqHeader+op+to+fr+ty+ri+nm+dKey+cty+reqBody;
					client.publish("/oneM2M/req/"+ config.nodeID +"/"+config.AppEUI, createRepPerChange, {qos : 1}, function(){
						console.log(' ');
						console.log(colors.yellow('4. Request extDevMgmt(mgmtCmd) Creation'));
						isRunning = "extDevMgmt";
					});
				}
//=============================================================================================================================//

//---------------------4. extDevMgmt(mgmtCmd) Creation Response------------------------------//
				else if("extDevMgmt"==isRunning){
					console.log(colors.green('4. extDevMgmt(mgmtCmd) Creation Response'));	
					if(xmlObj['m2m:rsp']['rsc'][0] == 4105){
						console.log(colors.white('Already exists extDevMgmt'));
					}
					console.log('content-location: '+ "/"+config.AppEUI+ "/"+config.version + '/mgmtCmd-' + config.nodeID + '_' + isRunning);
//=============================================================================================================================//

//------------------------------5. Request ContentInstance Creation for Sensor Data------------------------------------//					
					console.log(' ');
					console.log(colors.yellow('5. Request ContentInstance Creation for Sensor Data'));
					IntervalFunction = setInterval(IntervalProcess, config.UPDATE_CONTENT_INTERVAL); // Regular contentInstance Creation
					isRunning = "ContentInstance";
				}
//=============================================================================================================================//
	
				else if("ContentInstance"==isRunning){
						try{
//----------------------------------------------------mgmtCmd PUSH Message Subscribe----------------------------------------------------//
							if(xmlObj['m2m:req']){
								console.log(colors.red('#####################################'));
								console.log(colors.red('MQTT Subscription'));
								console.log('RI : '+xmlObj['m2m:req']['pc'][0]['exin'][0]['ri'][0]);		//Resource ID, (ex : EI000000000000000)
								console.log('CMT : '+xmlObj['m2m:req']['pc'][0]['exin'][0]['cmt'][0]);		//command Type
								console.log('EXRA : '+xmlObj['m2m:req']['pc'][0]['exin'][0]['exra'][0]);	//Execute Argument
								
								var req = JSON.parse(xmlObj['m2m:req']['pc'][0]['exin'][0]['exra'][0]);
								var cmt = xmlObj['m2m:req']['pc'][0]['exin'][0]['cmt'][0];
								
								processCMD(req, cmt);
//=============================================================================================================================//

//----------------------------------------- 6. Update mgmtCmd Execute Result - updateExecInstance---------------------------------------//
								var exin_ri = xmlObj['m2m:req']['pc'][0]['exin'][0]['ri'][0];
								
								var op = "<op>3</op>";
								var to = "<to>"+"/"+config.AppEUI+"/"+config.version+"/mgmtCmd-"+config.nodeID+"_"+cmt+"/execInstance-"+exin_ri+"</to>";
								var fr = "<fr>"+config.nodeID+"</fr>";
								var ty = "<ty>12</ty>";
								var ri = "<ri>"+config.nodeID+'_'+randomInt(100000, 999999)+"</ri>";
								var dKey = "<dKey>"+config.dKey+"</dKey>";
								var cty = "<cty>application/vnd.onem2m-prsp+xml</cty>";
								var reqBody = "<pc><exin><exs>3</exs><exr>0</exr></exin></pc></m2m:req>";
					
								var updateExecInstance = reqHeader+op+to+fr+ri+dKey+cty+reqBody;
								client.publish("/oneM2M/req/"+ config.nodeID +"/"+config.AppEUI, updateExecInstance, {qos : 1}, function(){
									console.log(colors.red('#####################################'));
									isRunning = "updateExecInstance";
								});
//=============================================================================================================================//
							}
//-------------------------5. ContentInstance Creation for Sensor Data Response-------------------------------//	
							else if(xmlObj['m2m:rsp']['pc'][0]['cin'][0]['ty'][0] == 4){
								console.log(colors.white('content : ' + xmlObj['m2m:rsp']['pc'][0]['cin'][0]['con'][0] + ', resourceID : '+ xmlObj['m2m:rsp']['pc'][0]['cin'][0]['ri'][0]));		
							}
//=============================================================================================================================//
						}
						catch(e){
							console.error(colors.yellow(msgs));
							console.error(colors.yellow(e));
						}
				}
//----------------------------------------- 6. mgmtCmd Execute Result update - updateExecInstance---------------------------------------//
				else if("updateExecInstance"==isRunning){
					isRunning = "ContentInstance";
				}
//=============================================================================================================================//
			}
      });
		
  });     

//----------------------------------Request ContentInstance Creation for virtual Sensor Data---------------------------------------------//  
 function IntervalProcess(){
	  var op = "<op>1</op>";
	  var to = "<to>"+"/"+config.AppEUI+"/"+config.version+"/remoteCSE-"+config.nodeID+"/container-"+config.containerName+"</to>";
	  var fr = "<fr>"+config.nodeID+"</fr>";
	  var ty = "<ty>4</ty>";
	  var ri = "<ri>"+config.nodeID+'_'+randomInt(100000, 999999)+"</ri>";
	  var dKey = "<dKey>"+config.dKey+"</dKey>";
	  var cty = "<cty>application/vnd.onem2m-prsp+xml</cty>";
	  var reqBody = "<pc><cin><cnf>text</cnf><con>"+config.contents()+"</con></cin></pc></m2m:req>";
	 
	  var createContentInstance = reqHeader+op+to+fr+ty+ri+cty+dKey+reqBody;
	  client.publish("/oneM2M/req/"+ config.nodeID +"/"+config.AppEUI, createContentInstance, {qos : 1}, function(){
					
	  });
    }
//=============================================================================================================================//


//----------------------------------------------------mgmtCmd PUSH Message Subscribe----------------------------------------------------//
function processCMD(req, cmt){
	if(cmt=='RepImmediate'){
		config.BASE_TEMP = 10;
	}
	else if(cmt=='RepPerChange'){
		config.UPDATE_CONTENT_INTERVAL = req.cmd*1000;
		console.log('UPDATE_CONTENT_INTERVAL: ' + config.UPDATE_CONTENT_INTERVAL);
		clearInterval(IntervalFunction);
		IntervalFunction = setInterval(IntervalProcess, config.UPDATE_CONTENT_INTERVAL);
	}
	else if(cmt=='DevReset'){
		config.BASE_TEMP = 30;		
	}
	else if(cmt=='extDevMgmt'){
		console.log("commamd Type : " + cmt);
		console.log("commamd : " + req.cmd);
	}
	else{
		console.log('Unknown CMD');
	}
}
//=============================================================================================================================//
 
  

}

