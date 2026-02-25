export interface TimeSlot {
	id: string;
	shiftId: string;
	date: Date;
	startTime: Date;
	endTime: Date;
	numberOfVolunteers: number;
}

export interface Shift {
	id: string;
	fairId: number;
	name: string;
	dates: Date[];
	startTime: Date;
	endTime: Date;
	numberOfVolunteers: number;
	timeSlots: TimeSlot[];
}