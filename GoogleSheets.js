'use-strict';

const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');


const  SCOPES = ['https://www.googleapis.com/auth/analytics.readonly',
                 'https://www.googleapis.com/auth/spreadsheets'
                ];
const TOKEN_PATH = 'token.json';
const idSheets = process.env.IDSHEETS;

const Principal = (data) => {

  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
  
    const nuevoArreglo = data.map((o) =>{
  
      return Object.keys(o).reduce( (array, key) => {
          return array.concat([ o[key]]);
      }, []);
    });
    
    
    Promise.all(nuevoArreglo).then((completed) => ( authorize(JSON.parse(content), updateData , completed)))
    
    
  });

}


const authorize = (credentials, callback , data) => {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  
  const oAuth2Client = new google.auth.OAuth2( client_id, client_secret, redirect_uris[0]);

  fs.readFile(TOKEN_PATH, (err, token) => {

    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client, data);

  });
}


function getNewToken(oAuth2Client, callback) {
  
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('Authorize this app by visiting this url:', authUrl);
 
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  rl.question('Enter the code from that page here: ', (code) => {
    
    rl.close();
  
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      

      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function appendData(auth, data) {

  const sheets = google.sheets({version: 'v4', auth});
  const values = data;
   
   sheets.spreadsheets.values.append(
    {
     spreadsheetId: idSheets, 
     range: 'ListPriceSHopifySAP!A2:M' ,
     valueInputOption: "USER_ENTERED",
     resource: {
        values: values
     }
     }, (err, response) => {
        if (err) {
       return 'The API returned an error: ';
        } else {
        
          return   response ;
       }
    });
} 
 
function updateData(auth, data) {

  const sheets = google.sheets({version: 'v4', auth});
  const values = data;
   
   sheets.spreadsheets.values.update(
    {
     spreadsheetId: idSheets, 
     range: 'ListPriceSHopifySAP!A2:M',
     valueInputOption: "USER_ENTERED",
     resource: {
        values: values
     }
     }, (err, response) => {
        if (err) {
         console.log('The API returned an error: ' + err);
        } else {
        console.log("Appended" + JSON.stringify(response.data));
       }
    });
} 
 
function addSheet(auth) {
  var sheets = google.sheets('v4');
  sheets.spreadsheets.create({
    auth: auth,
    resource: {
        properties:{
            title: "Anything-you-name"
        }
    }
  }, (err, response) => {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    } else {
        console.log("Added");
    }
  });
}

function listMajors(auth) {

  const sheets = google.sheets({version: 'v4', auth});
  const options = {
                     spreadsheetId: idSheets, 
                     range: 'ListPriceSHopifySAP!A2:F' 
                  } 
  
  sheets.spreadsheets.values.get(options , (err, res) => {
    
    if (err) {
      return console.log('The API returned an error: ' + err); 
    }
    
    const rows = res.data.values;
    
    if (rows.length) {

      console.log('Name, Major:');
  
      rows.map((row) => {
        console.log(`${row[0]}, ${row[1]}`);
      });
    
    } else {
      console.log('No data found.');
    }
  });
}


module.exports.Principal = Principal ;