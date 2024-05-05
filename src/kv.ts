import { Status } from './types';
import { safeParseJSON } from './utils';

interface ChatRoomState {
	status: Status;
	y?: number;
	m?: number;
	d?: number;
	photo?: string;
	text?: string;
}

interface Item {
	key: string;
	provider: string;
	roomId: string;
	photo?: string;
	text?: string;
	dueAt: string;
}

export async function setChatRoomState(
	kv: KVNamespace,
	{
		providerName,
		roomId,
		value,
	}: {
		providerName: string;
		roomId: string;
		value: ChatRoomState | ((prev: ChatRoomState) => ChatRoomState);
	}
) {
	const key = `${providerName}:${roomId}:status`;

	if (typeof value === 'function') {
		const prev = await getChatRoomState(kv, { providerName, roomId });

		return kv.put(key, JSON.stringify(value(prev || { status: Status.Init })));
	}

	return kv.put(key, JSON.stringify(value));
}

export async function getChatRoomState(kv: KVNamespace, { providerName, roomId }: { providerName: string; roomId: string }) {
	const key = `${providerName}:${roomId}:status`;
	const statusText = await kv.get(key);

	return safeParseJSON(statusText) as ChatRoomState | undefined;
}

export async function listChatRoomItems(
	kv: KVNamespace,
	{
		providerName,
		roomId,
	}: {
		providerName: string;
		roomId: string;
	}
) {
	const key = `${providerName}:${roomId}:items`;
	const items = safeParseJSON(await kv.get(key)) || [];
	return (
		await Promise.all<Item[]>(
			items.map(async (key: string) => {
				return {
					key,
					...safeParseJSON(await kv.get(key)),
				};
			})
		)
	).filter(Boolean);
}

export async function insertChatRoomItem(
	kv: KVNamespace,
	{
		providerName,
		roomId,
		item,
	}: {
		providerName: string;
		roomId: string;
		item: Item;
	}
) {
	const items = safeParseJSON(await kv.get(`${providerName}:${roomId}:items`)) || [];

	const { key, ...rest } = item;
	return Promise.all([kv.put(`date:${item.dueAt}:${key}`, JSON.stringify(rest)), kv.put(key, JSON.stringify([...items, key]))]);
}
