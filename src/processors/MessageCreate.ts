import { Client, CommandInteractionOptionResolver } from "discord.js";

import { collection, doc, Firestore, getDocs, setDoc } from "firebase/firestore/lite";

import { SaveData } from "../utils/Data";
import { AllFetch } from "../utils/fetchApi";

export async function processMessageCreate(client: Client, database: Firestore, interactions: SaveData[]): Promise<void> {
    client.on('messageCreate', async message => {
        if (message.channel.type !== 'GUILD_TEXT'
            || message.author.bot
            || message.system
            || !message.content.startsWith(process.env.PREFIX as string)) return;

        let col = collection(database, 'users');
        let snapshot = await getDocs(col);
        let result = snapshot.docs.map(doc => doc.data());
        let findUserData = result.filter(k => k[message.author.id]);

        let args = message.content.slice(process.env.PREFIX?.length).trim().split(/ +/g);
        let commandName = args.shift();

        switch (commandName) {
            case '가입':
            case 'register':
            case 'join':
            case '가입하기':
                if ((findUserData[0]?findUserData[0][message.author.id]?.guildIds:[]).includes(message.guildId)) {
                    message.reply({
                        content: '이미 가입되어 있어요.',
                        allowedMentions: {
                            repliedUser: findUserData[0]?findUserData[0][message.author.id].settings.allowReply:true
                        }
                    })
                    return;
                }
                message.reply({
                    content: [
                        '가입을 완료했어요!',
                        '',
                        '[__수집되는 정보들__]',
                        '<:blue_haired_moremi:870671080816254976> 여행자의 농장 상태',
                        '<:blue_haired_moremi:870671080816254976> 여행자의 영토',
                        '갱에서 채굴 시, 데이터 수집',
                        '',
                        '[__가입 시, 기본적으로 허용되는 내용__]',
                        '작물이 다 자라서 수확이 가능할 때, DM으로 안내',
                        '명령어 사용 시, 답장 멘션 ON',
                        '갱에서 채굴 시, 데이터 수집',
                        '',
                        '다 자란 작물은 5시간마다 한번씩 DM으로 갈거에요!'
                    ].join('\n'),
                    allowedMentions: {
                        repliedUser: findUserData[0]?findUserData[0][message.author.id].settings.allowReply:true
                    }
                });
                let guildIds = findUserData[0]?findUserData[0][message.author.id]?.guildIds:[];
                let Resends: any = findUserData[0]?findUserData[0][message.author.id]?.Resends:{};
                
                guildIds.push(message.guildId);
                if (!Resends[message.guildId as string]) Resends[message.guildId as string] = 0;

                let addDatas: any = result[0]||{};

                addDatas[message.author.id] = {
                    guildIds,
                    settings: {
                        allowReply: true,
                        noticeDm: true,
                        pitWatch: true,
                    },
                    Resends
                };

                await setDoc(doc(database, 'users', 'datas'), addDatas);
                break;
            case 'set':
            case '설정':
                if (!(findUserData[0]?findUserData[0][message.author.id]?.guildIds:[]).includes(message.guildId)) {
                    message.reply({
                        content: '가입을 먼저 해주세요.',
                        allowedMentions: {
                            repliedUser: findUserData[0]?findUserData[0][message.author.id].settings.allowReply:true
                        }
                    })
                    return;
                }
                if (!args[0]) {
                    message.reply({
                        content: '`allowReply`나 `noticeDm`, `pitWatch` 중에서 선택해주세요!',
                        allowedMentions: {
                            repliedUser: findUserData[0]?findUserData[0][message.author.id].settings.allowReply:true
                        }
                    });
                    return;
                }
                switch (args[0]) {
                    case 'allowReply':
                        let setDatas: any = result[0] || {};
                        switch (args[1]) {
                            case 'Y':
                            case 'y':
                            case 'ㅇ':
                                message.reply({ content: '명령어를 사용할 때마다 답장 멘션은 켜둘게요!', allowedMentions: { repliedUser: findUserData[0]?findUserData[0][message.author.id].settings.allowReply:true } });

                                setDatas[message.author.id].settings.allowReply = true;
                                await setDoc(doc(database, 'users', 'datas'), setDatas);
                                break;
                            case 'N':
                            case 'n':
                            case 'ㄴ':
                                message.reply({ content: '명령어를 사용할 때마다 답장 멘션은 꺼둘게요!', allowedMentions: { repliedUser: findUserData[0]?findUserData[0][message.author.id].settings.allowReply:true } });

                                setDatas[message.author.id].settings.allowReply = false;
                                await setDoc(doc(database, 'users', 'datas'), setDatas);
                                break;
                            default:
                                message.reply({ content: '`Y`나 `n` 중에서 선택해주세요!', allowedMentions: { repliedUser: findUserData[0]?findUserData[0][message.author.id].settings.allowReply:true } });
                                break;
                        }
                        break;
                    case 'pitWatch':
                        let setData = result[0] || {};
                        switch (args[1]) {
                            case 'Y':
                            case 'y':
                            case 'ㅇ':
                                message.reply({ content: '갱 채굴하는 걸 열심히 관찰하면서 기록할게요!', allowedMentions: { repliedUser: findUserData[0]?findUserData[0][message.author.id].settings.allowReply:true } });

                                setData[message.author.id].settings.pitWatch = true;
                                await setDoc(doc(database, 'users', 'datas'), setData);
                                break;
                            case 'N':
                            case 'n':
                            case 'ㄴ':
                                message.reply({ content: '갱 채굴하는 걸 열심히 관찰하면서 기록하는 걸 그만둘게요.', allowedMentions: { repliedUser: findUserData[0]?findUserData[0][message.author.id].settings.allowReply:true } });

                                setData[message.author.id].settings.pitWatch = false;
                                await setDoc(doc(database, 'users', 'datas'), setData);
                                break;
                            default:
                                message.reply({ content: '`Y`나 `n` 중에서 선택해주세요!', allowedMentions: { repliedUser: findUserData[0]?findUserData[0][message.author.id].settings.allowReply:true } });
                                break;
                        }
                        break;
                    case 'noticeDm':
                        let setData2 = result[0] || {};
                        switch (args[1]) {
                            case 'Y':
                            case 'y':
                            case 'ㅇ':
                                message.reply({ content: '작물이 다 자라면 DM으로 안내 메시지를 보내줄게요!', allowedMentions: { repliedUser: findUserData[0]?findUserData[0][message.author.id].settings.allowReply:true } });

                                setData2[message.author.id].settings.noticeDm = true;
                                await setDoc(doc(database, 'users', 'datas'), setData2);
                                break;
                            case 'N':
                            case 'n':
                            case 'ㄴ':
                                message.reply({ content: '..? 그걸 꺼버리면 작물이 다 자라도 제가 안내 메시지를 보내지 않아요.', allowedMentions: { repliedUser: findUserData[0]?findUserData[0][message.author.id].settings.allowReply:true } });

                                setData2[message.author.id].settings.noticeDm = false;
                                await setDoc(doc(database, 'users', 'datas'), setData2);
                                break;
                            default:
                                message.reply({ content: '`Y`나 `n` 중에서 선택해주세요!', allowedMentions: { repliedUser: findUserData[0]?findUserData[0][message.author.id].settings.allowReply:true } });
                                break;
                        }
                        break;
                    default:
                        message.reply({ content: '`allowReply`나 `noticeDm`, `pitWatch` 중에서 선택해주세요!', allowedMentions: { repliedUser: findUserData[0]?findUserData[0][message.author.id].settings.allowReply:true } });
                        return;
                }
                break;
            case '작물':
                let user = await AllFetch(`https://farm.jjo.kr/api/link/by-discord/${message.guildId}/${message.author.id}`);
                let farm = await AllFetch(`https://farm.jjo.kr/api/link/${user.id}/farms`);

                if (farm.errorCode) {
                    if (farm.errorCode === '429') {
                        message.reply({
                            content: '한번에 너무 많은 요청이 들어왔어요..', allowedMentions: { repliedUser: findUserData[0]?findUserData[0][message.author.id].settings.allowReply:true }
                        });
                        return;
                    } else if (farm.errorCode === '406') {
                        message.reply({
                            content: '그 죄송하지만 파머모 API에서 당신의 정보를 조회하는 걸 막으신것 같아요.', allowedMentions: { repliedUser: findUserData[0]?findUserData[0][message.author.id].settings.allowReply:true }
                        });
                        return;
                    } else if (farm.errorCode === '404') {
                        message.reply({
                            content: '파머모에 연동 먼저 ㄱㄱ', allowedMentions: { repliedUser: findUserData[0] ? findUserData[0][message.author.id].settings.allowReply : true }
                        });
                        return;
                    } else {
                        message.reply({
                            content: `이상한 에러가 났네요 ㅋㅋ\n\n${farm.errorCode}\n> ${require("http").STATUS_CODES[farm.errorCode]}`, allowedMentions: { repliedUser: findUserData[0] ? findUserData[0][message.author.id].settings.allowReply : true }
                        });
                        return;
                    }
                }
                break;
            default:
                message.reply({
                    content: '그런 명령어는 잘 모르겠네요.',
                    allowedMentions: {
                        repliedUser: findUserData[0]?findUserData[0][message.author.id].settings.allowReply:true
                    }
                });
                break;
        }
    })
}