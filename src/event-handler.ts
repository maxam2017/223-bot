import { nanoid } from 'nanoid';
import { getChatRoomState, insertChatRoomItem, listChatRoomItems, setChatRoomState } from './kv';
import { Policeman223 } from './policeman223';
import { MessagingProvider, Status } from './types';
import { chunk, getDaysInMonth, last, range } from './utils';
import { debugCommand, finishCommand, foodCommand, startCommand } from './command';

export function createMessageHandler({ provider, kv }: { provider: MessagingProvider; kv: KVNamespace }) {
	return async function handleMessage(message: any) {
		const roomId = message.chat.id;
		const isBotCommand = 'entities' in message && message.entities.some((e: any) => e.type === 'bot_command');

		if (isBotCommand) {
			const botCommandHandler = createBotCommandHandler({ provider, kv });
			return botCommandHandler(message);
		}

		const state = (await getChatRoomState(kv, { providerName: provider.name, roomId })) || { status: Status.Init };

		switch (state.status) {
			case Status.What: {
				const what = createStatusWhatHandler({ provider, kv });
				return what(message);
			}

			case Status.WhenY: {
				const whenY = createStatusWhenYHandler({ provider, kv });
				return whenY(message);
			}

			case Status.WhenM: {
				const whenM = createStatusWhenMHandler({ provider, kv });
				return whenM(message);
			}

			case Status.WhenD: {
				const whenD = createStatsWhenDHandler({ provider, kv });
				return whenD(message);
			}

			case Status.Confirmation: {
				const confirmation = createStatusConfirmationHandler({ provider, kv });
				return confirmation(message);
			}

			case Status.Finish: {
				const finish = createStatusFinishHandler({ provider, kv });
				return finish(message);
			}

			default: {
				const defaultHandler = createDefaultHandler();
				return defaultHandler(message);
			}
		}
	};
}

function createBotCommandHandler({ provider, kv }: { provider: MessagingProvider; kv: KVNamespace }) {
	return async function onBotCommand(message: any) {
		const roomId = message.chat.id;
		const command = message.text.replace('/', '');

		switch (command) {
			case 'start': {
				const start = startCommand({ provider, kv });
				return start(message);
			}

			case 'food': {
				const food = foodCommand({ provider, kv });
				return food(message);
			}

			case 'finish': {
				const finish = finishCommand({ provider, kv });
				return finish(message);
			}

			case 'debug': {
				const debug = debugCommand({ provider, kv });
				return debug(message);
			}

			default: {
				return provider.sendMessage(roomId, '我不知道你在說什麼_(:_」∠)_');
			}
		}
	};
}

function createStatusWhatHandler({ provider, kv }: { provider: MessagingProvider; kv: KVNamespace }) {
	const policeman223 = new Policeman223();
	return async function onStatusWhat(message: any) {
		const roomId = message.chat.id;
		const reply = policeman223.replyToMessage(message.text || '', { replyAnyways: false });

		await Promise.all([
			// send message to chat room
			...(reply ? [provider.sendMessage(roomId, reply)] : []),

			// set chat room state
			setChatRoomState(kv, {
				providerName: provider.name,
				roomId,
				value: (prev) => ({
					...prev,
					status: Status.WhenY,
					...(message.photo
						? {
								photo: last(message.photo).file_id,
								text: message.caption || '',
						  }
						: { text: message.text }),
				}),
			}),
		]);

		const y = new Date().getFullYear();

		return Promise.all([
			provider.sendMessage(roomId, '可以放到什麼時候呢？'),
			provider.sendMessage(roomId, '請選擇年份', {
				reply_markup: JSON.stringify({
					keyboard: [[`${y} 年`, `${y + 1} 年`, `${y + 2} 年`, `${y + 3} 年`]],
					resize_keyboard: true,
					one_time_keyboard: true,
				}),
			}),
		]);
	};
}

