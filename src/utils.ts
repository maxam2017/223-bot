export function sample(list: any[]) {
	return list[Math.floor(Math.random() * list.length)];
}

export function last<T = any>(list: T[]): T {
	return list[list.length - 1];
}

export function chunk<T = any>(list: T[], size: number): T[][] {
	const result = [];
	for (let i = 0; i < list.length; i += size) {
		result.push(list.slice(i, i + size));
	}
	return result;
}

export function range(start: number, end: number) {
	return Array.from({ length: end - start + 1 }, (_, i) => i + start);
}

export function getDaysInMonth(year: number, month: number) {
	return new Date(year, month, 0).getDate();
}

export function safeParseJSON<T = any>(text: any): T | undefined {
	try {
		return JSON.parse(text);
	} catch {}
}
