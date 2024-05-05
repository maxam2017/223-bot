import dayjs from 'dayjs';
import { listChatRoomItems, listItemsByDate } from './kv';
import { MessagingProvider } from './types';

import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export function createScheduleHandler({ kv, provider }: { kv: KVNamespace; provider: MessagingProvider }) {
	return async function handleSchedule() {
		return Promise.all(
			[
				{
					distance: 0,
					text: '今天',
				},
				{
					distance: 1,
					text: '明天',
				},
				{
					distance: 2,
					text: '後天',
				},
			].map(async ({ distance, text }) => {
				const date = dayjs().tz('Asia/Taipei').add(distance, 'day').format('YYYYMMDD');
				const items = await listItemsByDate(kv, { date });

				for (const item of items) {
					if (item.provider === provider.name) {
						if (item.photo) {
							await provider.sendPhoto(item.roomId, item.photo, item.text ? `「${item.text}」${text}就要過期囉` : `${text}就要過期囉`);
						} else {
							await provider.sendMessage(item.roomId, item.text ? `「${item.text}」${text}就要過期囉` : `${text}就要過期囉`);
						}
					}
				}

				if (distance === 0) {
					// remove expired items
					for (const item of items) {
						await kv.delete(item.key);

						const chatRoomItems = await listChatRoomItems(kv, { providerName: item.provider, roomId: item.roomId });
						await kv.put(`${item.provider}:${item.roomId}:items`, JSON.stringify(chatRoomItems.filter((i) => i.key !== item.key)));
					}
				}
			})
		);
	};
}
