import { useRef, useCallback } from "react";

interface UseSwipeOptions {
	onSwipeLeft: () => void;
	onSwipeRight: () => void;
	threshold?: number;
}

export function useSwipe({
	onSwipeLeft,
	onSwipeRight,
	threshold = 50,
}: UseSwipeOptions) {
	const startRef = useRef<{ x: number; y: number } | null>(null);

	const onTouchStart = useCallback((e: React.TouchEvent) => {
		const touch = e.touches[0] as Touch | undefined;
		if (!touch) return;
		startRef.current = { x: touch.clientX, y: touch.clientY };
	}, []);

	const onTouchEnd = useCallback(
		(e: React.TouchEvent) => {
			if (!startRef.current) return;
			const touch = e.changedTouches[0] as Touch | undefined;
			if (!touch) return;
			const dx = touch.clientX - startRef.current.x;
			const dy = touch.clientY - startRef.current.y;
			startRef.current = null;

			if (Math.abs(dx) < threshold) return;
			if (Math.abs(dy) > Math.abs(dx)) return;

			if (dx < 0) onSwipeLeft();
			else onSwipeRight();
		},
		[onSwipeLeft, onSwipeRight, threshold],
	);

	return { onTouchStart, onTouchEnd };
}
