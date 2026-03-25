import type { CrewCategory } from "./enums";

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  crewId: string;
  rankId: string;
  rank: { code: string; name: string; category: CrewCategory };
  baseId: string;
  base: { name: string; airportCode: string };
  phone: string | null;
  avatarUrl: string | null;
  hasUsVisa: boolean;
  hasChinaVisa: boolean;
  qualifications: { aircraftTypeId: string; aircraftType: { code: string; name: string } }[];
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  crewId: string;
  airlineId: string;
  rankId: string;
  baseId: string;
  phone?: string;
  isAdmin?: boolean;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  rankId?: string;
  baseId?: string;
  hasUsVisa?: boolean;
  hasChinaVisa?: boolean;
}

export interface UserWithRelations {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  crewId: string;
  rank: { code: string; name: string; category: CrewCategory };
  base: { airportCode: string; name: string };
  qualifications: { aircraftType: { code: string; name: string } }[];
}
