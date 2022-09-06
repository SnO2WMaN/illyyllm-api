import { Anime, FetchResult, Status } from "./types.ts";

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
                  title {
                    native
                    english
                  }
              }
          }
      }
    }
    query {
      ${
  usernames.map((username) =>
    `${username}: MediaListCollection(userName: "${username}", type: ANIME, status_in:[COMPLETED,CURRENT]){...mlc}`
  ).join("")
}}`;

export const fetchFromAnilist = async (names: string[]): Promise<FetchResult> => {
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
      lists: { entries: { status: string; media: { idMal: number; title: { native: string; english: string } } }[] }[];
    }
  > = (await response.json()).data;

  return {
    animes: Object
      .values(data)
      .reduce(
        (p, c) => [
          ...p,
          ...c.lists.reduce(
            (p, { entries }) => [
              ...p,
              ...entries.map(({ media: { idMal, title: { native, english } } }) => ({
                id: `mal:${idMal}`,
                title: native || english,
              })),
            ],
            [] as Anime[],
          ),
        ],
        [] as Anime[],
      ),
    users: Object.values(data).map(({ user: { name } }) => ({ id: `anilist:${name}`, name: name })),
    statuses: Object
      .values(data)
      .reduce(
        (p, c) => [
          ...p,
          ...c.lists.reduce(
            (p, { entries }) => [
              ...p,
              ...entries.map(({ status, media: { idMal } }) => ({
                userId: `anilist:${c.user.name}`,
                animeId: `mal:${idMal}`,
                status: status === "CURRENT" ? "WATCHING" as const : "WATCHED" as const,
              })),
            ],
            [] as Status[],
          ),
        ],
        [] as Status[],
      ),
  };
};
