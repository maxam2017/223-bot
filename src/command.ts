import { getChatRoomState, listChatRoomItems, setChatRoomState } from './kv';
import { Policeman223 } from './policeman223';
import { MessagingProvider, Status } from './types';

export function startCommand({ provider, kv }: { provider: MessagingProvider; kv: KVNamespace }) {
	const policeman223 = new Policeman223();

	return (message: any) => {
		const roomId = message.chat.id;

		return Promise.all([
			// send message to chat room
			provider.sendMessage(roomId, policeman223.sayHi()),
			// set chat room status
			setChatRoomState(kv, {
				providerName: provider.name,
				roomId,
				value: { status: Status.Init },
			}),
		]);
	};
}

export function foodCommand({ provider, kv }: { provider: MessagingProvider; kv: KVNamespace }) {
	return async (message: any) => {
		const roomId = message.chat.id;

		return Promise.all([
			// send message to chat room
			provider.sendMessage(roomId, '你買了什麼呢？\n請以圖片或文字的方式回答'),
			// set chat room state
			setChatRoomState(kv, {
				providerName: provider.name,
				roomId,
				value: { status: Status.What },
			}),
		]);
	};
}

export function finishCommand({ provider, kv }: { provider: MessagingProvider; kv: KVNamespace }) {
	return async (message: any) => {
		const roomId = message.chat.id;
		const chatRoomItems = await listChatRoomItems(kv, { providerName: provider.name, roomId });

		if (chatRoomItems.length === 0) {
			return provider.sendMessage(roomId, '暫無紀錄，請使用 /food 新增');
		}

		return Promise.all([
			// send message to chat room
			provider.sendMessage(roomId, '請點選已經吃完的食物', {
				reply_markup: JSON.stringify({
					keyboard: chatRoomItems.map((item) => [{ text: item.text || '📷' }]),
					resize_keyboard: true,
					one_time_keyboard: true,
				}),
			}),
			// set chat room state
			setChatRoomState(kv, {
				providerName: provider.name,
				roomId,
				value: { status: Status.Finish },
			}),
		]);
	};
}

export function debugCommand({ provider, kv }: { provider: MessagingProvider; kv: KVNamespace }) {
	return async (message: any) => {
		const roomId = message.chat.id;
		const chatRoomItems = await listChatRoomItems(kv, { providerName: provider.name, roomId });

		return provider.sendMessage(roomId, JSON.stringify(chatRoomItems, null, 2));
	};
}
