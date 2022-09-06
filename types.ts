export type Status = { userId: string; animeId: string; status: "WATCHING" | "WATCHED" };
export type Anime = { id: string; title: string };
export type User = { id: string; name: string };

export type FetchResult = { animes: Anime[]; users: User[]; statuses: Status[] };
