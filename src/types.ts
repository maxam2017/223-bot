export interface MessagingProvider {
	name: string;

	registerWebhook(url: string): Promise<string>;
	unRegisterWebhook(): Promise<string>;
	sendMessage(chatId: number | string, text: string, options?: Record<string, any>): Promise<boolean>;
	sendPhoto(chatId: number | string, photo: string, caption?: string): Promise<boolean>;
}

export enum Status {
	Init,
	What,
	WhenY,
	WhenM,
	WhenD,
	Confirmation,
	Finish,
}
