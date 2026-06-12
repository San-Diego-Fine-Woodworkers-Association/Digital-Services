export type UserKind = "member" | "volunteer";

export type SessionUser = {
  id: string;
  email: string;
  kind: UserKind | null;
  memberId: string | null;
  membership: string | null;
  groups: string[];
};

export type Session = {
  user: SessionUser;
  expiresAt: string;
};

export type MemberDetail = {
  memberId: string;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  address: string | null;
  membership: string | null;
  memberSince: string | null;
  active: boolean;
};

export type VolunteerDetail = {
  userId: string;
  googleSub: string;
  email: string;
  name: string | null;
  groups: string[];
};

export type CurrentUser =
  | {
      kind: "member";
      id: string;
      email: string;
      name: string;
      memberId: string;
      member: MemberDetail | null;
    }
  | {
      kind: "volunteer";
      id: string;
      email: string;
      name: string;
      groups: string[];
      volunteer: VolunteerDetail | null;
    }
  | {
      kind: string | null;
      id: string;
      email: string;
      name: string;
    };
