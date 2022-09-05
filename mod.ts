import { oakCors } from "cors/mod.ts";
import { Application, Router } from "oak/mod.ts";

const app = new Application();
const router = new Router();

export type LogicType = "prop";
export const isLogicType = (type: string): type is LogicType => ["prop"].includes(type);

const buildAnnictQuery = (usernames: string[]) => `
  fragment userObject on User {
    username
    avatarUrl
    works(state: WATCHED){
      nodes {
        ...workIds
      }
    }
  }

  fragment workIds on Work {
    malAnimeId
  }

  query {
    ${usernames.map((username) => `${username}: user(username: "${username}"){...userObject}`).join(" ")}
  }
`;

const cannoicalAnnictRes = (
  data: Record<string, { username: string; avatarUrl: string; works: { nodes: { malAnimeId: string }[] } }>,
): {
  animes: string[];
  users: { id: string; name: string }[];
  status: { userId: string; animeId: string }[];
} => {
  return {
    animes: Object
      .values(data)
      .reduce(
        (p, c) => [
          ...p,
          ...c.works.nodes.filter(({ malAnimeId }) => !!malAnimeId).map(({ malAnimeId }) => `mal:${malAnimeId}`),
        ],
        [] as string[],
      ),
    users: Object.values(data).map(({ username }) => ({ id: `annict:${username}`, name: username })),
    status: Object
      .values(data)
      .reduce((p, c) => [
        ...p,
        ...c.works.nodes.filter(({ malAnimeId }) => !!malAnimeId).map(({ malAnimeId }) => ({
          userId: `annict:${c.username}`,
          animeId: `mal:${malAnimeId}`,
        })),
      ], [] as { userId: string; animeId: string }[]),
  };
};

router.get("/graph", oakCors(), async ({ request, response }) => {
  const annictResponse = await fetch(
    "https://api.annict.com/graphql",
    {
      method: "POST",
      body: JSON.stringify({
        query: buildAnnictQuery([
          "rinsuki",
          "tosuke",
          "kokoro",
          "otofune",
        ]),
      }),
      headers: {
        "Authorization": `Bearer ${Deno.env.get("ANNICT_TOKEN")}`,
        "Content-Type": "application/json",
      },
    },
  );
  const ca = cannoicalAnnictRes((await annictResponse.json()).data);

  response.body = {
    animes: Array.from(new Set(ca.animes)).map((id) => ({ id })),
    users: ca.users,
    status: ca.status,
  };
});
app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 8080 });
