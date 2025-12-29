export function isChristmas2025Event(now: number) {
	return now >= Date.UTC(2025, 11, 1, 11, 15) && now < Date.UTC(2026, 0, 5);
}
