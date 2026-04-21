import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@server/routers";
import { createFetchTrpcContext } from "@server/_core/context";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    router: appRouter,
    req,
    createContext: createFetchTrpcContext,
  });

export { handler as GET, handler as POST };
