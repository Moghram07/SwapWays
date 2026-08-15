import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin?: boolean;
      email?: string | null;
      name?: string | null;
      /** IATA code of the user's airline, used for flight-number prefixes. */
      airlineCode?: string;
    };
  }

  interface User {
    isAdmin?: boolean;
    airlineCode?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isAdmin?: boolean;
    airlineCode?: string;
  }
}
