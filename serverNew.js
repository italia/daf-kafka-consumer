/* // PROVA TEST LOCALE
KAFKA_URL="192.168.30.12:2181/kafka"
CLIENT_ID="my-client-id"
SESSION_TIMEOUT=300
SPIN_DELAY=100
RETRIES=2
TOPIC_1_NAME="creationfeed"
TOPIC_2_NAME="notification"
TOPIC_1_TYPE="kylo_feed"
TOPIC_2_TYPE="generic"
MAILTO="mailto:daf@teamdigitale.it"
PUBLIC_VAPID_KEY="BI28-LsMRvryKklb9uk84wCwzfyiCYtb8cTrIgkXtP3EYlnwq7jPzOyhda1OdyCd1jqvrJZU06xHSWSxV1eZ_0o"
PRIVATE_VAPID_KEY="_raRRUIefbg4QjqZit7lnqGC5Zh1z6SvQ2p2HGgjobg"
DAF_DATA_USERS_ORIG="new_andrea,raippl"
URL_SUB="http://127.0.0.1:9000/dati-gov/v1/subscribe"
URL_KYLO="http://127.0.0.1:9001/catalog-manager/v1/kylo/feed"
URL_CATALOG="http://127.0.0.1:9001/catalog-manager/v1/catalog-ds/add"
URL_NOTIFICATION="http://127.0.0.1:9000/dati-gov/v1/notification/save"
URL_LAST_WORKED_OFFSET="http://127.0.0.1:9000/dati-gov/v1/notifications/offset/last"  */

//PRODUCTION (CONFIGMAP)
KAFKA_URL=process.env.KAFKA_URL
CLIENT_ID=process.env.CLIENT_ID
SESSION_TIMEOUT=300
SPIN_DELAY=100
RETRIES=2
TOPIC_1_NAME=process.env.TOPIC_1_NAME
TOPIC_2_NAME=process.env.TOPIC_2_NAME
TOPIC_1_TYPE=process.env.TOPIC_1_TYPE
TOPIC_2_TYPE=process.env.TOPIC_2_TYPE
MAILTO=process.env.MAILTO
PUBLIC_VAPID_KEY=process.env.PUBLIC_VAPID_KEY
PRIVATE_VAPID_KEY=process.env.PRIVATE_VAPID_KEY
DAF_DATA_USERS_ORIG=process.env.DAF_DATA_USERS_ORIG
URL_SUB=process.env.URL_SUB
URL_KYLO=process.env.URL_KYLO
URL_CATALOG=process.env.URL_CATALOG
URL_NOTIFICATION=process.env.URL_NOTIFICATION
URL_LAST_WORKED_OFFSET=process.env.URL_LAST_WORKED_OFFSET

var fetch = require('isomorphic-fetch')

const webpush = require('web-push')
webpush.setVapidDetails(MAILTO, PUBLIC_VAPID_KEY, PRIVATE_VAPID_KEY);

var kafka = require('kafka-node');
var client = new kafka.Client(KAFKA_URL, CLIENT_ID, {
    sessionTimeout: SESSION_TIMEOUT,
    spinDelay: SPIN_DELAY,
    retries: RETRIES
});

var consumer = new kafka.Consumer(
    client,
    [
        { topic: TOPIC_1_NAME, partition: 0, offset: -1 }
    ],
    {
        fromOffset: true
    }        
    ); 
var offset = new kafka.Offset(client);

offset.fetch([{ topic: TOPIC_1_NAME, partition: 0, time: -1 }], function (err, data) {
    let responseLastWorkedOffset = getLastWorkedOffset(TOPIC_1_TYPE);
            responseLastWorkedOffset.then((response) => {
                response.json().then((json) => {
                    console.log("Last worked offset [TOPIC_1_TYPE]: " + json.offset);
                    consumer.setOffset(TOPIC_1_NAME, 0, json.offset)
                })
            })
    })


var client2 = new kafka.Client(KAFKA_URL, CLIENT_ID, {
    sessionTimeout: SESSION_TIMEOUT,
    spinDelay: SPIN_DELAY,
    retries: RETRIES
});
var consumer2 = new kafka.Consumer(
    client2,
    [
        { topic: TOPIC_2_NAME, partition: 0, offset: -1 }
    ],
    {
        fromOffset: true
    }        
    ); 

var offset2 = new kafka.Offset(client2);

offset2.fetch([{ topic: TOPIC_2_NAME, partition: 0, time: -1 }], function (err, data) {
    let responseLastWorkedOffset = getLastWorkedOffset(TOPIC_2_TYPE);
            responseLastWorkedOffset.then((response) => {
                response.json().then((json) => {
                    console.log("Last worked offset [TOPIC_2_TYPE]: " + json.offset);
                    consumer2.setOffset(TOPIC_2_NAME, 0, json.offset)
                })
            })
    })

