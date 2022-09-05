const buildAnnictQuery = (names: string[]) => `
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
    ${names.map((username) => `${username}: user(username: "${username}"){...userObject}`).join(" ")}
  }
`;

export const fetchFromAnnict = async (names: string[]): Promise<{
  animes: string[];
  users: { id: string; name: string }[];
  statuses: { userId: string; animeId: string }[];
}> => {
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
      works: { nodes: { malAnimeId: string }[] };
    }
  > = (await response.json()).data;

  return {
    users: Object.values(data).map(({ username }) => ({ id: `annict:${username}`, name: username })),
    animes: Object
      .values(data)
      .reduce(
        (p, c) => [
          ...p,
          ...c.works.nodes
            .filter(({ malAnimeId }) => !!malAnimeId)
            .map(({ malAnimeId }) => `mal:${malAnimeId}`),
        ],
        [] as string[],
      ),
    statuses: Object
      .values(data)
      .reduce(
        (p, c) => {
          return [
            ...p,
            ...c.works.nodes
              .filter(({ malAnimeId }) => !!malAnimeId)
              .map(({ malAnimeId }) => ({
                userId: `annict:${c.username}`,
                animeId: `mal:${malAnimeId}`,
              })),
          ];
        },
        [] as { userId: string; animeId: string }[],
      ),
  };
};
