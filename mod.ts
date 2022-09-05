import { oakCors } from "cors/mod.ts";
import { Application, Router } from "oak/mod.ts";
import { fetchFromAnilist } from "./anilist.ts";
import { fetchFromAnnict } from "./annict.ts";

const app = new Application();
const router = new Router();

const merge = (
  rs: {
    animes: { id: string; title: string }[];
    users: { id: string; name: string }[];
    statuses: { userId: string; animeId: string }[];
  }[],
): {
  animes: { id: string; title: string }[];
  users: { id: string; name: string }[];
  statuses: { userId: string; animeId: string }[];
} => {
  const statuses = rs
    .reduce((p, { statuses }) => [...p, ...statuses], [] as { userId: string; animeId: string }[])
    .filter((v, i, a) => a.findIndex((v2) => v.animeId === v2.animeId && v.userId === v2.userId) === i);
  const animes = rs
    .reduce((p, { animes }) => [...p, ...animes], [] as { id: string; title: string }[])
    .filter((v, i, a) => a.findIndex((v2) => v.id === v2.id) === i)
    .map(({ id, ...rest }) => ({
      ...rest,
      id,
      size: statuses.filter(({ animeId }) => animeId === id).length,
    }));
  const users = rs
    .reduce((p, { users }) => [...p, ...users], [] as { id: string; name: string }[])
    // .sort(({ id: a }, { id: b }) => parseInt(b) - parseInt(a))
    .map(({ id, ...rest }) => ({
      ...rest,
      id,
      size: statuses.filter(({ userId }) => userId === id).length,
    }));
  return ({
    animes: animes,
    users: users,
    statuses: statuses,
  });
};

router.get("/graph", oakCors(), async ({ request, response }) => {
  const paramAnilist = request.url.searchParams.get("anilist");
  const anilistResult = await fetchFromAnilist(paramAnilist?.split(",") || []);

  const paramAnnict = request.url.searchParams.get("annict");
  const annictResult = await fetchFromAnnict(paramAnnict?.split(",") || []);

  response.body = merge([anilistResult, annictResult]);
});
app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 8080 });
