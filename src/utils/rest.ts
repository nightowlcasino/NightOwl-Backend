//import { displayTransaction, errorAlert } from "../utils/Alerts";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config()
const nodeUser = process.env.NODE_USER || ""
const nodePass = process.env.NODE_PASS || ""
const apikey = process.env.NODE_APIKEY || ""

export async function postTx(url: any, body = {}, apiKey = '') {
  fetch(url, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'Content-Type': 'application/json',
      'mode': 'cors',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
      'Authorization': nodeUser !== "" && nodePass !== "" ? 'Basic ' + btoa(nodeUser + ':' + nodePass) : '',
      'api_key': apikey !== "" ? apikey : '',
    },
    body: JSON.stringify(body)
  }).then(response => Promise.all([response.ok, response.json()]))
    .then(([responseOk, body]) => {
      if (responseOk) {
        //displayTransaction(body)
        return JSON.parse(body);
      } else {
        console.log("fetch2", body);
        try {
          console.log("Failed to fetch", JSON.stringify(body))
          return body
          //errorAlert("Failed to fetch", JSON.stringify(body))
        } catch (e) {
          console.log("fetch21", body.toString());
          //errorAlert("Failed to fetch", body.toString())
        }
      }
    })
    .catch(error => {
      console.log("fetch3", error);
      // catches error case and if fetch itself rejects
    });
}

export async function post(url: any, body = {}, apiKey = '') {
  return await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      api_key: apiKey,
    },
    body: JSON.stringify(body),
  });
}

export async function get(url: any, apiKey = '') {
  try {
    const result = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': nodeUser !== "" && nodePass !== "" ? 'Basic ' + btoa(nodeUser + ':' + nodePass) : '',
        api_key: apiKey,
      }
    }).then(res => res.json());
    return result;
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function get2(url: any, apiKey = '') {
  const result = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      api_key: apiKey,
    }
  }).then(res => res.json());
  return result;
}