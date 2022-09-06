import { FetchResult, Status } from "./types.ts";

const buildAnnictQuery = (names: string[]) => `
  fragment userObject on User {
    username
    avatarUrl
    watched: works(state: WATCHED){
      nodes {
        ...work
      }
    }
    watching: works(state: WATCHING){
      nodes{
        ...work
      }
    }
  }

  fragment work on Work {
    malAnimeId
    title
    titleEn
  }

  query {
    ${names.map((username) => `${username}: user(username: "${username}"){...userObject}`).join(" ")}
  }
`;

export const fetchFromAnnict = async (names: string[]): Promise<FetchResult> => {
  if (names.length <= 0) {
    return {
      animes: [],
      users: [],
      statuses: [],
    };
  }

  const response = await fetch(
    "https://api.annict.com/graphql",
    {
      method: "POST",
      body: JSON.stringify({
        query: buildAnnictQuery(names),
      }),
      headers: {
        "Authorization": `Bearer ${Deno.env.get("ANNICT_TOKEN")}`,
        "Content-Type": "application/json",
      },
    },
  );
  const data: Record<
    string,
    {
      username: string;
      avatarUrl: string;
      watching: { nodes: { malAnimeId: string; titleEn: string; title: string }[] };
      watched: { nodes: { malAnimeId: string; titleEn: string; title: string }[] };
    }
  > = (await response.json()).data;

  return {
    users: Object.values(data).map(({ username }) => ({ id: `annict:${username}`, name: username })),
    animes: Object
      .values(data)
      .reduce(
        (p, c) => [
          ...p,
          ...c.watching.nodes
            .filter(({ malAnimeId }) => !!malAnimeId)
            .map(({ malAnimeId, titleEn, title }) => ({ id: `mal:${malAnimeId}`, title: title || titleEn })),
          ...c.watched.nodes
            .filter(({ malAnimeId }) => !!malAnimeId)
            .map(({ malAnimeId, titleEn, title }) => ({ id: `mal:${malAnimeId}`, title: title || titleEn })),
        ],
        [] as { id: string; title: string }[],
      ),
    statuses: Object
      .values(data)
      .reduce(
        (p, c) => {
          return [
            ...p,
            ...c.watching.nodes
              .filter(({ malAnimeId }) => !!malAnimeId)
              .map(({ malAnimeId }) => ({
                userId: `annict:${c.username}`,
                animeId: `mal:${malAnimeId}`,
                status: "WATCHING" as const,
              })),
            ...c.watched.nodes
              .filter(({ malAnimeId }) => !!malAnimeId)
              .map(({ malAnimeId }) => ({
                userId: `annict:${c.username}`,
                animeId: `mal:${malAnimeId}`,
                status: "WATCHED" as const,
              })),
          ];
        },
        [] as Status[],
      ),
  };
};
