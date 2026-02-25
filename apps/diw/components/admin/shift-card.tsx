import sortBy from "lodash-es/sortBy";
import { Card, CardContent, CardHeader, CardTitle } from "@sdfwa/ui/components/card";

import { Shift } from "@/lib/types/fair-registration";

export interface ShiftProps {
	/**
	 * Optional click handler for the shift card.
	 */
	onClick?: () => void;

	/**
	 * The shift data to display in the card.
	 */
	shift: Shift;
};

export function ShiftCard({ onClick, shift }: ShiftProps) {
	const formatDate = (date: Date | undefined): string => {
		if (!date) {
			return "N/A";
		}

		return date.toLocaleDateString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const getShiftDateString = (shift: Shift) => {
		if (shift.dates.length === 0) {
			return "No dates available";
		} else if (shift.dates.length === 1) {
			return formatDate(shift.dates[0]);
		} else {
			const earliestDate = sortBy(shift.dates)[0];
			const latestDate = sortBy(shift.dates)[shift.dates.length - 1];
			return `${formatDate(earliestDate)} - ${formatDate(latestDate)}`;
		}
	}

	return (
		<Card key={shift.id} className="bg-muted/50 aspect-square rounded-xl" onClick={onClick}>
			<CardHeader>
				<CardTitle>{shift.name}</CardTitle>
			</CardHeader>
			<CardContent>
				<p>{`Dates: ${getShiftDateString(shift)}`}</p>
			</CardContent>
		</Card>
	);
}