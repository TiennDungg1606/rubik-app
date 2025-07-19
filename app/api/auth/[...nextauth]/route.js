import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "../../../../lib/mongodb";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      secret: process.env.NEXTAUTH_SECRET,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: "jwt" },
  callbacks: {
    async session({ session, token, user }) {
      session.userId = user?.id || token?.sub;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
