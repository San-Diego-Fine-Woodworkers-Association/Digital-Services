export interface Slot {
	id: string;
	roleId: string;
	date: string;
	startTime: Date;
	endTime: Date;
	numberOfVolunteers: number;
}

export interface Role {
	id: string;
	fairId: string;
	name: string;
	numberOfVolunteers: number;
	slots: Slot[];
}

export interface FairDetails {
	id: string;
	name: string;
	startDate: string;
	endDate: string;
}

export interface Registration {
	id: string;
	slotId: string;
	userId: string;
}
