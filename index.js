var https = require('https');

exports.handler = async (event, context) => {
   
    console.log('Hello from Lambda: Received event:',JSON.stringify(event, null,2));
    
    var intent = event.currentIntent.name;
    var slots = event.currentIntent.slots;
    
    var ticketType = slots.ticketType.toLowerCase();
    
    return new Promise((resolve, reject) => {
      
      
      if (intent == 'GetTickets') {
        var ticketCount = slots.ticketCount;
        getTickets(ticketType, ticketCount, resolve, reject);       // Get the records
      }
      else if (intent == 'LogTicket') {
        var shortDesc = slots.shortDesc;
        logTicket(ticketType, shortDesc, resolve, reject);
      }
    });
    
    
};

// Get tickets from ServiceNow
//
function getTickets(recType, count, resolve, reject) {
  
  var snowInstance = process.env.SERVICENOW_HOST;

  var options = {
      hostname: snowInstance,
      port: 443,
      path: '/api/now/table/' + recType + '?sysparm_query=ORDERBYDESCsys_updated_on&sysparm_limit='+count,
      method: 'get',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Basic ' + Buffer.from(process.env.SERVICENOW_USERNAME + ":" + process.env.SERVICENOW_PASSWORD).toString('base64'),
      }
  };
  
  var request = https.request(options, function(response) {
      var returnData = '';
     
      response.on('data', chunk => returnData += chunk);

      response.on('end', function() {
        var responseObj = JSON.parse(returnData);
        
        if(responseObj.result){
          let speechText =  "Here are the " + count + " most recent incidents: ";
          for (let i = 0; i < count; i++) {
            var rec_number = i + 1;

            speechText += "Record " + (i+1) + " " + responseObj.result[i].short_description + ". ";
          }
          speechText += "End of tickets.";
          var retMsg = {
            'sessionAttributes': {},
            'dialogAction': {
              'type': 'Close',
              'fulfillmentState': 'Fulfilled',
              'message': {
                'contentType': 'PlainText',
                'content': speechText
              }
            }
          }
          resolve(retMsg);
        }
        else{
          reject(JSON.parse('{"Error": "No tickets Found"}'));
        }
        
      });

      response.on('error', e => context.fail('error:' + e.message));
    });
    
   request.end();
}

function logTicket(recType, shortDesc, resolve, request) {
  
  var requestData = {
        "short_description": shortDesc,
        "created_by": 'me',
        "caller_id": 'me'
  };
  var postData = JSON.stringify(requestData);
    
  var options = {
        host: process.env.SERVICENOW_HOST,
        port: '443',
        path: '/api/now/table/' + recType,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(process.env.SERVICENOW_USERNAME + ":" + process.env.SERVICENOW_PASSWORD).toString('base64'),
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    var request = https.request(options, function (res) {
        var body = '';

        res.on('data', chunk => body += chunk);
        res.on('end', function() {
          var retMsg = {
            'sessionAttributes': {},
            'dialogAction': {
              'type': 'Close',
              'fulfillmentState': 'Fulfilled',
              'message': {
                'contentType': 'PlainText',
                'content': "Ticket created"
              }
            }
          }
          resolve(retMsg);
        });
        res.on('error', e => context.fail('error:' + e.message));
    });

    request.write(postData);
    request.end();
}
