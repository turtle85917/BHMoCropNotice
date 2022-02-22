import fetch from "node-fetch";
import { Response } from "node-fetch";

let apikeys = [
]

export function fetchApi(fetchUrl: string, index?: number) {
    fetch(fetchUrl, { headers: { Authorization: `Bearer ${apikeys[Number(index)]}` } }).then((response)=>response.json())
    .then((response)=>{
        if (response?.error) {
            if (response?.error === 'Not enough gas') {
                if (Number(index)+1>apikeys.length) {
                    return response;
                }
                fetchApi(fetchUrl, Number(index)+1);
            } else {
                return response;
            }
        } else {
            return response;
        }
    })
};

export async function AllFetch(fetchUrl: string) {
    let result: any = '';
    let errorCodes: any = {};

    for (let i=0; i<apikeys.length; i++) {
        if (!errorCodes[200]) {
            let response = await fetch(fetchUrl, { headers: { Authorization: `Bearer ${apikeys[i]}` } });
            console.log(`소모한 가스: ${response.headers.get('x-bhmo-gas-spent')}\n남은 가스: ${response.headers.get('x-bhmo-gas-left')}`)
            if (!errorCodes[response.status]) errorCodes[response.status]=0;
            errorCodes[response.status]++;

            if (response.status === 200) {
                let responseJSON = await (await response.json());

                if (responseJSON?.error) {
                    if (responseJSON?.error === 'Not enough gas') {
                        if (i+1>apikeys.length) {
                            result = responseJSON;
                        }
                    } else {
                        result = responseJSON;
                    }
                } else {
                    result = responseJSON;
                }
            }
        } else {
            break;
        }
    }

    return result;
}