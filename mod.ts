import { oakCors } from "cors/mod.ts";
import { Application, Router } from "oak/mod.ts";
import { fetchFromAnilist } from "./anilist.ts";
import { fetchFromAnnict } from "./annict.ts";

const app = new Application();
const router = new Router();

router.get("/graph", oakCors(), async ({ request, response }) => {
  const paramAnnict = request.url.searchParams.get("annict");
  const annictResult = await fetchFromAnnict(paramAnnict?.split(",") || []);

  const paramAnilist = request.url.searchParams.get("anilist");
  const anilistResult = await fetchFromAnilist(paramAnilist?.split(",") || []);

  response.body = {
    animes: Array.from(
      new Set([
        ...anilistResult.animes,
        ...annictResult.animes,
      ]),
    ).map((id) => ({ id })),
    users: [
      ...anilistResult.users,
      ...annictResult.users,
    ],
    statuses: [
      ...anilistResult.statuses,
      ...annictResult.statuses,
    ].filter((v, i, a) => a.findIndex((v2) => v.animeId === v2.animeId && v.userId === v2.userId) === i),
  };
});
app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 8080 });
