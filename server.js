
var fetch = require('isomorphic-fetch')

var kafka = require('kafka-node'),
   Consumer = kafka.Consumer,
   //TEST
   //client = new kafka.Client("192.168.30.12:2181/kafka", "my-client-id", {
    
   //PROD
   client = new kafka.Client("192.168.0.23:2181/kafka", "my-client-id", {
       sessionTimeout: 300,
       spinDelay: 100,
       retries: 2
   });
   offset = new kafka.Offset(client);
   latestOffset = 0
   offset.fetch([{ topic: 'creationfeed', partition: 0, time: -1 }], function (err, data) {
       latestOffset = data['creationfeed']['0'][0];
       console.log("Consumer current offset: " + latestOffset);
   });
   consumer = new Consumer(
        client,
       [
           { topic: 'creationfeed', partition: 0, offset: 0 }
       ],
       {
           fromOffset: true
       }        
   ); 

const webpush = require('web-push')
const publicVapidKey = 'BI28-LsMRvryKklb9uk84wCwzfyiCYtb8cTrIgkXtP3EYlnwq7jPzOyhda1OdyCd1jqvrJZU06xHSWSxV1eZ_0o';
const privateVapidKey = '_raRRUIefbg4QjqZit7lnqGC5Zh1z6SvQ2p2HGgjobg';
webpush.setVapidDetails('mailto:daf@teamdigitale.it', publicVapidKey, privateVapidKey);

const urlSub = 'http://datipubblici.default.svc.cluster.local:9000/dati-gov/v1/subscribe'
const urlNotification = 'http://datipubblici.default.svc.cluster.local:9000/dati-gov/v1/notification/save' 
const urlCatalog = 'http://catalog-manager.default.svc.cluster.local:9000/catalog-manager/v1/catalog-ds/add'
const urlKylo = 'http://catalog-manager.default.svc.cluster.local:9000/catalog-manager/v1/kylo/feed'

//TEST
//const urlSub = 'http://datipubblici.default.svc.cluster.local:9001/dati-gov/v1/subscribe'
//const urlNotification = 'http://datipubblici.default.svc.cluster.local:9001/dati-gov/v1/notification/save'

//MOCK
//const urlKylo = 'http://localhost:3001/catalog-manager/v1/kylo/feed'
//const urlCatalog = 'http://localhost:3001/catalog-manager/v1/catalog-ds/add'

//KONG
/* const urlSub = 'https://api.daf.teamdigitale.it/dati-gov/v1/subscribe'
const urlKylo = 'https://api.daf.teamdigitale.it/catalog-manager/v1/kylo/feed'
const urlNotification = 'https://api.daf.teamdigitale.it/dati-gov/v1/notification/save' 
const urlcatalog = 'https://api.daf.teamdigitale.it/catalog-manager/v1/catalog-ds/add'
 */

var daf_data_users= ["crimenghini","d_ale","d_mc","d_raf","rlillo","atroisi","raippl","dveronese","davidepanella","ctofani"]

/*
var daf_data_users= ["d_ale","raippl","ctofani"]
*/

consumer.on('message', function (message) 
{
   console.log('offset ' + message.offset)
    if(message.offset>=latestOffset){
       console.log('Processo messaggio: ' + message.offset);
        let value = JSON.parse(message.value)
        let responseKylo = createKyloFeed(value);
        responseKylo.then((response) => {
            console.log('['+message.offset+'] Risposta da Kylo - response.ok: ' + response.ok)
            console.log('['+message.offset+'] Risposta da Kylo - response.statusText: : ' + response.statusText)
            response.json().then((json) => {
                    console.log('['+message.offset+'] Json ricevuto da kylo: ' + JSON.stringify(json))
                    if(!response.ok){
                     /*  var jsonParse = JSON.parse(json.fields)
                      if(jsonParse.description.indexOf("TimeoutException")!==-1){
                        console.log('['+message.offset+'] TimeoutException ricevuto da Kylo')
                        insertSuccess(value, message)
                      }else{ */
                        insertError(value, message, json)
                     // }
                    }else{
                        var jsonParse = JSON.parse(json.fields)
                        if(jsonParse.success)
                            insertSuccess(value, message)
                        else 
                            insertError(value, message, json)
                    }
                })
            }) 
   } 
})

function insertSuccess(value, message){
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
    console.log('['+message.offset+'] Errore durante la chiamata a Kylo')
    if(json.fields){
        var jsonParse = JSON.parse(json.fields)
        if(!jsonParse.success && jsonParse.feedProcessGroup.allErrors.length>0){
            console.log('['+message.offset+'] Sono presenti errori nel json ricevuto da kylo') 
            var errorsMsg = ''
            for(i=0;i<jsonParse.feedProcessGroup.allErrors.length;i++){
                console.log('['+message.offset+'] errore ' + i + ':' + jsonParse.feedProcessGroup.allErrors[i].message)
                errorsMsg = jsonParse.feedProcessGroup.allErrors[i].message + '; ' + errorsMsg
            }
        }
    } else {
        errorsMsg = 'Errore generico durante la chiamata a Kylo.'
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
   const response = await fetch( urlSub + "/" + username , {
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
   const response = await fetch( urlKylo + "/" + fileType , {
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
    const response = await fetch(urlCatalog, {
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
   const response = await fetch( urlNotification , {
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