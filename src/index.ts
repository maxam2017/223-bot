import { TelegramBot } from './telegram';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Telegram bot
		if (url.pathname.startsWith('/telegram/')) {
			// Check secret token
			if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.TELEGRAM_BOT_SECRET) {
				return new Response('Unauthorized', { status: 403 });
			}

			const telegramBot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_BOT_SECRET, env.context);

			if (url.pathname === '/telegram/registerWebhook') {
				const webhookUrl = `${url.protocol}//${url.hostname}/telegram/webhook`;
				return new Response(await telegramBot.registerWebhook(webhookUrl));
			}

			if (url.pathname === '/telegram/unRegisterWebhook') {
				return new Response(await telegramBot.unRegisterWebhook());
			}

			if (url.pathname === '/telegram/webhook') {
				ctx.waitUntil(request.json().then((update) => telegramBot.onUpdate(update)));

				return new Response('Ok');
			}
		}

		return new Response('Not Found', { status: 404 });
	},
};
