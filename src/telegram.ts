import { nanoid } from 'nanoid';
import { Policeman223 } from './policeman223';
import { chunk, getDaysInMonth, last, range, sample } from './utils';

enum Status {
	Init,
	What,
	WhenY,
	WhenM,
	WhenD,
	Confirmation,
	Finish,
}

export class TelegramBot {
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

	async onUpdate(update: any) {
		if ('message' in update) {
			await this.onMessage(update.message);
		}
	}

	private api(methodName: string, params: Record<string, string> | null = null) {
		let query = '';
		if (params) {
			query = '?' + new URLSearchParams(params).toString();
		}
		return `https://api.telegram.org/bot${this.token}/${methodName}${query}`;
	}

	private async onMessage(message: any) {
		const policeman223 = new Policeman223();

		const isBotCommand = 'entities' in message && message.entities.some((e: any) => e.type === 'bot_command');
		const chatId = message.chat.id;
		const contextKey = `telegram:${chatId}:status`;

		if (isBotCommand) {
			if (message.text === '/start') {
				return Promise.all([
					this.sendPlainText(chatId, policeman223.sayHi()),
					this.context.put(contextKey, JSON.stringify({ status: Status.Init })),
				]);
			}

			if (message.text === '/food') {
				return Promise.all([
					this.sendPlainText(chatId, '你買了什麼呢？\n請以圖片或文字的方式回答'),
					this.context.put(contextKey, JSON.stringify({ status: Status.What })),
				]);
			}

			if (message.text === '/finish') {
				const items: string[] = JSON.parse((await this.context.get(`telegram:${chatId}:items`)) || `[]`);
				const itemsData = await Promise.all(items.map(async (key: string) => JSON.parse((await this.context.get(key)) || '{}')));

				if (itemsData.length === 0) {
					return this.sendPlainText(chatId, '暫無紀錄，請使用 /food 新增');
				}

				return Promise.all([
					this.sendMessage(chatId, '請點選已經吃完的食物', {
						reply_markup: JSON.stringify({
							keyboard: itemsData.map((item: any) => [{ text: item.text || '📷' }]),
							resize_keyboard: true,
							one_time_keyboard: true,
						}),
					}),
					this.context.put(contextKey, JSON.stringify({ status: Status.Finish })),
				]);
			}

			if (message.text === '/debug') {
				const items: string[] = JSON.parse((await this.context.get(`telegram:${chatId}:items`)) || `[]`);
				const itemsData = await Promise.all(items.map(async (key: string) => JSON.parse((await this.context.get(key)) || '{}')));

				return this.sendPlainText(chatId, JSON.stringify(itemsData, null, 2));
			}
		}

		// invite bot to group
		// if ('new_chat_member' in message && message.new_chat_member.is_bot && message.new_chat_member.username === 'pineapple223bot') {
		// 	return this.sendPlainText(message.chat.id, policeman223.sayHi());
		// }
		// if ('text' in message) {

		// } else {
		// 	return this.sendPlainText(message.chat.id, 'I can only echo text messages.');
		// }

		const context: { status: Status; year: number; month: number; day: number; text: string; photo?: string } = JSON.parse(
			(await this.context.get(contextKey)) || '{}'
		);

		if (context.status === Status.What) {
			const reply = policeman223.replyToMessage(message.text || '', { replyAnyways: false });

			await Promise.all([
				...(reply ? [this.sendPlainText(chatId, reply)] : []),
				...('photo' in message
					? [
							this.context.put(
								contextKey,
								JSON.stringify({ ...context, photo: last(message.photo).file_id, text: message.caption || '', status: Status.WhenY })
							),
					  ]
					: [this.context.put(contextKey, JSON.stringify({ ...context, text: message.text, status: Status.WhenY }))]),
			]);

			const y = new Date().getFullYear();

			return Promise.all([
				this.sendPlainText(chatId, '可以放到什麼時候呢？'),
				this.sendMessage(chatId, '請選擇年份', {
					reply_markup: JSON.stringify({
						keyboard: [[`${y} 年`, `${y + 1} 年`, `${y + 2} 年`, `${y + 3} 年`]],
						resize_keyboard: true,
						one_time_keyboard: true,
					}),
				}),
			]);
		}

		if (context.status === Status.WhenY) {
			const year = message.text.replace(/\s/, '').replace('年', '');

			if (/^\d{2}$|^\d{4}$/.test(year)) {
				return Promise.all([
					this.context.put(contextKey, JSON.stringify({ ...context, year: +year.padStart(4, '20'), status: Status.WhenM })),
					this.sendMessage(chatId, '請選擇月份', {
						reply_markup: JSON.stringify({
							keyboard: [
								['1 月', '2 月', '3 月', '4 月'],
								['5 月', '6 月', '7 月', '8 月'],
								['9 月', '10 月', '11 月', '12 月'],
							],
							resize_keyboard: true,
							one_time_keyboard: true,
						}),
					}),
				]);
			} else {
				await this.sendPlainText(chatId, '格式錯誤，請重新輸入_(:_」∠)_');

				const y = new Date().getFullYear();
				return this.sendMessage(chatId, '請選擇年份', {
					reply_markup: JSON.stringify({
						keyboard: [[`${y} 年`, `${y + 1} 年`, `${y + 2} 年`, `${y + 3} 年`]],
						resize_keyboard: true,
						one_time_keyboard: true,
					}),
				});
			}
		}

		if (context.status === Status.WhenM) {
			const month = message.text.replace(/\s/, '').replace('月', '');

			if (/^\d{1,2}$/.test(month)) {
				return Promise.all([
					this.context.put(contextKey, JSON.stringify({ ...context, month: +month, status: Status.WhenD })),
					this.sendMessage(chatId, '請選擇日期', {
						reply_markup: JSON.stringify({
							keyboard: chunk(
								range(1, getDaysInMonth(context.year, +month)).map((v) => `${v}`),
								6
							),
							resize_keyboard: true,
							one_time_keyboard: true,
						}),
					}),
				]);
			} else {
				await this.sendPlainText(chatId, '格式錯誤，請重新輸入_(:_」∠)_');

				return this.sendMessage(chatId, '請選擇月份', {
					reply_markup: JSON.stringify({
						keyboard: [
							['1 月', '2 月', '3 月', '4 月'],
							['5 月', '6 月', '7 月', '8 月'],
							['9 月', '10 月', '11 月', '12 月'],
						],
						resize_keyboard: true,
						one_time_keyboard: true,
					}),
				});
			}
		}

		if (context.status === Status.WhenD) {
			const day = message.text.replace(/\s/, '');

			if (/^\d{1,2}$/.test(day)) {
				const date = `${context.year}-${context.month}-${day}`;

				return Promise.all([
					this.context.put(contextKey, JSON.stringify({ ...context, day: +day, status: Status.Confirmation })),
					...(context.photo
						? [this.sendPhoto(chatId, context.photo, `${context.text}\n有效期限到 ${date}`)]
						: [this.sendPlainText(chatId, `${context.text}\n有效期限到 ${date}`)]),
					this.sendMessage(chatId, '輸入的資訊是否正確？', {
						reply_markup: JSON.stringify({
							keyboard: [['是', '否']],
							resize_keyboard: true,
							one_time_keyboard: true,
						}),
					}),
				]);
			} else {
				await this.sendPlainText(chatId, '格式錯誤，請重新輸入_(:_」∠)_');

				return this.sendMessage(chatId, '請選擇日期', {
					reply_markup: JSON.stringify({
						keyboard: chunk(
							range(1, getDaysInMonth(context.year, context.month)).map((v) => `${v}`),
							6
						),
						resize_keyboard: true,
						one_time_keyboard: true,
					}),
				});
			}
		}

		if (context.status === Status.Confirmation) {
			const isPositive = message.text === '是' || message.text?.toLowerCase() === 'yes' || message.text?.toLowerCase() === 'y';
			const isNegative = message.text === '否' || message.text?.toLowerCase() === 'no' || message.text?.toLowerCase() === 'n';

			if (isPositive) {
				const date = `${context.year}${`${context.month}`.padStart(2, '0')}${`${context.day}`.padStart(2, '0')}`;

				const key = `date:${date}:${nanoid(8)}`;
				await this.context.put(
					key,
					JSON.stringify({
						dueAt: date,
						provider: 'telegram',
						chatId,
						text: context.text,
						photo: context.photo,
					})
				);

				const items: string[] = JSON.parse((await this.context.get(`telegram:${chatId}:items`)) || `[]`);
				this.context.put(`telegram:${chatId}:items`, JSON.stringify([...items, key]));
				return Promise.all([this.context.put(contextKey, JSON.stringify({ status: Status.Init })), this.sendPlainText(chatId, '已新增')]);
			}

			if (isNegative) {
				return Promise.all([
					this.sendPlainText(chatId, '你買了什麼呢？\n請以圖片或文字的方式回答'),
					this.context.put(contextKey, JSON.stringify({ status: Status.What })),
				]);
			}

			return this.sendMessage(chatId, '輸入的資訊是否正確？', {
				reply_markup: JSON.stringify({
					keyboard: [['是', '否']],
					resize_keyboard: true,
					one_time_keyboard: true,
				}),
			});
		}

		if (context.status === Status.Finish) {
			const itemKeys = JSON.parse((await this.context.get(`telegram:${chatId}:items`)) || '[]');
			const items = await Promise.all(
				itemKeys.map(async (key: string) => ({
					...JSON.parse((await this.context.get(key)) || '{}'),
					key,
				}))
			);

			// find the item
			const item = items.find((i: any) => i.text === message.text);

			if (item) {
				await this.context.delete(item.key);
				await this.context.put(`telegram:${chatId}:items`, JSON.stringify(itemKeys.filter((k: string) => k !== item.key)));
			}

			return this.sendPlainText(chatId, `已刪除一筆紀錄`);
		}

		if (message.text.includes('223')) {
			return this.sendPhoto(chatId, policeman223.takeSelfie());
		}

		return this.sendPlainText(message.chat.id, policeman223.replyToMessage(message.text || '', { replyAnyways: true }));
	}

	private async sendPlainText(chatId: number, text: string) {
		const response = await fetch(this.api('sendMessage', { chat_id: chatId.toString(), text }));

		return response.ok;
	}

	private async sendMessage(chatId: number, text: string, options: Record<string, any>) {
		const response = await fetch(this.api('sendMessage', { chat_id: chatId.toString(), text, ...options }));

		return response.ok;
	}

	private async sendPhoto(chatId: number, photo: string, caption?: string) {
		const response = await fetch(this.api('sendPhoto', { chat_id: chatId.toString(), photo, ...(caption && { caption }) }));

		return response.ok;
	}
}
