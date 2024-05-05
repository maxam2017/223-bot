import { nanoid } from 'nanoid';
import { Policeman223 } from './policeman223';
import { chunk, getDaysInMonth, last, range, sample } from './utils';
import { MessagingProvider } from './types';

export class Telegram implements MessagingProvider {
	name = 'telegram';

	constructor(private readonly token: string, private readonly secret: string, private context: KVNamespace<string>) {}

	async registerWebhook(url: string) {
		const setWebhookUrl = this.api('setWebhook', { url, secret_token: this.secret });
		const r = (await (await fetch(setWebhookUrl)).json()) as any;
		return 'ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2);
	}

	async unRegisterWebhook() {
		const setWebhookUrl = this.api('setWebhook', { url: '' });
		const r = (await (await fetch(setWebhookUrl)).json()) as any;
		return 'ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2);
	}

	private api(methodName: string, params: Record<string, string> | null = null) {
		let query = '';
		if (params) {
			query = '?' + new URLSearchParams(params).toString();
		}
		return `https://api.telegram.org/bot${this.token}/${methodName}${query}`;
	}

	public async sendMessage(chatId: number, text: string, options?: Record<string, any>) {
		const response = await fetch(this.api('sendMessage', { chat_id: chatId.toString(), text, ...options }));

		return response.ok;
	}

	public async sendPhoto(chatId: number, photo: string, caption?: string) {
		const response = await fetch(this.api('sendPhoto', { chat_id: chatId.toString(), photo, ...(caption && { caption }) }));

		return response.ok;
	}
}
