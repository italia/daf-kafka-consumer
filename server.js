
var fetch = require('isomorphic-fetch')

var kafka = require('kafka-node'),
   Consumer = kafka.Consumer,
   client = new kafka.Client(process.env.KAFKA_URL, process.env.CLIENT_ID, {
       sessionTimeout: parseInt(process.env.SESSION_TIMEOUT),
       spinDelay: parseInt(process.env.SPIN_DELAY),
       retries: parseInt(process.env.RETRIES)
   });
   consumer = new Consumer(
    client,
    [
        { topic: process.env.FEED_NAME, partition: 0, offset: -1 }
    ],
    {
        fromOffset: true
    }        
    ); 
    offset = new kafka.Offset(client);
    latestOffset = 0
    offset.fetch([{ topic: process.env.FEED_NAME, partition: 0, time: -1 }], function (err, data) {
    latestOffset = data[process.env.FEED_NAME]['0'][0];
    console.log("Last offset on kafka: " + latestOffset);
    let responseLastWorkedOffset = getLastWorkedOffset();
            responseLastWorkedOffset.then((response) => {
                response.json().then((json) => {
                    console.log("Last worked offset: " + json.offset);
                    consumer.setOffset(process.env.FEED_NAME, 0, json.offset)
                })
            })
    });

const webpush = require('web-push')
webpush.setVapidDetails(process.env.MAILTO, process.env.PUBLIC_VAPID_KEY, process.env.PRIVATE_VAPID_KEY);

consumer.on('message', function (message) 
{
    console.log('Processo messaggio: ' + message.offset);
    let value = JSON.parse(message.value)
    let responseKylo = createKyloFeed(value);
    responseKylo.then((response) => {
        console.log('['+message.offset+'] Risposta da Kylo - response.ok: ' + response.ok)
        console.log('['+message.offset+'] Risposta da Kylo - response.statusText: : ' + response.statusText)
        response.json().then((json) => {
                //LOG ERRORI KYLO
                console.log('['+message.offset+'] *******************************************************************')
                console.log('['+message.offset+'] Json ricevuto da kylo - title: ' + json.title)
                console.log('['+message.offset+'] Json ricevuto da kylo - description: ' + json.description)
                console.log('['+message.offset+'] Json ricevuto da kylo - localizedMessage: ' + json.localizedMessage)
                try{
                    var jsonParse = JSON.parse(json.fields)
                    if(jsonParse){
                        console.log('['+message.offset+'] Json ricevuto da kylo - jsonParse.success: ' + jsonParse.success)
                        console.log('['+message.offset+'] Json ricevuto da kylo - jsonParse.description: ' + jsonParse.description)
                        console.log('['+message.offset+'] Json ricevuto da kylo - jsonParse.validationErrors: ' + jsonParse.validationErrors)
                        console.log('['+message.offset+'] Json ricevuto da kylo - jsonParse.allErrors: ' + jsonParse.allErrors)
                        console.log('['+message.offset+'] *******************************************************************')
                    }
                } catch(errors){
                    console.log('Errore generico, campo fields non presente 1')
                }

                if(!response.ok){
                    insertError(value, message, json)
                }else{
                    try{
                        var jsonParse = JSON.parse(json.fields)
                        if(jsonParse.success)
                            insertSuccess(value, message)
                        else 
                            insertError(value, message, json)
                    } catch (errors){
                        console.log('Errore generico, campo fields non presente 2')
                    }
                }
            })
        })
})

function insertSuccess(value, message){
    var daf_data_users = (process.env.DAF_DATA_USERS_ORIG).split(',')
    console.log('['+message.offset+'] Creazione feed avvenuta con successo')
    let responseCatalog = createCatalog(value);
    responseCatalog.then((response) => {
        response.json().then((json) => {
            if(daf_data_users.indexOf(value.user)>-1){
                console.log('['+message.offset+'] Utente già presente nei daf_data_user')
            } else {
                daf_data_users.push(value.user)
                console.log('['+message.offset+'] Aggiungo utente tra daf_data_user per invio errore')
            }
            for(j=0;j<daf_data_users.length;j++){
                const notificationSuccess = {user: daf_data_users[j], notificationtype:'kylo_feed', info:{name: value.payload.dcatapit.name, title: value.payload.dcatapit.title}, timestamp: getFormattedDate() , status:0, offset: message.offset}
                console.log('['+message.offset+'] Aggiungo notifica SUCCESS ad utente ' + daf_data_users[j])
                let responseNot = addNotification(notificationSuccess, value.token);
                responseNot.then((response) => {
                    if(response.ok){
                        console.log('['+message.offset+'] Notifica per '+daf_data_users[j]+' - Notifica inserita con successo ' + JSON.stringify(notificationSuccess))
                    }else{
                        console.log('['+message.offset+'] Notifica per '+daf_data_users[j]+' - Errore nell inserimento della notifica: ' + response.statusText)
                    }
                })   
               pushNotification(daf_data_users[j], message, notificationSuccess, value.token)
            }
        })
    })
}