function createStatusWhenYHandler({ provider, kv }: { provider: MessagingProvider; kv: KVNamespace }) {
	return async function onStatusWhenY(message: any) {
		const roomId = message.chat.id;
		const year = message.text.replace(/\s/, '').replace('年', '');

		if (/^\d{2}$|^\d{4}$/.test(year)) {
			return Promise.all([
				setChatRoomState(kv, {
					providerName: provider.name,
					roomId,
					value: (prev) => ({
						...prev,
						y: +year.padStart(4, '20'),
						status: Status.WhenM,
					}),
				}),
				provider.sendMessage(roomId, '請選擇月份', {
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
			await provider.sendMessage(roomId, '格式錯誤，請重新輸入_(:_」∠)_');

			const y = new Date().getFullYear();
			return provider.sendMessage(roomId, '請選擇年份', {
				reply_markup: JSON.stringify({
					keyboard: [[`${y} 年`, `${y + 1} 年`, `${y + 2} 年`, `${y + 3} 年`]],
					resize_keyboard: true,
					one_time_keyboard: true,
				}),
			});
		}
	};
}

function createStatusWhenMHandler({ provider, kv }: { provider: MessagingProvider; kv: KVNamespace }) {
	return async function onStatusWhenM(message: any) {
		const roomId = message.chat.id;
		const month = message.text.replace(/\s/, '').replace('月', '');

		if (/^\d{1,2}$/.test(month)) {
			const state = await getChatRoomState(kv, { providerName: provider.name, roomId });

			return Promise.all([
				setChatRoomState(kv, {
					providerName: provider.name,
					roomId,
					value: (prev) => ({
						...prev,
						m: +month,
						status: Status.WhenD,
					}),
				}),
				provider.sendMessage(roomId, '請選擇日期', {
					reply_markup: JSON.stringify({
						keyboard: chunk(
							range(1, getDaysInMonth(state?.y || 1, +month)).map((v) => `${v}`),
							6
						),
						resize_keyboard: true,
						one_time_keyboard: true,
					}),
				}),
			]);
		} else {
			await provider.sendMessage(roomId, '格式錯誤，請重新輸入_(:_」∠)_');

			return provider.sendMessage(roomId, '請選擇月份', {
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
	};
}

function createStatsWhenDHandler({ provider, kv }: { provider: MessagingProvider; kv: KVNamespace }) {
	return async function onStatusWhenD(message: any) {
		const roomId = message.chat.id;
		const day = message.text.replace(/\s/, '');

		if (/^\d{1,2}$/.test(day)) {
			const state = await getChatRoomState(kv, { providerName: provider.name, roomId });
			const date = `${state?.y}-${state?.m?.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

			return Promise.all([
				setChatRoomState(kv, {
					providerName: provider.name,
					roomId,
					value: (prev) => ({
						...prev,
						d: +day,
						status: Status.Confirmation,
					}),
				}),

				...(state?.photo
					? [provider.sendPhoto(roomId, state.photo, `${state.text}\n有效期限到 ${date}`)]
					: [provider.sendMessage(roomId, `${state?.text}\n有效期限到 ${date}`)]),

				provider.sendMessage(roomId, '輸入的資訊是否正確？', {
					reply_markup: JSON.stringify({
						keyboard: [['是', '否']],
						resize_keyboard: true,
						one_time_keyboard: true,
					}),
				}),
			]);
		} else {
			await provider.sendMessage(roomId, '格式錯誤，請重新輸入_(:_」∠)_');

			return provider.sendMessage(roomId, '請選擇日期', {
				reply_markup: JSON.stringify({
					keyboard: chunk(
						range(1, getDaysInMonth(new Date().getFullYear(), new Date().getMonth() + 1)).map((v) => `${v}`),
						6
					),
					resize_keyboard: true,
					one_time_keyboard: true,
				}),
			});
		}
	};
}

function createStatusConfirmationHandler({ provider, kv }: { provider: MessagingProvider; kv: KVNamespace }) {
	return async function onStatusConfirmation(message: any) {
		const roomId = message.chat.id;
		const state = await getChatRoomState(kv, { providerName: provider.name, roomId });

		const isPositive = message.text === '是' || message.text?.toLowerCase() === 'yes' || message.text?.toLowerCase() === 'y';
		const isNegative = message.text === '否' || message.text?.toLowerCase() === 'no' || message.text?.toLowerCase() === 'n';

		if (isPositive) {
			const date = `${state?.y}${`${state?.m}`.padStart(2, '0')}${`${state?.d}`.padStart(2, '0')}`;

			await insertChatRoomItem(kv, {
				providerName: provider.name,
				roomId,
				item: {
					key: `date:${date}:${nanoid(8)}`,
					provider: 'telegram',
					roomId,
					text: state?.text,
					photo: state?.photo,
					dueAt: date,
				},
			});

			return Promise.all([
				setChatRoomState(kv, {
					providerName: provider.name,
					roomId,
					value: { status: Status.Init },
				}),
				provider.sendMessage(roomId, '已新增'),
			]);
		}

		if (isNegative) {
			return Promise.all([
				provider.sendMessage(roomId, '你買了什麼呢？\n請以圖片或文字的方式回答'),
				setChatRoomState(kv, {
					providerName: provider.name,
					roomId,
					value: { status: Status.What },
				}),
			]);
		}

		return provider.sendMessage(roomId, '輸入的資訊是否正確？', {
			reply_markup: JSON.stringify({
				keyboard: [['是', '否']],
				resize_keyboard: true,
				one_time_keyboard: true,
			}),
		});
	};
}

export function createStatusFinishHandler({ provider, kv }: { provider: MessagingProvider; kv: KVNamespace }) {
	return async function onStatusFinish(message: any) {
		const roomId = message.chat.id;
		const chatRoomItems = await listChatRoomItems(kv, { providerName: provider.name, roomId });

		const itemShouldDelete = chatRoomItems.find((item) => item.text === message.text);

		if (itemShouldDelete) {
			await kv.delete(itemShouldDelete.key);
			await kv.put(`telegram:${roomId}:items`, JSON.stringify(chatRoomItems.filter((item) => item.key !== itemShouldDelete.key)));
		}

		return provider.sendMessage(roomId, '已刪除一筆紀錄');
	};
}

function createDefaultHandler() {
	const policeman223 = new Policeman223();

	return async function onDefault(message: any) {
		if (message.text.includes('223')) {
			return policeman223.takeSelfie();
		}

		return policeman223.replyToMessage(message.text || '', { replyAnyways: true });
	};
}
