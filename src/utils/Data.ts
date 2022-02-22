export interface SaveData {
    message: object|undefined;
    id: string|undefined;
    user_id: string;
    name: string;

    num: number;
    mode?: string;

    interaction?: any;

    components?: any[]
}