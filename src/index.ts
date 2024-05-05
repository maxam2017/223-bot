import { debugCommand, finishCommand, foodCommand, startCommand } from './command';
import { createMessageHandler } from './event-handler';
import { createScheduleHandler } from './schedule';
import { Telegram } from './telegram';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Telegram bot
		if (url.pathname.startsWith('/telegram/')) {
			// Check secret token
			if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.TELEGRAM_BOT_SECRET) {
				return new Response('Unauthorized', { status: 403 });
			}

			const telegram = new Telegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_BOT_SECRET, env.context);

			if (url.pathname === '/telegram/registerWebhook') {
				const webhookUrl = `${url.protocol}//${url.hostname}/telegram/webhook`;
				return new Response(await telegram.registerWebhook(webhookUrl));
			}

			if (url.pathname === '/telegram/unRegisterWebhook') {
				return new Response(await telegram.unRegisterWebhook());
			}

			if (url.pathname === '/telegram/webhook') {
				ctx.waitUntil(
					request.json().then((update: any) => {
						const message = update.message;
						if (!message) return;

						const messageHandler = createMessageHandler({ provider: telegram, kv: env.context });
						return messageHandler(message);
					})
				);

				return new Response('Ok');
			}
		}

		return new Response('Not Found', { status: 404 });
	},
	async scheduled(_event: Event, env: Env, _ctx: ExecutionContext) {
		const telegram = new Telegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_BOT_SECRET, env.context);
		await createScheduleHandler({ kv: env.context, provider: telegram })();
	},
};