function insertError(value, message, json){
    var daf_data_users = (process.env.DAF_DATA_USERS_ORIG).split(',')
    console.log('['+message.offset+'] Errore durante la chiamata a Kylo')
    if(json.fields){
        var jsonParse = JSON.parse(json.fields)
        if(!jsonParse.success && jsonParse.feedProcessGroup && jsonParse.feedProcessGroup.allErrors && jsonParse.feedProcessGroup.allErrors.length>0){
            console.log('['+message.offset+'] Sono presenti errori nel json ricevuto da kylo') 
            var errorsMsg = ''
            for(i=0;i<jsonParse.feedProcessGroup.allErrors.length;i++){
                console.log('['+message.offset+'] errore ' + i + ':' + jsonParse.feedProcessGroup.allErrors[i].message)
                errorsMsg = jsonParse.feedProcessGroup.allErrors[i].message + '; ' + errorsMsg
            }
        }else{
            errorsMsg = 'Errore generico durante la creazione del dataset.'
        }
    } else {
        errorsMsg = 'Errore generico durante la creazione del dataset.'
    }
    if(daf_data_users.indexOf(value.user)>-1){
        console.log('['+message.offset+'] Utente già presente nei daf_data_user')
    } else {
        daf_data_users.push(value.user)
        console.log('['+message.offset+'] Aggiungo utente tra daf_data_user per invio errore')
    }
    for(j=0;j<daf_data_users.length;j++){
        const notificationError = {user: daf_data_users[j], notificationtype:'kylo_feed_error', info:{name: value.payload.dcatapit.name, title: value.payload.dcatapit.title, errors: errorsMsg}, timestamp: getFormattedDate() , status:0, offset: message.offset} 
        console.log('['+message.offset+'] Aggiungo notifica ERROR ad utente ' + daf_data_users[j])
        let responseNot = addNotification(notificationError, value.token);
        responseNot.then((response) => {
            if(response.ok){
                console.log('['+message.offset+'] Notifica di errore inserita con successo ' + JSON.stringify(notificationError))
            }else{
                console.log('['+message.offset+'] Errore nell inserimento della notifica: ' + response.statusText)
            }
        })
       pushNotification(daf_data_users[j], message, notificationError, value.token)
    }
}


consumer.on('error', function (err) 
{
   console.log('Errore nel processare il messaggio '+message.offset+' : ' + err.toString());
});

function pushNotification(username, message, notification, token){
    let responseSub = getSubscription(username, token);
    responseSub.then((response) => {
        if(response.ok){
            response.json().then((subscriptions) => {
                console.log('['+message.offset+'] sono state trovate ' + subscriptions.length + ' subscription per utente ' + username)
                if(subscriptions.length>0){
                    subscriptions.map((sub) => {
                        try{
                            webpush.sendNotification(sub, JSON.stringify(notification))
                            .then(() => console.log('['+message.offset+'] Notifica Push per '+username+' - Inviata con successo: ' + JSON.stringify(sub)))
                            .catch(() => console.log('['+message.offset+'] Notifica Push per '+username+' - Errore durante invio della notifica: ' + JSON.stringify(sub)))
                        }catch(exception){
                            console.log('['+message.offset+'] Errore durante il push della notifica: ' + JSON.stringify(sub))
                        }   
                    })
                }
            })
        } else {
            console.log('['+message.offset+'] Non sono state trovate subscription per l\'utente: ' + value.user)
        }
    })
}

async function getSubscription(username, token) {
   const response = await fetch( process.env.URL_SUB + "/" + username , {
       method: 'GET',
       headers: {
           'Accept': 'application/json',
           'Content-Type': 'application/json',
           'Authorization': 'Bearer ' + token
       }
   })
   return response;
}

async function createKyloFeed(value) {
   const payload = value.payload
   const fileType = payload.operational.file_type
   const response = await fetch( process.env.URL_KYLO + "/" + fileType , {
       method: 'POST',
       timeout: 240000,
       headers: {
           'Accept': 'application/json',
           'Content-Type': 'application/json',
           'Authorization': 'Bearer ' + value.token
       },
       body: JSON.stringify(payload)
   })
   return response;
}

async function createCatalog(value) {
    const payload = value.payload
    const response = await fetch(process.env.URL_CATALOG, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + value.token
        },
        body: JSON.stringify(payload)
    })
    return response;
 }

async function addNotification(notification, token) {
   const response = await fetch(process.env.URL_NOTIFICATION , {
       method: 'POST',
       headers: {
           'Accept': 'application/json',
           'Content-Type': 'application/json',
           'Authorization': 'Bearer ' + token
       },
       body: JSON.stringify(notification)
   })
   return response;
}

async function getLastWorkedOffset(){
    const response = await fetch(process.env.URL_LAST_WORKED_OFFSET, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    })
    return response;
}

function getFormattedDate() {
    var date = new Date();

    var month = date.getMonth() + 1;
    var day = date.getDate();
    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();

    month = (month < 10 ? "0" : "") + month;
    day = (day < 10 ? "0" : "") + day;
    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min;
    sec = (sec < 10 ? "0" : "") + sec;

    var str = date.getFullYear() + "-" + month + "-" + day + "_" +  hour + ":" + min + ":" + sec;
    return str;
}