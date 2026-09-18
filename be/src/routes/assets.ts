import { fileURLToPath } from "node:url";

import fastifyStatic from "@fastify/static";
import type { FastifyPluginCallback } from "fastify";

/** Sample fixture image/audio, served over HTTP so the Player (preview) and the SSR renderer
 * fetch the exact same bytes (video.md). Real per-project assets replace this fixed fixture
 * folder once the pipeline (task 003) and real providers (task 004/005) exist. */
const SAMPLES_DIR = fileURLToPath(new URL("../render/fixtures", import.meta.url));

const assetsRoutes: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.register(fastifyStatic, {
    root: SAMPLES_DIR,
    prefix: "/api/samples/",
    decorateReply: false,
    // The Remotion renderer's headless Chrome fetches these assets from its own bundle origin
    // (http://localhost:3000), a different origin than this server, so a plain same-origin
    // response is blocked by the browser's CORS check unless this header is present. This tool
    // is localhost-only (tech-stack.md), so a permissive origin carries no real exposure.
    setHeaders: (reply) => {
      reply.header("Access-Control-Allow-Origin", "*");
    },
  });

  done();
};

export default assetsRoutes;
