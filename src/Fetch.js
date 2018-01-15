const API = window.location.href + 'api';
//const API = "http://localhost:8080/api";

const Fetch = (path,method,json) => {
  console.log(API+path);
  console.log(json);
  return new Promise(async function(resolve,reject) {
    let gotResponse = false;
    try {
      let response = await fetch(API+path, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: json?JSON.stringify(json):undefined,
        });
        console.log("JSON", json);
        let responseJSON = undefined;
        if (response !== undefined) {
          responseJSON = await response.json();
          gotResponse = true;
        }
        resolve(responseJSON);
      }catch(error) {
        if(!gotResponse){
          // Handle error
          console.log(error);
          //Network Connection Problem
          reject(error);
        }
      }
  });
};

export default Fetch;
