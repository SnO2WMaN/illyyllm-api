import { oakCors } from "cors/mod.ts";
import { Application, Router } from "oak/mod.ts";

const app = new Application();
const router = new Router();

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
  statuses: { userId: string; animeId: string }[];
} => {
  return {
    animes: Object
      .values(data)
      .reduce((p, c) => [
        ...p,
        ...c.works.nodes.filter(({ malAnimeId }) => !!malAnimeId).map(({ malAnimeId }) => `mal:${malAnimeId}`),
      ], [] as string[]),
    users: Object.values(data).map(({ username }) => ({ id: `annict:${username}`, name: username })),
    statuses: Object
      .values(data)
      .reduce((p, c) => {
        return [
          ...p,
          ...c.works.nodes.filter(({ malAnimeId }) => !!malAnimeId).map(({ malAnimeId }) => ({
            userId: `annict:${c.username}`,
            animeId: `mal:${malAnimeId}`,
          })),
        ];
      }, [] as { userId: string; animeId: string }[]),
  };
};

const buildAnilistQuery = (usernames: string[]) => `
  fragment mlc on MediaListCollection {
    user {
        name
        avatar {
            large
        }
    }
    lists {
        entries {
            status
            media {
                idMal
            }
        }
    }
  }

  query {
    ${
  usernames.map((username) =>
    `${username}: MediaListCollection(userName: "${username}", type: ANIME, status:COMPLETED){...mlc}`
  ).join(" ")
}
  }
`;
const canonicalAnilistRes = (
  data: Record<string, {
    user: {
      name: string;
      avatar: { large: string };
    };
    lists: [
      { entries: { status: string; media: { idMal: number } }[] },
    ];
  }>,
): {
  animes: string[];
  users: { id: string; name: string }[];
  statuses: { userId: string; animeId: string }[];
} => {
  return {
    animes: Object
      .values(data)
      .reduce((p, c) => [...p, ...c.lists[0].entries.map(({ media: { idMal } }) => `mal:${idMal}`)], [] as string[]),
    users: Object.values(data).map(({ user: { name } }) => ({ id: `anilist:${name}`, name: name })),
    statuses: Object
      .values(data)
      .reduce((p, c) => [
        ...p,
        ...c.lists[0].entries.map(({ media: { idMal } }) => ({
          userId: `anilist:${c.user.name}`,
          animeId: `mal:${idMal}`,
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
          "hikahikage_",
          "rokoucha",
        ]),
      }),
      headers: {
        "Authorization": `Bearer ${Deno.env.get("ANNICT_TOKEN")}`,
        "Content-Type": "application/json",
      },
    },
  );
  const ca = cannoicalAnnictRes((await annictResponse.json()).data);

  const anilistResponse = await fetch(
    "https://graphql.anilist.co",
    {
      method: "POST",
      body: JSON.stringify({
        query: buildAnilistQuery([
          "sno2wman",
          "bakarasu",
          "Vivy417",
        ]),
      }),
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  const cani = canonicalAnilistRes((await anilistResponse.json()).data);

  response.body = {
    animes: Array.from(new Set([...ca.animes, ...cani.animes])).map((id) => ({ id })),
    users: [...ca.users, ...cani.users],
    statuses: [...ca.statuses, ...cani.statuses]
      .filter((v, i, a) => a.findIndex((v2) => v.animeId === v2.animeId && v.userId === v2.userId) === i),
  };
});
app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 8080 });
