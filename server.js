'use strict'

const express = require ('express');
const jsonGraphqlExpress = require ('json-graphql-server');
const testFolder = './people/';
const fs = require('fs');

// proxy for adding id properly to new Objects
var proxyHandlerObj = {
  set:function(target,property,value,receiver) {
    let idx = receiver.length + 1;
    let isUsername = value.hasOwnProperty("username");
    return property !== "length"
       ? isUsername
          ? (target[property] = {...value, id : idx, personal_basic_detail_id : idx, business_basic_detail_id: idx})
          : (target[property] = {...value, id : idx})
       : true;
  }
};

const ddbb = {
    users: new Proxy([],proxyHandlerObj),
    personal_basic_details: new Proxy([],proxyHandlerObj),
    business_basic_details: new Proxy([],proxyHandlerObj),
    id_documents: new Proxy([],proxyHandlerObj),
    addresses: new Proxy([],proxyHandlerObj),
    phone_numbers: new Proxy([],proxyHandlerObj),
    emails: new Proxy([],proxyHandlerObj),
    finances: new Proxy([],proxyHandlerObj),
    bank_accounts: new Proxy([],proxyHandlerObj),
    bank_account_identifiers: new Proxy([],proxyHandlerObj)
};


function addPeople (filename) {
  let {username,bio,description,status,segment,ocupation,bank_accounts,...data} = require(filename);
  let user_id = ddbb.users.push({ username, bio, description, status, segment, ocupation,});

  let UserDataArr = Object.keys(ddbb).filter(key => !/(bank_|users)/.test(key) );
  // Fill user's data (personal_basic_details & business_basic_details have to be an object)
  UserDataArr.map(k => {
      if (/(personal_basic_details|business_basic_details)/.test(k)) {
        // This set of data is unique (only one object)
        let doc = {...data[k]};
        // Fix date fields if any
        Object.keys(doc).filter(field => /date/i.test(field)).map(f => {
          doc[f] = new Date(doc[f]);
        })
        ddbb[k].push({
          ...doc,
          user_id: user_id});
      } else {
        // This set of data has to be an array
        data[k].map(doc => {
          ddbb[k].push({
            ...doc,
            user_id: user_id});
        })
      }
  })
  // Let's add bank accounts info
  bank_accounts.map(bank => {
    let {identifiers,...bankInfo} = bank;
    let bank_id = ddbb.bank_accounts.push({...bankInfo,user_id : user_id});
    // we don't need to store the id for identifiers collection
    identifiers.map( identifier => {
      ddbb.bank_account_identifiers.push({...identifier, bank_account_id: bank_id})
    })

  });

}


fs.readdir(testFolder, (err, files) => {
  files.forEach(file => {
    addPeople(`${testFolder}${file}`);

  });
  const PORT = process.env["PORT"] || 8080;
  const app = express();

  app.use('/', jsonGraphqlExpress.default({
    users: [...ddbb.users.values()],
    personal_basic_details: [...ddbb.personal_basic_details.values()],
    business_basic_details: [...ddbb.business_basic_details.values()],
    id_documents: [...ddbb.id_documents.values()],
    addresses: [...ddbb.addresses.values()],
    phone_numbers: [...ddbb.phone_numbers.values()],
    emails: [...ddbb.emails.values()],
    finances: [...ddbb.finances.values()],
    bank_accounts: [...ddbb.bank_accounts.values()],
    bank_account_identifiers: [...ddbb.bank_account_identifiers.values()]
  }));
  app.listen(PORT);
  console.log(ddbb);
});
