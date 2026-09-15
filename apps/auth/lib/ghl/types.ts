export type JunkCheckContact = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  createDate: string | null;
};

export type JunkCheckProgram = {
  title: string;
  status: string;
};

export type ProClassRegistrationInput = {
  programTitle: string;
  programTypeDescription: string;
};

export type GhlMemberInput = {
  registrations: ProClassRegistrationInput[];
  membershipTier: string | null;
  active: boolean;
  lastKnownMembershipTier: string | null;
  lastKnownMembershipTierFull: string | null;
  memberSince: string | null;
};

export type GhlTagPlan = {
  tagsToAdd: string[];
  tagsToRemove: string[];
  memberSinceField: string | null;
};
