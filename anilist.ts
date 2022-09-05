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
  ).join("")
}}`;

export const fetchFromAnilist = async (names: string[]): Promise<{
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
    "https://graphql.anilist.co",
    {
      method: "POST",
      body: JSON.stringify({
        query: buildAnilistQuery(names),
      }),
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  const data: Record<
    string,
    {
      user: { name: string; avatar: { large: string } };
      lists: [{ entries: { status: string; media: { idMal: number } }[] }];
    }
  > = (await response.json()).data;

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
