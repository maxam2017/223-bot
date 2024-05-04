import { sample } from './utils';

export class Policeman223 {
	takeSelfie() {
		return sample(['https://i.imgur.com/QBmxN9Bl.jpg', 'https://i.imgur.com/dFfP4bel.jpg', 'https://i.imgur.com/oIwKtOQl.jpg']);
	}

	sayHi() {
		return '我是一個警察，我的名字叫何志武，編號223。';
	}

	replyToMessage(message: string, { replyAnyways = false }) {
		if (message.includes('鳳梨罐頭')) {
			return '就在5月1號的早晨，我開始明白一件事情，在阿 May 的心中，我和這個鳳梨罐頭沒有什麼分別。';
		}

		if (message.includes('鳳梨') || message.toLowerCase().includes('pineapple') || message.includes('🍍')) {
			return '鳳梨是阿 May 最愛吃的東西。';
		}

		if (message.includes('罐頭') || message.includes('🥫')) {
			return '我希望這罐罐頭不會過期。如果一定要加一個日子的話，我希望她是一萬年。';
		}

		if (message.includes('習慣')) {
			return '每一個人都有一個習慣，我的習慣呢？ 就是來這邊等阿may下班。';
		}

		if (message.includes('酒')) {
			return '聽説酒可以幫助消化。';
		}

		if (replyAnyways) {
			return sample([
				'我們最接近的時候，我跟她之間的距離只有0.01公分。',
				'每個人都有失戀的時候，而每一次我失戀，我都會去跑步，因為跑步可以將你身體裏的水分蒸發掉，而讓我不那麼容易流淚。',
				'我開始懷疑，在這個世界上，還有什麼東西是不會過期的？',
				'就在5月1號的早晨，我開始明白一件事情，在阿May的心中，我和這個鳳梨罐頭沒有什麼分別。',
				'那一天晚上，我吃掉所有的鳳梨，還好阿May 不喜歡吃榴蓮，要不然我一定是完蛋了。',
				'阿 May 很喜歡來這邊，因為這裏的老闆説她很像山口百惠，最近我和她分手了，因為她説我越來越不像三浦友和。',
				'不知道從什麼時候開始，在什麼東西上面都有個日期。',
				'終於在一家便利商店，讓我找到第30罐鳳梨罐頭。',
				'我們分手的那天是愚人節，所以我一直當她是開玩笑，我願意讓她這個玩笑維持一個月。',
				'已經六個月都沒有破過案，可是我今天抓到一個通緝犯。每一次我有好消息，我第一個想通知的就是我的女朋友阿 May。',
				'從分手的那一天開始，我每天買一罐5月1號到期的鳳梨罐頭，因為鳳梨是阿 May 最愛吃的東西，而5月1號是我的生日。我告訴我自己，當我買滿30罐的時候，她如果還不回來，這段感情就會過期。',
			]);
		}
	}
}