consumer.on('error', function (err) 
{
   console.log('Errore nel processare il messaggio, consumer: '+message.offset+' : ' + err.toString());
});

consumer2.on('error', function (err) 
{
   console.log('Errore nel processare il messaggio, consumer2: '+message.offset+' : ' + err.toString());
});

consumer2.on('message', function(message){
    try{
        console.log('A message from notification: ', message);
        let value = JSON.parse(message.value)
        const notification = {user: value.user, notificationtype:value.notificationtype?value.notificationtype:TOPIC_2_TYPE, info:{name: value.info.name, title: value.info.title, description: value.info.description, link: value.info.link }, timestamp: getFormattedDate() , status:0, offset: message.offset}
        if(notification && value.user && value.token)
            insertNotification(notification, value.user, value.token)
        else console.log('Dati mancanti nel messagio')
    } catch(errors){
        console.log('Errore durante l\'elaborazione del messaggio: ' + message)
    }
});

consumer.on('message', function (message) 
{
    console.log('Processo messaggio: ' + message.offset);
    try{
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
                    
                    var jsonParse = JSON.parse(json.fields)
                    if(jsonParse){
                        console.log('['+message.offset+'] Json ricevuto da kylo - jsonParse.success: ' + jsonParse.success)
                        console.log('['+message.offset+'] Json ricevuto da kylo - jsonParse.description: ' + jsonParse.description)
                        console.log('['+message.offset+'] Json ricevuto da kylo - jsonParse.validationErrors: ' + jsonParse.validationErrors)
                        console.log('['+message.offset+'] Json ricevuto da kylo - jsonParse.allErrors: ' + jsonParse.allErrors)
                        console.log('['+message.offset+'] *******************************************************************')
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
        } catch(errors){
            console.log('Errore durante l\'elaborazione del messaggio: ' + message + " ERRORE: " + errors)
        }
}) 

function insertNotification(notification, user, token){
    try{
        console.log('Elaboro notifica: ' + JSON.stringify(notification))
        console.log('addNotification')
        let responseNot = addNotification(notification, token)
        responseNot.then((response) => {
            if(response.ok){
                console.log('Notifica inserita con successo')
                console.log('pushNotification')
                pushNotification(user, notification, token)
            }else{
                console.log('Errore nell inserimento della notifica: ' + response.statusText)
            }
        }) 
    } catch(errors){
        console.log('Errore generico nell\'elaborazione')
    }
}

function insertSuccess(value, message){
    var daf_data_users = (DAF_DATA_USERS_ORIG).split(',')
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
                const notificationSuccess = {user: daf_data_users[j], notificationtype:TOPIC_1_TYPE, info:{name: value.payload.dcatapit.name, title: value.payload.dcatapit.title}, timestamp: getFormattedDate() , status:0, offset: message.offset}
                console.log('['+message.offset+'] Aggiungo notifica SUCCESS ad utente ' + daf_data_users[j])
                insertNotification(notificationSuccess, daf_data_users[j], value.token)
            }
        })
    })
}


function insertError(value, message, json){
    var daf_data_users = (DAF_DATA_USERS_ORIG).split(',')
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
        const notificationError = {user: daf_data_users[j], notificationtype:TOPIC_1_TYPE, info:{name: value.payload.dcatapit.name, title: value.payload.dcatapit.title, errors: errorsMsg}, timestamp: getFormattedDate() , status:0, offset: message.offset} 
        console.log('['+message.offset+'] Aggiungo notifica ERROR ad utente ' + daf_data_users[j])
        insertNotification(notificationError, daf_data_users[j], value.token)

    }
}

function pushNotification(username, notification, token){
    let responseSub = getSubscription(username, token);
    responseSub.then((response) => {
        if(response.ok){
            response.json().then((subscriptions) => {
                console.log('Sono state trovate ' + subscriptions.length + ' subscription per utente ' + username)
                if(subscriptions.length>0){
                    subscriptions.map((sub) => {
                        try{
                            webpush.sendNotification(sub, JSON.stringify(notification))
                            .then(() => console.log('Notifica Push per '+username+' - Inviata con successo: ' + JSON.stringify(sub)))
                            .catch(() => console.log('Notifica Push per '+username+' - Errore durante invio della notifica: ' + JSON.stringify(sub)))
                        }catch(exception){
                            console.log('Errore durante il push della notifica: ' + JSON.stringify(sub))
                        }   
                    })
                }
            })
        } else {
            console.log('Non sono state trovate subscription per l\'utente: ' + username)
        }
    })
}

async function getSubscription(username, token) {
   const response = await fetch(URL_SUB + "/" + username , {
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
   const response = await fetch(URL_KYLO + "/" + fileType , {
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
    const response = await fetch(URL_CATALOG, {
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
   const response = await fetch(URL_NOTIFICATION, {
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

async function getLastWorkedOffset(topicName){
    const response = await fetch(URL_LAST_WORKED_OFFSET + "/" +topicName, {
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