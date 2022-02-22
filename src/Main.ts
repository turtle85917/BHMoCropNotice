import 'dotenv/config';

import { Client, Message, PartialTextBasedChannelFields } from 'discord.js';

import { initializeApp } from "firebase/app";
import { collection, doc, getDocs, getFirestore, setDoc } from 'firebase/firestore/lite';

import { processMessageCreate } from './processors/MessageCreate';
import { SaveData } from './utils/Data';
import { AllFetch } from './utils/fetchApi';
import { DateUnit } from './utils/DateUnit';

const firebaseConfig = {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
};

const app = initializeApp(firebaseConfig);
const database = getFirestore(app);

let interactions: SaveData[] = [];

declare global {
    interface String {
        run(data?:object): string;
    }
}

String.prototype.run = function(data?:object) {
    let text = this;
    let splits = text.match(/\{(.*?)\}/g);
    if (!splits) return String(text);

    splits.map(s => {
        let ee = s.replace('{', '').replace('}', '');

        if (data && (data as any)[ee]) {
            text = text.replace(s, (data as any)[ee]);
        }
    })

    return String(text);
}

let client = new Client({
    intents: [ 'GUILDS', 'GUILD_MESSAGES', 'GUILD_MEMBERS' ],
    partials: [ 'USER', 'MESSAGE', 'GUILD_MEMBER' ],
    retryLimit: 3
});

async function main(): Promise<void> {
    client.once('ready', async () => {
        console.log('Bot is Ready!');
        client.user?.setActivity('\u200b');

        await processMessageCreate(client, database, interactions);

        setInterval(async() => {
            let col = collection(database, 'users');
            let snapshot = await getDocs(col);
            let result = snapshot.docs.map(doc => doc.data());
            
            for (const [ k, v ] of Object.entries(result[0])) {
                v.guildIds.map(async guildId => {
                    if (Math.floor(new Date().getTime()/1000)-v.Resends[v.guildId]>=3600*3) {
                        let user = await AllFetch(`https://farm.jjo.kr/api/link/by-discord/${guildId}/${k}`);
                        let farm = await AllFetch(`https://farm.jjo.kr/api/link/${user.id}/farms`);

                        let userData = client.users.cache.get(k);

                        if (farm.errorCode) {
                            // if (farm.errorCode === '429') {
                            //     (userData as unknown as TextBasedChannelFields).send({
                            //         content: '한번에 너무 많은 요청이 와버려서'
                            //     });
                            //     return;
                            // } else if (farm.errorCode === '406') {
                            //     message.reply({
                            //         content: '그 죄송하지만 파머모 API에서 당신의 정보를 조회하는 걸 막으신것 같아요.', allowedMentions: { repliedUser: findUserData[0]?findUserData[0][message.author.id].settings.allowReply:true }
                            //     });
                            //     return;
                            // } else if (farm.errorCode === '404') {
                            //     message.reply({
                            //         content: '파머모에 연동 먼저 ㄱㄱ', allowedMentions: { repliedUser: findUserData[0] ? findUserData[0][message.author.id].settings.allowReply : true }
                            //     });
                            //     return;
                            // } else {
                            //     message.reply({
                            //         content: `이상한 에러가 났네요 ㅋㅋ\n\n${farm.errorCode}\n> ${require("http").STATUS_CODES[farm.errorCode]}`, allowedMentions: { repliedUser: findUserData[0] ? findUserData[0][message.author.id].settings.allowReply : true }
                            //     });
                            //     return;
                            // }
                            return;
                        }

                        let harvests: any[] = [];
                        let filter = farm?.list?.filter(a => a.growth === 'fruitage' || (a.staticCropId==='pumpkin'&&a.growth==='maturity'));
                        
                        filter?.map(async b => {
                            await AllFetch(`https://farm.jjo.kr/api/static/item/${b.staticCropId==='pumpkin'&&b.growth==='maturity'?'zucchini':b.staticCropId}`).then(r => {
                                harvests.push(`${r.data.icon} ${r.names.ko}`);
                            })
                        });

                        let guildName = client.guilds.cache.get(guildId);

                        setTimeout(async() => {
                            if (filter?.length) {
                                if (v.settings.noticeDm) {
                                    (userData as unknown as PartialTextBasedChannelFields)?.send({
                                        content: [
                                            `<@!${k}>님! ${guildName?`**${guildName.name}**`:'__어디 서버__'}에서 작물이 수확이 가능한 상태가 되었어요.`,
                                            '[__수확 가능한 작물들__]',
                                            harvests.join('\n')
                                        ].join('\n')
                                    }).catch(() => {});

                                    result[0][k].Resends[guildId] = Math.floor(new Date().getTime()/1000);
                                    await setDoc(doc(database, 'users', 'datas'), result[0]);
                                }
                            }
                        }, 1500);
                    }
                })
            }
        }, DateUnit.MINUTE);
    });

    await client.login(process.env.TOKEN);
}

main();
process.on('uncaughtException', e => {
    console.log(`Unhandled Exception\n${e.stack}`);
});
process.on('unhandledRejection', e => {
    console.log(`Unhandeld Rejection\n${e instanceof Error?e.stack:e}`);
});